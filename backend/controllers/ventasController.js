// controllers/ventasController.js
const pool = require('../config/database');
const { verificarStockBajo } = require("../utils/stockAlerts");
const { registrarMovimientoKardex } = require("../utils/kardex");

// ==============================
// Obtener TODAS las ventas
// ==============================
const getAllVentas = async (req, res) => {
    try {
        const sql = `
            SELECT 
                v.*,
                c.nombre AS cliente_nombre,
                c.email AS cliente_email,
                p.total AS pedido_total
            FROM ventas v
            JOIN clientes c ON v.id_cliente = c.id
            LEFT JOIN pedidos p ON v.id_pedido = p.id
            ORDER BY v.fecha_venta DESC
        `;

        const [rows] = await pool.query(sql);
        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener ventas:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ==============================
// Obtener venta por ID
// ==============================
const getVentaById = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                v.*,
                c.nombre AS cliente_nombre,
                c.email AS cliente_email,
                p.total AS pedido_total
            FROM ventas v
            JOIN clientes c ON v.id_cliente = c.id
            LEFT JOIN pedidos p ON v.id_pedido = p.id
            WHERE v.id = ?
        `;

        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0)
            return res.status(404).json({ success: false, message: "Venta no encontrada" });

        res.json({ success: true, data: rows[0] });

    } catch (error) {
        console.error("Error al obtener venta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ==============================
// Función auxiliar: precio con oferta
// ==============================
async function obtenerPrecioConOferta(connection, id_catalogo) {
    const [rows] = await connection.query(
        `
        SELECT 
            c.precio_venta,
            o.descuento_porcentaje,
            CASE 
                WHEN o.id IS NOT NULL THEN 
                    c.precio_venta * (1 - o.descuento_porcentaje / 100)
                ELSE 
                    c.precio_venta
            END AS precio_final
        FROM catalogo c
        LEFT JOIN ofertas o 
            ON o.id_catalogo = c.id
           AND o.activa = 1
           AND NOW() BETWEEN o.fecha_inicio AND o.fecha_fin
        WHERE c.id = ?
        LIMIT 1
        `,
        [id_catalogo]
    );

    if (!rows.length) {
        throw new Error(`No se encontró el item de catálogo con id ${id_catalogo}`);
    }

    return {
        precioBase: Number(rows[0].precio_venta),
        precioFinal: Number(rows[0].precio_final)
    };
}

// ==============================
// Crear venta (NUEVO flujo con items + ofertas)
// ==============================
const createVenta = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            id_pedido,
            id_cliente,
            metodo_pago,
            comprobante_url,
            notas_internas,
            items
        } = req.body;

        if (!id_cliente || !metodo_pago) {
            return res.status(400).json({
                success: false,
                message: "Cliente y método de pago son obligatorios"
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "La venta debe tener al menos un producto"
            });
        }

        await connection.beginTransaction();

        // calcular total con precios desde catalogo+ofertas
        let total = 0;
        const itemsConPrecio = [];

        for (const item of items) {
            const { id_producto, id_catalogo, cantidad } = item;

            if (!id_producto || !id_catalogo || !cantidad) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Cada item debe tener id_producto, id_catalogo y cantidad"
                });
            }

            const { precioFinal } = await obtenerPrecioConOferta(connection, id_catalogo);
            const subtotal = precioFinal * cantidad;

            itemsConPrecio.push({
                id_producto,
                id_catalogo,
                cantidad,
                precio_unitario: precioFinal,
                subtotal
            });

            total += subtotal;
        }

        // insertar venta
        const [ventaRes] = await connection.query(
            `
            INSERT INTO ventas 
                (id_pedido, id_cliente, total, metodo_pago, comprobante_url, notas_internas, estado, fecha_venta)
            VALUES (?, ?, ?, ?, ?, ?, 'Pagado', NOW())
            `,
            [
                id_pedido || null,
                id_cliente,
                total,
                metodo_pago,
                comprobante_url || null,
                notas_internas || null
            ]
        );

        const idVenta = ventaRes.insertId;

        // insertar detalles + actualizar stock + kardex + alertas
        for (const item of itemsConPrecio) {
            const { id_producto, id_catalogo, cantidad, precio_unitario } = item;

            await connection.query(
                `
                INSERT INTO detalle_ventas 
                    (id_venta, id_producto, id_catalogo, cantidad, precio_unitario)
                VALUES (?, ?, ?, ?, ?)
                `,
                [idVenta, id_producto, id_catalogo, cantidad, precio_unitario]
            );

            await connection.query(
                `
                UPDATE productos
                SET cantidad_disponible = cantidad_disponible - ?
                WHERE id = ?
                `,
                [cantidad, id_producto]
            );

            await registrarMovimientoKardex({
                id_producto,
                tipo_movimiento: "salida",
                cantidad,
                detalle: `Venta #${idVenta}`,
                tipo_referencia: "venta",
                id_referencia: idVenta,
                id_usuario: req.user?.id || 1
            });

            await verificarStockBajo(id_producto);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Venta registrada correctamente",
            data: { id: idVenta }
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error al crear venta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

// ==============================
// Actualizar venta (solo cabecera)
// ==============================
const updateVenta = async (req, res) => {
    const { id } = req.params;

    const {
        id_pedido,
        id_cliente,
        total,
        metodo_pago,
        comprobante_url,
        estado,
        notas_internas
    } = req.body;

    try {
        const sql = `
            UPDATE ventas
            SET 
                id_pedido = ?, 
                id_cliente = ?, 
                total = ?, 
                metodo_pago = ?, 
                comprobante_url = ?, 
                estado = ?, 
                notas_internas = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            id_pedido || null,
            id_cliente,
            Number(total) || 0,
            metodo_pago,
            comprobante_url || null,
            estado || "Pendiente",
            notas_internas || null,
            id
        ]);

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Venta no encontrada" });

        res.json({ success: true, message: "Venta actualizada correctamente" });

    } catch (error) {
        console.error("Error al actualizar venta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ==============================
// Eliminar venta
// ==============================
const deleteVenta = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            "DELETE FROM ventas WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Venta no encontrada" });

        res.json({ success: true, message: "Venta eliminada correctamente" });

    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).json({
                success: false,
                message: "No se puede eliminar la venta porque tiene detalles registrados"
            });
        }

        console.error("Error al eliminar venta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllVentas,
    getVentaById,
    createVenta,
    updateVenta,
    deleteVenta
};
