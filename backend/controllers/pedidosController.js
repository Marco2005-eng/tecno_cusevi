/**************************************************************
 * PEDIDOS CONTROLLER — FINAL CLOUDINARY VERSION
 **************************************************************/

const pool = require('../config/database');
const { crearAlerta } = require("../utils/alertas");
const { registrarMovimientoKardex } = require("../utils/kardex");
const { verificarStockBajo } = require("../utils/stockAlerts");

/* ============================================================
   Helper seguro para URLs (No tocar Cloudinary URLs)
============================================================ */
function fixUrl(url) {
    if (!url) return null;
    if (url.startsWith("http")) return url;  // <-- Cloudinary URL
    return `${global.BASE_URL}${url}`;
}

/* ============================================================
   Obtener todos los pedidos (Admin)
============================================================ */
const getAllPedidos = async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.*, 
                c.nombre AS cliente_nombre,
                c.email AS cliente_email
            FROM pedidos p
            JOIN clientes c ON p.id_cliente = c.id
            ORDER BY p.fecha_pedido DESC`;

        const [rows] = await pool.query(sql);

        rows.forEach(r => {
            r.comprobante_url = fixUrl(r.comprobante_url);
        });

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Pedidos:", error);
        res.status(500).json({ success: false, message: "Error al obtener pedidos" });
    }
};

/* ============================================================
   Obtener pedidos por cliente
============================================================ */
const getPedidosByCliente = async (req, res) => {
    const { id_cliente } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT * FROM pedidos WHERE id_cliente=? ORDER BY fecha_pedido DESC`,
            [id_cliente]
        );

        rows.forEach(r => r.comprobante_url = fixUrl(r.comprobante_url));

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Pedidos cliente:", error);
        res.status(500).json({ success: false, message: "Error al obtener pedidos del cliente" });
    }
};

