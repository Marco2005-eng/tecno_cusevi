// controllers/detalleVentasController.js
const pool = require('../config/database');

// Obtener todos los detalles de una venta
const getDetallesByVenta = async (req, res) => {
    const { id_venta } = req.params;

    try {
        const sql = `
            SELECT 
                dv.*,
                p.nombre AS producto_nombre,
                c.nombre_venta AS catalogo_nombre,
                c.imagen_url
            FROM detalle_ventas dv
            LEFT JOIN productos p ON dv.id_producto = p.id
            LEFT JOIN catalogo c ON dv.id_catalogo = c.id
            WHERE dv.id_venta = ?
        `;

        const [rows] = await pool.query(sql, [id_venta]);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener detalles:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Agregar un detalle de venta
const addDetalleVenta = async (req, res) => {
    const { id_venta, id_producto, id_catalogo, cantidad } = req.body;

    if (!id_venta || !cantidad || (!id_producto && !id_catalogo)) {
        return res.status(400).json({
            success: false,
            message: "Faltan datos obligatorios"
        });
    }

    try {
        let precio_unitario;
        let stock;
        let id_ref = id_producto || id_catalogo;

        // Obtener datos del producto o catálogo
        if (id_producto) {
            const [rows] = await pool.query(
                "SELECT precio_compra, cantidad_disponible FROM productos WHERE id = ?",
                [id_producto]
            );
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "Producto no encontrado" });
            }
            precio_unitario = rows[0].precio_compra;
            stock = rows[0].cantidad_disponible;
        } else {
            const [rows] = await pool.query(
                "SELECT precio_venta, stock_disponible FROM catalogo WHERE id = ?",
                [id_catalogo]
            );
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: "Ítem de catálogo no encontrado" });
            }
            precio_unitario = rows[0].precio_venta;
            stock = rows[0].stock_disponible;
        }

        if (stock < cantidad) {
            return res.status(400).json({
                success: false,
                message: "Stock insuficiente para completar la venta"
            });
        }

        // Registrar detalle
        const sqlInsert = `
            INSERT INTO detalle_ventas (id_venta, id_producto, id_catalogo, cantidad, precio_unitario)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [insertRes] = await pool.query(sqlInsert, [
            id_venta,
            id_producto || null,
            id_catalogo || null,
            cantidad,
            precio_unitario
        ]);

        // Descontar stock
        if (id_producto) {
            await pool.query(
                "UPDATE productos SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?",
                [cantidad, id_producto]
            );
        } else {
            await pool.query(
                "UPDATE catalogo SET stock_disponible = stock_disponible - ? WHERE id = ?",
                [cantidad, id_catalogo]
            );
        }

        res.status(201).json({
            success: true,
            message: "Detalle de venta agregado",
            data: { id: insertRes.insertId }
        });

    } catch (error) {
        console.error("Error al agregar detalle venta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Actualizar detalle
const updateDetalleVenta = async (req, res) => {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (!cantidad) {
        return res.status(400).json({ success: false, message: "Cantidad requerida" });
    }

    try {
        const [detalleRes] = await pool.query(
            "SELECT * FROM detalle_ventas WHERE id = ?",
            [id]
        );

        if (detalleRes.length === 0) {
            return res.status(404).json({ success: false, message: "Detalle no encontrado" });
        }

        const detalle = detalleRes[0];
        const diferencia = cantidad - detalle.cantidad;

        let stock;

        // Obtener stock actual
        if (detalle.id_producto) {
            const [rows] = await pool.query(
                "SELECT cantidad_disponible FROM productos WHERE id = ?",
                [detalle.id_producto]
            );
            stock = rows[0].cantidad_disponible;
        } else {
            const [rows] = await pool.query(
                "SELECT stock_disponible FROM catalogo WHERE id = ?",
                [detalle.id_catalogo]
            );
            stock = rows[0].stock_disponible;
        }

        if (diferencia > 0 && stock < diferencia) {
            return res.status(400).json({
                success: false,
                message: "Stock insuficiente para aumentar cantidad"
            });
        }

        // Actualizar detalle
        await pool.query(
            "UPDATE detalle_ventas SET cantidad = ? WHERE id = ?",
            [cantidad, id]
        );

        // Ajustar stock
        if (detalle.id_producto) {
            await pool.query(
                "UPDATE productos SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?",
                [diferencia, detalle.id_producto]
            );
        } else {
            await pool.query(
                "UPDATE catalogo SET stock_disponible = stock_disponible - ? WHERE id = ?",
                [diferencia, detalle.id_catalogo]
            );
        }

        res.json({ success: true, message: "Detalle actualizado correctamente" });

    } catch (error) {
        console.error("Error al actualizar detalle venta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Eliminar detalle
const deleteDetalleVenta = async (req, res) => {
    const { id } = req.params;

    try {
        const [detalleRes] = await pool.query(
            "SELECT * FROM detalle_ventas WHERE id = ?",
            [id]
        );

        if (detalleRes.length === 0) {
            return res.status(404).json({ success: false, message: "Detalle no encontrado" });
        }

        const detalle = detalleRes[0];

        // Eliminar detalle
        await pool.query("DELETE FROM detalle_ventas WHERE id = ?", [id]);

        // Devolver stock
        if (detalle.id_producto) {
            await pool.query(
                "UPDATE productos SET cantidad_disponible = cantidad_disponible + ? WHERE id = ?",
                [detalle.cantidad, detalle.id_producto]
            );
        } else {
            await pool.query(
                "UPDATE catalogo SET stock_disponible = stock_disponible + ? WHERE id = ?",
                [detalle.cantidad, detalle.id_catalogo]
            );
        }

        res.json({ success: true, message: "Detalle de venta eliminado correctamente" });

    } catch (error) {
        console.error("Error al eliminar detalle venta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getDetallesByVenta,
    addDetalleVenta,
    updateDetalleVenta,
    deleteDetalleVenta
};
