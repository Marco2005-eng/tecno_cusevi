// controllers/detallePedidosController.js
const pool = require('../config/database');

// Obtener detalles de un pedido
const getDetallesByPedido = async (req, res) => {
    const { id_pedido } = req.params;

    try {
        const sql = `
            SELECT 
                dp.*,
                c.nombre_venta AS producto_nombre,
                c.precio_venta,
                c.imagen_url
            FROM detalle_pedidos dp
            JOIN catalogo c ON dp.id_catalogo = c.id
            WHERE dp.id_pedido = ?
        `;

        const [rows] = await pool.query(sql, [id_pedido]);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener detalles:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Agregar detalle al pedido
const addDetalle = async (req, res) => {
    const { id_pedido, id_catalogo, cantidad } = req.body;

    if (!id_pedido || !id_catalogo || !cantidad) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    try {
        // Obtener info del producto en catálogo
        const [itemRes] = await pool.query(
            `SELECT precio_venta, stock_disponible FROM catalogo WHERE id = ?`,
            [id_catalogo]
        );

        if (itemRes.length === 0) {
            return res.status(404).json({ success: false, message: "Ítem del catálogo no encontrado" });
        }

        const item = itemRes[0];

        if (item.stock_disponible < cantidad) {
            return res.status(400).json({
                success: false,
                message: "No hay suficiente stock en el catálogo"
            });
        }

        // Insertar detalle
        const sqlInsert = `
            INSERT INTO detalle_pedidos (id_pedido, id_catalogo, cantidad, precio_unitario)
            VALUES (?, ?, ?, ?)
        `;

        const [insertRes] = await pool.query(sqlInsert, [
            id_pedido,
            id_catalogo,
            cantidad,
            item.precio_venta
        ]);

        // Actualizar stock
        const sqlStock = `
            UPDATE catalogo
            SET stock_disponible = stock_disponible - ?
            WHERE id = ?
        `;
        await pool.query(sqlStock, [cantidad, id_catalogo]);

        res.status(201).json({
            success: true,
            message: "Producto agregado al pedido",
            data: { id: insertRes.insertId }
        });

    } catch (error) {
        console.error("Error al agregar detalle:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Actualizar item del detalle
const updateDetalle = async (req, res) => {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (!cantidad) {
        return res.status(400).json({ success: false, message: "Cantidad requerida" });
    }

    try {
        // Obtener el detalle original
        const [detalleRes] = await pool.query(
            "SELECT * FROM detalle_pedidos WHERE id = ?",
            [id]
        );

        if (detalleRes.length === 0) {
            return res.status(404).json({ success: false, message: "Detalle no encontrado" });
        }

        const detalle = detalleRes[0];

        // Obtener stock actual del catálogo
        const [itemRes] = await pool.query(
            "SELECT stock_disponible FROM catalogo WHERE id = ?",
            [detalle.id_catalogo]
        );
        const item = itemRes[0];

        const diferencia = cantidad - detalle.cantidad;

        // Si se aumenta la cantidad
        if (diferencia > 0 && item.stock_disponible < diferencia) {
            return res.status(400).json({
                success: false,
                message: "Stock insuficiente para aumentar cantidad"
            });
        }

        // Actualizar detalle
        await pool.query(
            "UPDATE detalle_pedidos SET cantidad = ? WHERE id = ?",
            [cantidad, id]
        );

        // Ajustar stock
        await pool.query(
            "UPDATE catalogo SET stock_disponible = stock_disponible - ? WHERE id = ?",
            [diferencia, detalle.id_catalogo]
        );

        res.json({ success: true, message: "Detalle actualizado correctamente" });

    } catch (error) {
        console.error("Error al actualizar detalle:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Eliminar un artículo del pedido
const deleteDetalle = async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener el detalle
        const [detalleRes] = await pool.query(
            "SELECT * FROM detalle_pedidos WHERE id = ?",
            [id]
        );

        if (detalleRes.length === 0) {
            return res.status(404).json({ success: false, message: "Detalle no encontrado" });
        }

        const detalle = detalleRes[0];

        // Eliminar detalle
        await pool.query("DELETE FROM detalle_pedidos WHERE id = ?", [id]);

        // Devolver stock
        await pool.query(
            "UPDATE catalogo SET stock_disponible = stock_disponible + ? WHERE id = ?",
            [detalle.cantidad, detalle.id_catalogo]
        );

        res.json({ success: true, message: "Detalle eliminado correctamente" });

    } catch (error) {
        console.error("Error al eliminar detalle:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getDetallesByPedido,
    addDetalle,
    updateDetalle,
    deleteDetalle
};