/* ============================================================
   Obtener estado actual
============================================================ */
const getEstadoActual = async (req, res) => {
    const { id } = req.params;

    try {
        const [[row]] = await pool.query(`
            SELECT estado, mensaje, fecha
            FROM seguimiento_pedidos
            WHERE id_pedido = ?
            ORDER BY fecha DESC
            LIMIT 1
        `, [id]);

        res.json({
            success: true,
            data: row || { estado: "pendiente", mensaje: null }
        });

    } catch (error) {
        console.error("Estado actual:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ============================================================
   Obtener un pedido con detalles
============================================================ */
const getPedidoById = async (req, res) => {
    const { id } = req.params;

    try {
        const [[pedido]] = await pool.query(`
            SELECT 
                p.*,
                c.nombre AS cliente_nombre,
                c.email AS cliente_email
            FROM pedidos p
            JOIN clientes c ON p.id_cliente = c.id
            WHERE p.id = ?`,
            [id]
        );

        if (!pedido)
            return res.status(404).json({ success: false, message: "Pedido no encontrado" });

        pedido.comprobante_url = fixUrl(pedido.comprobante_url);

        const [detalles] = await pool.query(`
            SELECT 
                d.*,
                cat.nombre_venta AS producto,
                cat.imagen_url,
                cat.id_producto
            FROM detalle_pedidos d
            JOIN catalogo cat ON d.id_catalogo = cat.id
            WHERE d.id_pedido = ?`,
            [id]
        );

        detalles.forEach(d => d.imagen_url = fixUrl(d.imagen_url));

        const [[estadoActual]] = await pool.query(
            `SELECT estado, mensaje, fecha
             FROM seguimiento_pedidos
             WHERE id_pedido=? 
             ORDER BY fecha DESC LIMIT 1`,
            [id]
        );

        res.json({
            success: true,
            pedido,
            detalles,
            seguimiento_actual: estadoActual || { estado: "pendiente", mensaje: null }
        });

    } catch (error) {
        console.error("Pedido:", error);
        res.status(500).json({ success: false, message: "Error obteniendo pedido" });
    }
};

/* ============================================================
   Crear pedido (simulado)
============================================================ */
const createPedidoSimulado = async (req, res) => {
    const { id_cliente, metodo_pago, total, productos } = req.body;

    if (!id_cliente || !total || !productos?.length) {
        return res.status(400).json({
            success: false,
            message: "Datos incompletos (cliente, total o productos)"
        });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const mp = metodo_pago || "sin_pago";

        // 1️⃣ Crear pedido principal
        const [pedidoRes] = await conn.query(
            `INSERT INTO pedidos (id_cliente, total, metodo_pago, estado)
             VALUES (?, ?, ?, 'pendiente')`,
            [id_cliente, total, mp]
        );

        const id_pedido = pedidoRes.insertId;

        // 2️⃣ Registrar los productos
        for (const item of productos) {
            const [[cat]] = await conn.query(`
                SELECT 
                    c.precio_venta,
                    o.descuento_porcentaje,
                    o.activa AS oferta_activa
                FROM catalogo c
                LEFT JOIN ofertas o 
                    ON o.id_catalogo = c.id
                    AND o.activa = 1
                    AND NOW() BETWEEN o.fecha_inicio AND o.fecha_fin
                WHERE c.id = ?`,
                [item.id_producto]
            );

            if (!cat) {
                throw new Error("Producto no encontrado en catálogo");
            }

            // Aplicar oferta si corresponde
            let precio = Number(cat.precio_venta);
            if (cat.oferta_activa) {
                precio -= precio * (cat.descuento_porcentaje / 100);
            }

            const subtotal = precio * item.cantidad;

            await conn.query(
                `INSERT INTO detalle_pedidos 
                 (id_pedido, id_catalogo, cantidad, precio_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [id_pedido, item.id_producto, item.cantidad, precio, subtotal]
            );
        }

        // 3️⃣ Crear alerta para el admin
        await crearAlerta(
            "pedido",
            `Nuevo pedido #${id_pedido}`,
            `Cliente #${id_cliente} realizó un pedido.`,
            id_pedido
        );

        await conn.commit();

        return res.json({
            success: true,
            message: "Pedido registrado correctamente",
            data: { id_pedido }
        });

    } catch (error) {
        await conn.rollback();
        console.error("Error al crear pedido simulado:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno creando el pedido"
        });

    } finally {
        conn.release();
    }
};

/* ============================================================
   Cliente sube comprobante con Cloudinary
============================================================ */
const clienteConfirmaPago = async (req, res) => {
    const { id } = req.params;
    const metodo_pago = req.body.metodo_pago;
    const notas = req.body.notas || null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Debe adjuntar un comprobante de pago"
            });
        }

        // Cloudinary URL ✔
        const urlCloudinary = req.file.path;

        const [[pedido]] = await pool.query(
            "SELECT * FROM pedidos WHERE id=?",
            [id]
        );

        if (!pedido)
            return res.status(404).json({ success: false, message: "Pedido no encontrado" });

        await pool.query(
            `UPDATE pedidos 
             SET metodo_pago=?, comprobante_url=?, notas=?, estado='procesando'
             WHERE id=?`,
            [metodo_pago, urlCloudinary, notas, id]
        );

        await crearAlerta(
            "pedido",
            `Pago enviado para pedido #${id}`,
            `El cliente adjuntó comprobante.`,
            id
        );

        res.json({
            success: true,
            message: "Comprobante enviado correctamente",
            comprobante_url: urlCloudinary
        });

    } catch (error) {
        console.error("Confirmar pago cliente (Cloudinary):", error);
        res.status(500).json({
            success: false,
            message: "Error interno"
        });
    }
};

