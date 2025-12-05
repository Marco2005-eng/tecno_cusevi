const pool = require('../config/database');

const getStock = async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id,
                p.nombre,
                m.nombre AS marca,
                p.cantidad_disponible,
                p.cantidad_comprada,
                (p.cantidad_disponible <= 3) AS bajo_stock
            FROM productos p
            JOIN marcas m ON m.id = p.id_marca
            ORDER BY p.nombre
        `;

        const [rows] = await pool.query(sql);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener stock:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = { getStock };
