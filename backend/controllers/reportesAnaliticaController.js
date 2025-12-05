const pool = require("../config/database");

// =============================
// MÉTRICAS GENERALES
// =============================
const getMetricas = async (req, res) => {
    try {
        const { start, end, categoria } = req.query;

        let filtroCategoria = "";
        const params = [start, end];

        if (categoria) {
            filtroCategoria = "AND ca.id_categoria = ?";
            params.push(categoria);
        }

        const [[ventas]] = await pool.query(
            `
            SELECT 
                SUM(v.total) AS totalVentas,
                COUNT(DISTINCT v.id) AS totalPedidos,
                AVG(v.total) AS ticketPromedio
            FROM ventas v
            INNER JOIN detalle_ventas dv ON dv.id_venta = v.id
            INNER JOIN catalogo ca ON ca.id = dv.id_catalogo
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
            ${filtroCategoria}
        `,
            params
        );

        // clientes únicos
        let filtroCategoriaClientes = "";
        const paramsClientes = [start, end];

        if (categoria) {
            filtroCategoriaClientes = `
                AND EXISTS (
                    SELECT 1
                    FROM detalle_ventas dv2
                    INNER JOIN catalogo ca2 ON ca2.id = dv2.id_catalogo
                    WHERE dv2.id_venta = v.id
                    AND ca2.id_categoria = ?
                )
            `;
            paramsClientes.push(categoria);
        }

        const [[clientes]] = await pool.query(
            `
            SELECT COUNT(DISTINCT v.id_cliente) AS clientesUnicos
            FROM ventas v
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
            ${filtroCategoriaClientes}
        `,
            paramsClientes
        );

        res.json({
            success: true,
            data: {
                totalVentas: ventas.totalVentas || 0,
                totalPedidos: ventas.totalPedidos || 0,
                ticketPromedio: ventas.ticketPromedio || 0,
                clientesUnicos: clientes.clientesUnicos || 0
            }
        });

    } catch (error) {
        console.error("Error getMetricas:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};


// =============================
// VENTAS EN EL TIEMPO (GRÁFICO)
// =============================
const getVentasTiempo = async (req, res) => {
    try {
        const { start, end, categoria } = req.query;

        let filtroCategoria = "";
        const params = [start, end];

        if (categoria) {
            filtroCategoria = "AND ca.id_categoria = ?";
            params.push(categoria);
        }

        const [rows] = await pool.query(
            `
            SELECT 
                DATE(v.fecha_venta) AS fecha,
                SUM(v.total) AS total
            FROM ventas v
            INNER JOIN detalle_ventas dv ON dv.id_venta = v.id
            INNER JOIN catalogo ca ON ca.id = dv.id_catalogo
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
            ${filtroCategoria}
            GROUP BY DATE(v.fecha_venta)
            ORDER BY fecha ASC
        `,
            params
        );

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error ventas tiempo:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};


// =============================
// TOP PRODUCTOS
// =============================
const getTopProductos = async (req, res) => {
    try {
        const { start, end, categoria } = req.query;

        let filtroCategoria = "";
        const params = [start, end];

        if (categoria) {
            filtroCategoria = "AND ca.id_categoria = ?";
            params.push(categoria);
        }

        const [rows] = await pool.query(
            `
            SELECT 
                p.nombre AS producto,
                SUM(dv.cantidad) AS cantidad,
                SUM(dv.cantidad * dv.precio_unitario) AS total
            FROM detalle_ventas dv
            INNER JOIN ventas v ON v.id = dv.id_venta
            INNER JOIN productos p ON p.id = dv.id_producto
            INNER JOIN catalogo ca ON ca.id = dv.id_catalogo
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
            ${filtroCategoria}
            GROUP BY p.id
            ORDER BY cantidad DESC
            LIMIT 10
        `,
            params
        );

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error top productos:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};


// =============================
// VENTAS POR CATEGORÍA (PIE CHART)
// =============================
const getVentasCategorias = async (req, res) => {
    try {
        const { start, end } = req.query;

        const [rows] = await pool.query(
            `
            SELECT 
                c.nombre AS categoria,
                SUM(dv.cantidad * dv.precio_unitario) AS total
            FROM detalle_ventas dv
            INNER JOIN catalogo ca ON ca.id = dv.id_catalogo
            INNER JOIN categorias c ON c.id = ca.id_categoria
            INNER JOIN ventas v ON v.id = dv.id_venta
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
            GROUP BY c.id
        `,
            [start, end]
        );

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error ventas categorias:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};


// =============================
// DETALLE DE VENTAS (TABLA)
// =============================
const getDetalleVentas = async (req, res) => {
    try {
        const { start, end, categoria } = req.query;

        let filtroCategoria = "";
        const params = [start, end];

        if (categoria) {
            filtroCategoria = `
                AND EXISTS (
                    SELECT 1
                    FROM detalle_ventas dv2
                    INNER JOIN catalogo ca2 ON ca2.id = dv2.id_catalogo
                    WHERE dv2.id_venta = v.id
                      AND ca2.id_categoria = ?
                )
            `;
            params.push(categoria);
        }

        const [rows] = await pool.query(
            `
            SELECT 
                v.id AS id_venta,
                v.fecha_venta AS fecha,
                c.nombre AS cliente,
                v.total,
                v.estado
            FROM ventas v
            INNER JOIN clientes c ON c.id = v.id_cliente
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
            ${filtroCategoria}
            ORDER BY v.fecha_venta DESC
        `,
            params
        );

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error detalle ventas:", error);
        res.status(500).json({ success: false, message: "Error interno" });
    }
};


// =============================
// EXPORTAR
// =============================
module.exports = {
    getMetricas,
    getVentasTiempo,
    getTopProductos,
    getVentasCategorias,
    getDetalleVentas
};
