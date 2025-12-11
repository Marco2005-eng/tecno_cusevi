const pool = require('../config/database');

/* ============================================================
   GET: Catálogo completo (con ofertas)
============================================================ */
const getAllCatalogo = async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.id,
                c.id_producto,
                c.id_categoria,
                c.nombre_venta,
                c.descripcion,
                c.precio_venta,
                c.imagen_url,
                c.destacado,
                c.activo,
                c.fecha_creacion,

                p.nombre AS nombre_producto,
                p.cantidad_disponible AS stock_real,
                m.nombre AS nombre_marca,
                cat.nombre AS nombre_categoria,

                o.id AS oferta_id,
                o.descuento_porcentaje,
                o.fecha_inicio,
                o.fecha_fin,
                o.activa AS oferta_activa

            FROM catalogo c
            JOIN productos p ON c.id_producto = p.id
            JOIN marcas m ON p.id_marca = m.id
            JOIN categorias cat ON c.id_categoria = cat.id
            LEFT JOIN ofertas o 
                ON o.id_catalogo = c.id 
                AND o.activa = 1 
                AND NOW() BETWEEN o.fecha_inicio AND o.fecha_fin
            WHERE 1
            ORDER BY c.id DESC
        `;

        const [rows] = await pool.query(sql);

        const data = rows.map(item => {
            const base = Number(item.precio_venta);
            const tieneOferta = item.oferta_id !== null;

            const precioOferta = tieneOferta
                ? Number((base - (base * (item.descuento_porcentaje / 100))).toFixed(2))
                : null;

            return {
                ...item,
                precio_venta: base,
                precio_oferta: precioOferta,
                oferta_activa: tieneOferta,
                destacado: item.destacado === 1,
                activo: item.activo === 1,
                stock_real: Number(item.stock_real)
            };
        });

        res.json({ success: true, data });

    } catch (error) {
        console.error("Error al obtener catálogo:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   GET: Productos disponibles para catálogo
============================================================ */
const getProductosForCatalogo = async (req, res) => {
    try {
        const incluirTodos = req.query.all === "1";

        let sql = `
            SELECT 
                p.id, 
                p.nombre, 
                p.cantidad_disponible,
                p.precio_compra,
                m.nombre AS marca_nombre
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id
            WHERE p.activo = 1
        `;

        if (!incluirTodos) {
            sql += `
                AND p.id NOT IN (SELECT id_producto FROM catalogo WHERE activo = 1)
            `;
        }

        sql += ` ORDER BY p.id DESC`;

        const [rows] = await pool.query(sql);

        const data = rows.map(p => ({
            ...p,
            cantidad_disponible: Number(p.cantidad_disponible),
            precio_compra: Number(p.precio_compra)
        }));

        res.json({ success: true, data });

    } catch (error) {
        console.error("Error al obtener productos catálogo:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   GET: Item por ID
============================================================ */
const getCatalogoById = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                c.*, 
                p.nombre AS nombre_producto,
                p.cantidad_disponible AS stock_real,
                m.nombre AS nombre_marca,
                cat.nombre AS nombre_categoria
            FROM catalogo c
            JOIN productos p ON c.id_producto = p.id 
            JOIN marcas m ON p.id_marca = m.id 
            JOIN categorias cat ON c.id_categoria = cat.id 
            WHERE c.id = ?
        `;

        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Ítem no encontrado" });
        }

        const item = rows[0];

        res.json({
            success: true,
            data: {
                ...item,
                precio_venta: Number(item.precio_venta),
                stock_real: Number(item.stock_real),
                destacado: item.destacado === 1,
                activo: item.activo === 1
            }
        });

    } catch (error) {
        console.error("Error obtener ítem:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   POST: Crear ítem catálogo
============================================================ */
const createCatalogoItem = async (req, res) => {
    const { id_producto, id_categoria, nombre_venta, descripcion, precio_venta, imagen_url, destacado } = req.body;

    if (!id_producto || !id_categoria || !nombre_venta || !precio_venta) {
        return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
    }

    try {
        const sql = `
            INSERT INTO catalogo 
            (id_producto, id_categoria, nombre_venta, descripcion, precio_venta, imagen_url, destacado, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `;

        const [result] = await pool.query(sql, [
            id_producto,
            id_categoria,
            nombre_venta,
            descripcion,
            precio_venta,
            imagen_url || null,
            destacado ? 1 : 0
        ]);

        res.status(201).json({
            success: true,
            message: "Ítem añadido correctamente",
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error("Error al crear ítem:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   PUT: Actualizar ítem catálogo (CORREGIDO)
============================================================ */
const updateCatalogoItem = async (req, res) => {
    const { id } = req.params;

    const { 
        id_categoria, 
        nombre_venta, 
        descripcion, 
        precio_venta, 
        imagen_url, 
        destacado, 
        activo 
    } = req.body;

    try {
        const sql = `
            UPDATE catalogo
            SET 
                id_categoria = ?, 
                nombre_venta = ?, 
                descripcion = ?, 
                precio_venta = ?, 
                imagen_url = ?, 
                destacado = ?, 
                activo = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            id_categoria,
            nombre_venta,
            descripcion,
            precio_venta,
            imagen_url || null,
            (destacado === true || destacado === 1 || destacado === "1") ? 1 : 0,
            (activo === true || activo === 1 || activo === "1") ? 1 : 0,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Ítem no encontrado" });
        }

        res.json({ success: true, message: "Ítem actualizado correctamente" });

    } catch (error) {
        console.error("Error actualizar ítem:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   DELETE: Desactivar ítem catálogo
============================================================ */
const deleteCatalogoItem = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            "UPDATE catalogo SET activo = 0 WHERE id = ?", 
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Ítem no encontrado" });
        }

        res.json({ success: true, message: "Ítem desactivado" });

    } catch (error) {
        console.error("Error al eliminar ítem:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllCatalogo,
    getProductosForCatalogo,
    getCatalogoById,
    createCatalogoItem,
    updateCatalogoItem,
    deleteCatalogoItem
};
