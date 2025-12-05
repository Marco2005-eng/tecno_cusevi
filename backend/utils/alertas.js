const pool = require("../config/database");

async function crearAlerta(tipo, titulo, mensaje, id_referencia = null) {
    try {
        await pool.query(
            `INSERT INTO alertas (tipo, titulo, mensaje, id_referencia)
             VALUES (?, ?, ?, ?)`,
            [tipo, titulo, mensaje, id_referencia]
        );
    } catch (error) {
        console.error("Error creando alerta:", error);
    }
}

module.exports = { crearAlerta };
