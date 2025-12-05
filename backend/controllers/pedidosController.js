/**************************************************************
 * PEDIDOS CONTROLLER — VERSION FINAL CORREGIDA & OPTIMIZADA
 **************************************************************/

const pool = require('../config/database');
const { crearAlerta } = require("../utils/alertas");
const { registrarMovimientoKardex } = require("../utils/kardex");
const { verificarStockBajo } = require("../utils/stockAlerts");

/* ============================================================
   Helper para URLs absolutas
============================================================ */
function buildUrl(path) {
    if (!path) return null;
    return `${global.BASE_URL}${path}`;
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
            r.comprobante_url = buildUrl(r.comprobante_url);
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

        rows.forEach(r => r.comprobante_url = buildUrl(r.comprobante_url));

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Pedidos cliente:", error);
        res.status(500).json({ success: false, message: "Error al obtener pedidos del cliente" });
    }
};
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

        pedido.comprobante_url = buildUrl(pedido.comprobante_url);

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

        detalles.forEach(d => d.imagen_url = buildUrl(d.imagen_url));

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

    if (!id_cliente || !total || !productos?.length)
        return res.status(400).json({ success: false, message: "Datos incompletos" });

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const mp = metodo_pago || "sin_pago";

        const [pedidoRes] = await conn.query(
            `INSERT INTO pedidos (id_cliente, total, metodo_pago, estado)
             VALUES (?, ?, ?, 'pendiente')`,
            [id_cliente, total, mp]
        );

        const id_pedido = pedidoRes.insertId;

        for (const item of productos) {
            const [[cat]] = await conn.query(`
                SELECT 
                    c.precio_venta,
                    o.descuento_porcentaje,
                    o.activa AS oferta_activa
                FROM catalogo c
                LEFT JOIN ofertas o 
                    ON o.id_catalogo = c.id AND o.activa = 1
                    AND NOW() BETWEEN o.fecha_inicio AND o.fecha_fin
                WHERE c.id = ?`,
                [item.id_producto]
            );

            if (!cat) throw new Error("Producto no encontrado");

            let precio = Number(cat.precio_venta);
            if (cat.oferta_activa)
                precio -= precio * cat.descuento_porcentaje / 100;

            const subtotal = precio * item.cantidad;

            await conn.query(`
                INSERT INTO detalle_pedidos 
                (id_pedido, id_catalogo, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)`,
                [id_pedido, item.id_producto, item.cantidad, precio, subtotal]
            );
        }

        await crearAlerta(
            "pedido",
            `Nuevo pedido #${id_pedido}`,
            `El cliente ${id_cliente} ha realizado un pedido.`,
            id_pedido
        );

        await conn.commit();

        res.json({
            success: true,
            message: "Pedido registrado correctamente",
            data: { id_pedido }
        });

    } catch (error) {
        await conn.rollback();
        console.error("Crear pedido:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    } finally {
        conn.release();
    }
};

/* ============================================================
   Cliente sube comprobante de pago
============================================================ */
const clienteConfirmaPago = async (req, res) => {
    const { id } = req.params;
    const metodo_pago = req.body.metodo_pago;
    const notas = req.body.notas || null;

    let relative_url = req.file ? "/uploads/comprobantes/" + req.file.filename : null;

    try {
        const [[pedido]] = await pool.query("SELECT * FROM pedidos WHERE id=?", [id]);

        if (!pedido)
            return res.status(404).json({ success: false, message: "Pedido no encontrado" });

        await pool.query(
            `UPDATE pedidos 
             SET metodo_pago=?, comprobante_url=?, notas=?, estado='procesando'
             WHERE id=?`,
            [metodo_pago, relative_url, notas, id]
        );

        await crearAlerta(
            "pedido",
            `Pago enviado para pedido #${id}`,
            `El cliente adjuntó comprobante.`,
            id
        );

        res.json({ success: true, message: "Pago enviado correctamente." });

    } catch (error) {
        console.error("Confirmar pago cliente:", error);
        res.status(500).json({ success: false, message: "Error interno" });
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

        const [[pedido]] = await conn.query("SELECT * FROM pedidos WHERE id=?", [id]);

        if (!pedido) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: "Pedido no existe" });
        }

        if (pedido.estado === "confirmado") {
            await conn.rollback();
            return res.json({ success: false, message: "El pedido ya está confirmado" });
        }

        const [ventaRes] = await conn.query(
            `INSERT INTO ventas 
             (id_pedido, id_cliente, total, metodo_pago, comprobante_url, estado)
             VALUES (?, ?, ?, ?, ?, 'Pagado')`,
            [pedido.id, pedido.id_cliente, pedido.total, pedido.metodo_pago, pedido.comprobante_url]
        );

        const id_venta = ventaRes.insertId;

        const [detalles] = await conn.query(
            "SELECT * FROM detalle_pedidos WHERE id_pedido=?",
            [id]
        );

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

            await conn.query(`
                INSERT INTO detalle_ventas
                (id_venta, id_producto, id_catalogo, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [id_venta, id_prod, d.id_catalogo, d.cantidad, d.precio_unitario, d.subtotal]);

            await conn.query(
                "UPDATE productos SET cantidad_disponible=? WHERE id=?",
                [nuevo_stock, id_prod]
            );

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

            await verificarStockBajo(id_prod, conn);
        }

        await conn.query(
            "UPDATE pedidos SET estado='confirmado' WHERE id=?",
            [id]
        );

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
   Crear un seguimiento de pedido (ADMIN)
============================================================ */
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

/* ============================================================
   Recuperar historial completo de un pedido
============================================================ */
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

/* ============================================================
   Cancelar pedido
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