/* ============================================================
   Admin confirma pago → genera venta + actualiza stock
============================================================ */
const adminConfirmaPago = async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1️⃣ Obtener el pedido
        const [[pedido]] = await conn.query("SELECT * FROM pedidos WHERE id=?", [id]);

        if (!pedido) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: "Pedido no existe" });
        }

        if (pedido.estado === "confirmado") {
            await conn.rollback();
            return res.json({ success: false, message: "El pedido ya está confirmado" });
        }

        // 2️⃣ Crear venta
        const [ventaRes] = await conn.query(
            `INSERT INTO ventas 
             (id_pedido, id_cliente, total, metodo_pago, comprobante_url, estado)
             VALUES (?, ?, ?, ?, ?, 'Pagado')`,
            [
                pedido.id,
                pedido.id_cliente,
                pedido.total,
                pedido.metodo_pago,
                pedido.comprobante_url
            ]
        );

        const id_venta = ventaRes.insertId;

        // 3️⃣ Obtener detalles del pedido
        const [detalles] = await conn.query(
            "SELECT * FROM detalle_pedidos WHERE id_pedido=?",
            [id]
        );

        // 4️⃣ Actualizar stock producto por producto
        for (const d of detalles) {
            const [[cat]] = await conn.query(
                "SELECT id_producto FROM catalogo WHERE id=?",
                [d.id_catalogo]
            );

            const id_prod = cat.id_producto;

            const [[prod]] = await conn.query(
                "SELECT cantidad_disponible FROM productos WHERE id=?",
                [id_prod]
            );

            const nuevo_stock = prod.cantidad_disponible - d.cantidad;

            if (nuevo_stock < 0) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Stock insuficiente para el producto ID ${id_prod}`
                });
            }

            // Registrar detalle de venta
            await conn.query(`
                INSERT INTO detalle_ventas
                (id_venta, id_producto, id_catalogo, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                id_venta,
                id_prod,
                d.id_catalogo,
                d.cantidad,
                d.precio_unitario,
                d.subtotal
            ]);

            // Actualizar stock
            await conn.query(
                "UPDATE productos SET cantidad_disponible=? WHERE id=?",
                [nuevo_stock, id_prod]
            );

            // Registrar movimiento en Kardex
            await registrarMovimientoKardex({
                id_producto: id_prod,
                tipo_movimiento: "salida",
                cantidad: d.cantidad,
                stock_resultante: nuevo_stock,
                detalle: `Venta generada desde Pedido #${id}`,
                tipo_referencia: "venta",
                id_referencia: id_venta,
                id_usuario: req.usuario?.id || 1,
                conn
            });

            // Validar stock bajo y generar alerta
            await verificarStockBajo(id_prod, conn);
        }

        // 5️⃣ Marcar pedido como confirmado
        await conn.query(
            "UPDATE pedidos SET estado='confirmado' WHERE id=?",
            [id]
        );

        // 6️⃣ Crear alerta para el admin
        await crearAlerta(
            "pedido",
            `Pedido #${id} confirmado`,
            `Venta #${id_venta} generada correctamente.`,
            id_venta
        );

        await conn.commit();

        res.json({
            success: true,
            message: "Pedido confirmado y venta generada",
            id_venta
        });

    } catch (error) {
        await conn.rollback();
        console.error("Admin confirma:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    } finally {
        conn.release();
    }
};

/* ============================================================
   Seguimiento / Historial / Cancelar
============================================================ */
const cancelarPedido = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            `UPDATE pedidos SET estado='cancelado' WHERE id=?`,
            [id]
        );

        await crearAlerta(
            "pedido",
            `Pedido #${id} cancelado`,
            `El administrador ha cancelado este pedido.`,
            id
        );

        res.json({ success: true, message: "Pedido cancelado" });

    } catch (error) {
        console.error("Cancelar pedido:", error);
        res.status(500).json({ success: false, message: "Error cancelando pedido" });
    }
};
const crearSeguimiento = async (req, res) => {
    const { id } = req.params;
    const { estado, mensaje, nota_admin } = req.body;

    try {
        await pool.query(`
            INSERT INTO seguimiento_pedidos (id_pedido, estado, mensaje, nota_admin)
            VALUES (?, ?, ?, ?)
        `, [id, estado, mensaje || null, nota_admin || null]);

        await pool.query(`
            UPDATE pedidos SET estado=? WHERE id=?
        `, [estado, id]);

        res.json({ success: true, message: "Seguimiento guardado" });

    } catch (err) {
        console.error("ERROR seguimiento:", err);
        res.status(500).json({ success: false, message: "Error guardando seguimiento" });
    }
};
const getHistorial = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM seguimiento_pedidos
            WHERE id_pedido = ?
            ORDER BY fecha DESC
        `, [id]);

        res.json({ success: true, data: rows });

    } catch (err) {
        console.error("ERROR historial:", err);
        res.status(500).json({ success: false, message: "Error obteniendo historial" });
    }
};

// Sin cambios, funcionan correctamente.

module.exports = {
    getAllPedidos,
    getPedidoById,
    getPedidosByCliente,
    createPedidoSimulado,
    clienteConfirmaPago,
    adminConfirmaPago,
    cancelarPedido,
    crearSeguimiento,
    getHistorial,
    getEstadoActual
};
