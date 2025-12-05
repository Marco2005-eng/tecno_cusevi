// controllers/ventasDetalleController.js
const pool = require("../config/database");
const { verificarStockBajo } = require("../utils/stockAlerts");
const { registrarMovimientoKardex } = require("../utils/kardex");

// ============================================================
// OBTENER DETALLES DE UNA VENTA
// ============================================================
const getDetallesByVenta = async (req, res) => {
    const { id_venta } = req.params;

    try {
        const sql = `
            SELECT 
                d.id,
                d.id_venta,
                d.id_producto,
                p.nombre AS nombre_producto,
                d.precio_unitario,
                d.cantidad,
                d.subtotal
            FROM detalle_ventas d
            INNER JOIN productos p ON p.id = d.id_producto
            WHERE d.id_venta = ?
        `;

        const [rows] = await pool.query(sql, [id_venta]);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error obteniendo detalles de venta:", error);
        res.status(500).json({ success: false, message: "Error al obtener detalles" });
    }
};

// ============================================================
// AGREGAR PRODUCTO A UNA VENTA
// ============================================================
const addDetalleVenta = async (req, res) => {
    const { id_venta, id_producto, cantidad, precio_unitario } = req.body;

    if (!id_venta || !id_producto || !cantidad || !precio_unitario) {
        return res.status(400).json({
            success: false,
            message: "Faltan datos necesarios"
        });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Obtener stock actual y nombre
        const [[prod]] = await conn.query(`
            SELECT nombre, cantidad_disponible
            FROM productos
            WHERE id = ?
        `, [id_producto]);

        if (!prod) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        if (prod.cantidad_disponible < cantidad) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Stock insuficiente. Disponible: ${prod.cantidad_disponible}`
            });
        }

        const subtotal = cantidad * precio_unitario;

        // Insertar detalle
        await conn.query(`
            INSERT INTO detalle_ventas
            (id_venta, id_producto, cantidad, precio_unitario, subtotal)
            VALUES (?, ?, ?, ?, ?)
        `, [
            id_venta,
            id_producto,
            cantidad,
            precio_unitario,
            subtotal
        ]);

        // Descontar stock
        const nuevo_stock = prod.cantidad_disponible - cantidad;

        await conn.query(`
            UPDATE productos
            SET cantidad_disponible = ?
            WHERE id = ?
        `, [nuevo_stock, id_producto]);

        // Actualizar total
        await conn.query(`
            UPDATE ventas
            SET total = total + ?
            WHERE id = ?
        `, [subtotal, id_venta]);

        // Kardex
        await registrarMovimientoKardex({
            id_producto,
            tipo_movimiento: "salida",
            cantidad,
            stock_resultante: nuevo_stock,
            detalle: `Detalle agregado a venta #${id_venta}`,
            tipo_referencia: "venta",
            id_referencia: id_venta,
            id_usuario: req.usuario?.id || 1,
            conn
        });

        // Alerta de stock bajo
        await verificarStockBajo(id_producto);

        await conn.commit();

        res.json({
            success: true,
            message: "Producto agregado correctamente"
        });

    } catch (error) {
        await conn.rollback();
        console.error("Error agregando detalle:", error);
        res.status(500).json({ success: false, message: "Error al agregar detalle" });
    } finally {
        conn.release();
    }
};

// ============================================================
// ELIMINAR DETALLE
// ============================================================
const deleteDetalleVenta = async (req, res) => {
    const { id_detalle } = req.params;

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [[detalle]] = await conn.query(`
            SELECT id_producto, cantidad, precio_unitario, id_venta
            FROM detalle_ventas
            WHERE id = ?
        `, [id_detalle]);

        if (!detalle) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: "Detalle no encontrado" });
        }

        const subtotal = detalle.cantidad * detalle.precio_unitario;

        // eliminar
        await conn.query(`
            DELETE FROM detalle_ventas
            WHERE id = ?
        `, [id_detalle]);

        // restaurar stock
        const [[prod]] = await conn.query(`
            SELECT cantidad_disponible
            FROM productos
            WHERE id = ?
        `, [detalle.id_producto]);

        const nuevo_stock = Number(prod.cantidad_disponible) + Number(detalle.cantidad);

        await conn.query(`
            UPDATE productos
            SET cantidad_disponible = ?
            WHERE id = ?
        `, [nuevo_stock, detalle.id_producto]);

        // actualizar total
        await conn.query(`
            UPDATE ventas
            SET total = total - ?
            WHERE id = ?
        `, [subtotal, detalle.id_venta]);

        // kardex
        await registrarMovimientoKardex({
            id_producto: detalle.id_producto,
            tipo_movimiento: "entrada",
            cantidad: detalle.cantidad,
            stock_resultante: nuevo_stock,
            detalle: `Detalle eliminado de venta #${detalle.id_venta}`,
            tipo_referencia: "venta",
            id_referencia: detalle.id_venta,
            id_usuario: req.usuario?.id || 1,
            conn
        });

        await conn.commit();

        res.json({
            success: true,
            message: "Detalle eliminado correctamente"
        });

    } catch (error) {
        await conn.rollback();
        console.error("Error eliminando detalle:", error);
        res.status(500).json({ success: false, message: "Error al eliminar detalle" });
    } finally {
        conn.release();
    }
};

module.exports = {
    getDetallesByVenta,
    addDetalleVenta,
    deleteDetalleVenta
};
