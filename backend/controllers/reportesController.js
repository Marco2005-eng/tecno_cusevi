const pool = require("../config/database");

// ==============================
// 🔥 Ventas Hoy
// ==============================
const ventasHoy = async (req, res) => {
    try {
        const sql = `
            SELECT SUM(total) AS total
            FROM ventas
            WHERE DATE(fecha_venta) = CURDATE()
        `;

        const [[result]] = await pool.query(sql);

        res.json({
            success: true,
            data: { total: result.total || 0 }
        });

    } catch (error) {
        console.error("Error ventas hoy:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

// ==============================
// 🔥 Pedidos Hoy
// ==============================
const pedidosHoy = async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(*) AS total
            FROM pedidos
            WHERE DATE(fecha_pedido) = CURDATE()
        `;

        const [[result]] = await pool.query(sql);

        res.json({
            success: true,
            data: { total: result.total || 0 }
        });

    } catch (error) {
        console.error("Error pedidos hoy:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

// ==============================
// 🔥 Stock Bajo
// ==============================
const stockBajo = async (req, res) => {
    try {
        const [[col]] = await pool.query(
            "SHOW COLUMNS FROM productos LIKE 'stock_minimo'"
        );

        let query = `
            SELECT COUNT(*) AS total
            FROM productos
            WHERE cantidad_disponible <= stock_minimo
        `;

        // Si NO existe, usar 5 como valor por defecto
        if (!col) {
            query = `
                SELECT COUNT(*) AS total
                FROM productos
                WHERE cantidad_disponible <= 5
            `;
        }

        const [[result]] = await pool.query(query);

        res.json({
            success: true,
            data: { total: result.total || 0 }
        });

    } catch (error) {
        console.error("Error stock bajo:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};


// ==============================
// 🔥 Nuevos clientes del mes
// ==============================
const nuevosClientes = async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(*) AS total
            FROM clientes
            WHERE MONTH(fecha_registro) = MONTH(CURDATE())
              AND YEAR(fecha_registro) = YEAR(CURDATE())
        `;

        const [[result]] = await pool.query(sql);

        res.json({
            success: true,
            data: { total: result.total || 0 }
        });

    } catch (error) {
        console.error("Error nuevos clientes:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};

module.exports = {
    ventasHoy,
    pedidosHoy,
    stockBajo,
    nuevosClientes
};
