// controllers/configuracionController.js
const pool = require("../config/database");

/* ============================================================
   GET: Obtener toda la configuración
============================================================ */
const obtenerConfiguracion = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT clave, valor FROM configuracion");

        const config = {};
        rows.forEach(r => config[r.clave] = r.valor);

        return res.json({
            success: true,
            data: config
        });

    } catch (error) {
        console.error("Error obteniendo configuración:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
};

/* ============================================================
   PUT: Actualizar (insertar si no existe)
============================================================ */
const actualizarConfiguracion = async (req, res) => {
    const payload = req.body;

    try {
        // Cada entrada del payload { clave: valor }
        for (const key in payload) {
            const value = payload[key];

            // ¿Existe la clave?
            const [existe] = await pool.query(
                "SELECT id FROM configuracion WHERE clave = ? LIMIT 1",
                [key]
            );

            if (existe.length > 0) {
                // Update
                await pool.query(
                    "UPDATE configuracion SET valor = ? WHERE clave = ?",
                    [value, key]
                );
            } else {
                // Insert
                await pool.query(
                    "INSERT INTO configuracion (clave, valor) VALUES (?, ?)",
                    [key, value]
                );
            }
        }

        return res.json({
            success: true,
            message: "Configuración actualizada correctamente"
        });

    } catch (error) {
        console.error("Error actualizando configuración:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
};

/* ============================================================
   OPCIONAL: Backup completo
============================================================ */
const backupBaseDatos = async (req, res) => {
    try {
        const [tables] = await pool.query("SHOW TABLES");

        const backup = {};

        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];

            const [data] = await pool.query(`SELECT * FROM ${tableName}`);
            backup[tableName] = data;
        }

        return res.json({
            success: true,
            data: backup
        });

    } catch (error) {
        console.error("Error generando backup:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
};

module.exports = {
    obtenerConfiguracion,
    actualizarConfiguracion,
    backupBaseDatos
};
