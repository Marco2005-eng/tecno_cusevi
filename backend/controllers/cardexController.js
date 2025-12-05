const pool = require('../config/database');

// ======================================================
// ⭐ OBTENER KARDEX POR id_producto (DIRECTO)
// ======================================================
const getKardexByProducto = async (req, res) => {
    const { id_producto } = req.params;

    try {
        // 1. Verificar que el producto existe
        const [[producto]] = await pool.query(
            "SELECT id, nombre FROM productos WHERE id = ?",
            [id_producto]
        );

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: "El producto no existe"
            });
        }

        // 2. Obtener movimientos del kardex
        const sql = `
            SELECT 
                k.id,
                k.tipo_movimiento,
                k.cantidad,
                k.stock_resultante,
                k.detalle,
                k.id_referencia,
                k.tipo_referencia,
                u.nombre AS usuario,
                k.fecha_movimiento
            FROM cardex k
            LEFT JOIN usuarios u ON u.id = k.id_usuario
            WHERE k.id_producto = ?
            ORDER BY k.fecha_movimiento DESC
        `;

        const [rows] = await pool.query(sql, [id_producto]);

        return res.json({
            success: true,
            producto,
            data: rows
        });

    } catch (error) {
        console.error("Error obteniendo kardex:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
};

module.exports = { getKardexByProducto };
