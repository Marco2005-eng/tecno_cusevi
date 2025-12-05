// controllers/configPublicController.js
const pool = require("../config/database");

const getPublicConfig = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT clave, valor FROM configuracion");

        const data = {};
        rows.forEach(r => {
            data[r.clave] = r.valor;
        });

        return res.json({ success: true, data });

    } catch (error) {
        console.error("Error obteniendo config pública:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
};

module.exports = { getPublicConfig };
