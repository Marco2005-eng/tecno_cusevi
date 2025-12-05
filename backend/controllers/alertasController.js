const pool = require("../config/database");
const { io } = require("../server"); // 👈 Importa Socket.IO para emitir alertas en tiempo real

/* ============================================================
   🔥 FUNCIÓN GLOBAL PARA CREAR UNA ALERTA + EMITIR SOCKET.IO
   ============================================================ */
const crearAlerta = async ({
    tipo = "sistema",                // stock | pedido | usuario | sistema
    severidad = "info",             // info | warning | danger | success
    titulo = "",
    mensaje = "",
    tipo_referencia = null,         // venta | pedido | producto | usuario | etc
    id_referencia = null,
    url = null,                      // ej: "/stock.html?id=3"
    id_usuario = null
}) => {
    try {
        const sql = `
            INSERT INTO alertas 
            (tipo, severidad, titulo, mensaje, tipo_referencia, id_referencia, url, id_usuario)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            tipo,
            severidad,
            titulo,
            mensaje,
            tipo_referencia,
            id_referencia,
            url,
            id_usuario
        ]);

        const alertaNueva = {
            id: result.insertId,
            tipo,
            severidad,
            titulo,
            mensaje,
            tipo_referencia,
            id_referencia,
            url,
            id_usuario,
            leida: 0,
            fecha_creacion: new Date()
        };

        // 🔥 ENVIAR ALERTA A TODOS LOS CLIENTES EN TIEMPO REAL
        io.emit("nueva-alerta", alertaNueva);

        console.log("🔔 Alerta emitida:", alertaNueva);

        return { success: true, data: alertaNueva };

    } catch (error) {
        console.error("❌ Error creando alerta:", error);
        return { success: false, error };
    }
};

/* ============================================================
   🔍 OBTENER ALERTAS (con filtros)
   ============================================================ */
const getAlertas = async (req, res) => {
    const { tipo = "all" } = req.query;

    try {
        let sql = `
            SELECT 
                id, tipo, severidad, titulo, mensaje,
                tipo_referencia, id_referencia,
                url, id_usuario, leida, fecha_creacion
            FROM alertas
        `;

        const params = [];

        if (tipo !== "all") {
            sql += " WHERE tipo = ?";
            params.push(tipo);
        }

        sql += " ORDER BY fecha_creacion DESC";

        const [rows] = await pool.query(sql, params);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("❌ Error al obtener alertas:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   ✔ MARCAR 1 ALERTA COMO LEÍDA
   ============================================================ */
const marcarLeida = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            `UPDATE alertas SET leida = 1 WHERE id = ?`,
            [id]
        );

        res.json({ success: true, message: "Alerta marcada como leída" });

    } catch (error) {
        console.error("❌ Error al marcar alerta:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ============================================================
   ✔ MARCAR TODAS COMO LEÍDAS
   ============================================================ */
const marcarTodasLeidas = async (req, res) => {
    try {
        await pool.query(`UPDATE alertas SET leida = 1`);

        res.json({
            success: true,
            message: "Todas las alertas fueron marcadas como leídas"
        });

    } catch (error) {
        console.error("❌ Error al marcar todas:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ============================================================
   ❌ BORRAR ALERTA
   ============================================================ */
const borrarAlerta = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(`DELETE FROM alertas WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Alerta eliminada correctamente"
        });

    } catch (error) {
        console.error("❌ Error eliminando alerta:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ============================================================
   EXPORTAR
   ============================================================ */
module.exports = {
    crearAlerta,
    getAlertas,
    marcarLeida,
    marcarTodasLeidas,
    borrarAlerta
};
