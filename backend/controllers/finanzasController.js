const pool = require("../config/database");

/* ==========================
   Utilidad: obtener rango
========================== */
function obtenerRango(req) {
    let { desde, hasta } = req.query;

    // Si no envían fechas → aplicamos mes actual
    if (!desde || !hasta) {
        const hoy = new Date();
        const y = hoy.getFullYear();
        const m = String(hoy.getMonth() + 1).padStart(2, "0");

        desde = `${y}-${m}-01`;
        hasta = `${y}-${m}-31`;
    }

    return { desde, hasta };
}

/* ==========================
   1) Resumen General
========================== */
const getResumenGeneral = async (req, res) => {
    try {
        const { desde, hasta } = obtenerRango(req);

        const [[ing]] = await pool.query(
            `SELECT SUM(monto) AS total
             FROM finanzas_movimientos
             WHERE tipo='ingreso' AND DATE(fecha_movimiento) BETWEEN ? AND ?`,
            [desde, hasta]
        );

        const [[egr]] = await pool.query(
            `SELECT SUM(monto) AS total
             FROM finanzas_movimientos
             WHERE tipo='egreso' AND DATE(fecha_movimiento) BETWEEN ? AND ?`,
            [desde, hasta]
        );

        const ingresos = ing.total || 0;
        const egresos = egr.total || 0;

        res.json({
            success: true,
            data: {
                ingresos,
                egresos,
                balance: ingresos - egresos
            }
        });

    } catch (error) {
        console.error("❌ Error getResumenGeneral:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ==========================
   2) Movimientos filtrados
========================== */
const getMovimientos = async (req, res) => {
    try {
        let { desde, hasta } = req.query;

        if (!desde || !hasta) {
            const hoy = new Date();
            const y = hoy.getFullYear();
            const m = hoy.getMonth() + 1;

            desde = `${y}-${String(m).padStart(2, '0')}-01`;
            hasta = `${y}-${String(m).padStart(2, '0')}-31`;
        }

        const [rows] = await pool.query(
            `SELECT 
                id,
                tipo,
                origen,
                monto,
                descripcion,
                DATE_FORMAT(fecha_movimiento, '%Y-%m-%d %H:%i:%s') AS fecha_movimiento
            FROM finanzas_movimientos
            WHERE fecha_movimiento BETWEEN ? AND ?
            ORDER BY fecha_movimiento DESC`,
            [desde + " 00:00:00", hasta + " 23:59:59"]
        );

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error getMovimientos:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};


/* ==========================
   3) Registrar Movimiento Manual
========================== */
const registrarManual = async (req, res) => {
    const { tipo, monto, descripcion } = req.body;

    if (!tipo || !monto)
        return res.json({ success: false, message: "Datos incompletos" });

    try {
        await pool.query(
            `INSERT INTO finanzas_movimientos (tipo, origen, monto, descripcion, fecha_movimiento)
             VALUES (?, 'manual', ?, ?, NOW())`,
            [tipo, monto, descripcion || "Movimiento manual"]
        );

        res.json({ success: true, message: "Movimiento registrado" });

    } catch (error) {
        console.error("❌ Error registrarManual:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ==========================
   4) Gráfico Mensual (últimos 12 meses)
========================== */
const getGraficoMensual = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                YEAR(fecha_movimiento) AS anio,
                MONTH(fecha_movimiento) AS mes,
                SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos,
                SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) AS egresos
            FROM finanzas_movimientos
            GROUP BY anio, mes
            ORDER BY anio DESC, mes DESC
            LIMIT 12
        `);

        res.json({
            success: true,
            data: {
                labels: rows.map(r => `${r.mes}/${r.anio}`).reverse(),
                ingresos: rows.map(r => r.ingresos).reverse(),
                egresos: rows.map(r => r.egresos).reverse()
            }
        });

    } catch (error) {
        console.error("❌ Error getGraficoMensual:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ==========================
   5) Gráfico Semanal (últimas 8 semanas)
========================== */
const getGraficoSemanal = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                YEARWEEK(fecha_movimiento, 1) AS semana,
                SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos,
                SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) AS egresos
            FROM finanzas_movimientos
            GROUP BY YEARWEEK(fecha_movimiento, 1)
            ORDER BY semana DESC
            LIMIT 8
        `);

        res.json({
            success: true,
            data: {
                labels: rows.map(r => `Semana ${r.semana}`).reverse(),
                ingresos: rows.map(r => r.ingresos).reverse(),
                egresos: rows.map(r => r.egresos).reverse()
            }
        });

    } catch (error) {
        console.error("❌ Error getGraficoSemanal:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ==========================
   6) Gráfico Anual Detallado
========================== */
const getGraficoAnualDetallado = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                YEAR(fecha_movimiento) AS anio,
                SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos,
                SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) AS egresos
            FROM finanzas_movimientos
            GROUP BY anio
            ORDER BY anio DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                labels: rows.map(r => r.anio).reverse(),
                ingresos: rows.map(r => r.ingresos).reverse(),
                egresos: rows.map(r => r.egresos).reverse()
            }
        });

    } catch (error) {
        console.error("❌ Error getGraficoAnualDetallado:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

/* ==========================
   EXPORTAR
========================== */
module.exports = {
    getResumenGeneral,
    getMovimientos,
    registrarManual,
    getGraficoMensual,
    getGraficoSemanal,
    getGraficoAnualDetallado
};
