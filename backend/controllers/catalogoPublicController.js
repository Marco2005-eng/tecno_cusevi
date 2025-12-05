const pool = require("../config/database");

/* ============================================================
   Obtener TODO el catálogo público
============================================================ */
const getCatalogoPublic = async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.id,
                c.nombre_venta,
                c.descripcion,
                c.precio_venta,
                c.imagen_url,
                c.destacado,
                c.id_categoria,
                cat.nombre AS nombre_categoria,

                p.id AS id_producto,
                p.nombre AS nombre_producto,
                p.cantidad_disponible AS stock_disponible,
                p.id_marca,
                m.nombre AS nombre_marca,

                o.id AS oferta_id,
                o.descuento_porcentaje,
                o.fecha_inicio,
                o.fecha_fin,
                o.activa AS oferta_activa

            FROM catalogo c
            JOIN productos p ON c.id_producto = p.id
            JOIN categorias cat ON c.id_categoria = cat.id
            JOIN marcas m ON p.id_marca = m.id

            LEFT JOIN ofertas o
                ON o.id_catalogo = c.id
                AND o.activa = 1
                AND NOW() BETWEEN o.fecha_inicio AND o.fecha_fin

            WHERE c.activo = 1
            ORDER BY c.nombre_venta ASC
        `;

        const [rows] = await pool.query(sql);

        const data = rows.map(item => {
            const precioBase = Number(item.precio_venta);
            const tieneOferta = item.oferta_id !== null;

            const precioOferta = tieneOferta
                ? Number((precioBase - (precioBase * item.descuento_porcentaje / 100)).toFixed(2))
                : null;

            return {
                ...item,
                precio_venta: precioBase,
                precio_oferta: precioOferta,
                oferta_activa: tieneOferta,
                stock_disponible: Number(item.stock_disponible),
                id_marca: item.id_marca,
                nombre_marca: item.nombre_marca
            };
        });

        res.json({ success: true, data });

    } catch (error) {
        console.error("Error en catálogo público:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   Obtener UN SOLO producto para producto.html
============================================================ */
const getCatalogoPublicById = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                c.id,
                c.nombre_venta,
                c.descripcion,
                c.precio_venta,
                c.imagen_url,
                c.destacado,
                c.id_categoria,
                cat.nombre AS nombre_categoria,

                p.id AS id_producto,
                p.nombre AS nombre_producto,
                p.cantidad_disponible AS stock_disponible,
                p.id_marca,
                m.nombre AS nombre_marca,

                o.id AS oferta_id,
                o.descuento_porcentaje,
                o.fecha_inicio,
                o.fecha_fin,
                o.activa AS oferta_activa

            FROM catalogo c
            JOIN productos p ON c.id_producto = p.id
            JOIN categorias cat ON c.id_categoria = cat.id
            JOIN marcas m ON p.id_marca = m.id

            LEFT JOIN ofertas o
                ON o.id_catalogo = c.id
                AND o.activa = 1
                AND NOW() BETWEEN o.fecha_inicio AND o.fecha_fin

            WHERE c.id = ?
            LIMIT 1
        `;

        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0) {
            return res.json({ success: false, message: "Producto no encontrado" });
        }

        const item = rows[0];
        const precioBase = Number(item.precio_venta);
        const tieneOferta = item.oferta_id !== null;

        const precioOferta = tieneOferta
            ? Number((precioBase - (precioBase * item.descuento_porcentaje / 100)).toFixed(2))
            : null;

        const data = {
            ...item,
            precio_venta: precioBase,
            precio_oferta: precioOferta,
            oferta_activa: tieneOferta,
            stock_disponible: Number(item.stock_disponible),
            id_marca: item.id_marca,
            nombre_marca: item.nombre_marca
        };

        res.json({ success: true, data });

    } catch (error) {
        console.error("Error obteniendo producto:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getCatalogoPublic,
    getCatalogoPublicById
};
