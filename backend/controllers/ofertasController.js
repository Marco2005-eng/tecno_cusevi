// controllers/ofertasController.js
const pool = require('../config/database');

// =============================================================
// OBTENER TODAS LAS OFERTAS (ADMIN)
// =============================================================
const getAllOfertas = async (req, res) => {
    try {
        const sql = `
            SELECT 
                o.*,
                c.nombre_venta AS producto_nombre,
                c.precio_venta AS precio_original,
                c.imagen_url,
                c.id_categoria,
                cat.nombre AS nombre_categoria
            FROM ofertas o
            JOIN catalogo c ON o.id_catalogo = c.id
            JOIN categorias cat ON c.id_categoria = cat.id
            ORDER BY o.fecha_creacion DESC
        `;
        const [rows] = await pool.query(sql);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener ofertas:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// =============================================================
// OBTENER SOLO OFERTAS ACTIVAS (TIENDA)
// =============================================================
const getOfertasActivas = async (req, res) => {
    try {
        const sql = `
            SELECT 
                o.id,
                o.id_catalogo,
                o.nombre AS descripcion_corta,
                o.descuento_porcentaje,
                o.fecha_inicio,
                o.fecha_fin,
                o.activa,

                c.nombre_venta AS producto_nombre,
                c.precio_venta AS precio_original,
                c.imagen_url,

                (c.precio_venta - (c.precio_venta * o.descuento_porcentaje / 100))
                    AS precio_oferta,

                c.id_categoria,
                cat.nombre AS nombre_categoria

            FROM ofertas o
            JOIN catalogo c ON o.id_catalogo = c.id
            JOIN categorias cat ON c.id_categoria = cat.id

            WHERE o.activa = 1
              AND NOW() BETWEEN o.fecha_inicio AND o.fecha_fin

            ORDER BY o.fecha_inicio DESC
        `;

        const [rows] = await pool.query(sql);
        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener ofertas activas:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// =============================================================
// OBTENER UNA OFERTA POR ID
// =============================================================
const getOfertaById = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                o.*,
                c.nombre_venta AS producto_nombre,
                c.precio_venta AS precio_original,
                c.imagen_url,

                c.id_categoria,
                cat.nombre AS nombre_categoria

            FROM ofertas o
            JOIN catalogo c ON o.id_catalogo = c.id
            JOIN categorias cat ON c.id_categoria = cat.id
            WHERE o.id = ?
        `;

        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0) {
            return res.json({ success: false, message: "Oferta no encontrada" });
        }

        res.json({ success: true, data: rows[0] });

    } catch (error) {
        console.error("Error al obtener oferta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};


// =============================================================
// VALIDAR OFERTA ACTIVA (NO PERMITIR DUPLICADOS)
// =============================================================
async function validarOfertaActiva(idCatalogo, excluirId = null) {
    let sql = `
        SELECT id FROM ofertas 
        WHERE id_catalogo = ? 
          AND activa = 1
          AND NOW() BETWEEN fecha_inicio AND fecha_fin
    `;

    const params = [idCatalogo];

    if (excluirId) {
        sql += ` AND id != ? `;
        params.push(excluirId);
    }

    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
}

// =============================================================
// CREAR OFERTA
// =============================================================
const createOferta = async (req, res) => {
    const { id_catalogo, nombre, descuento_porcentaje, fecha_inicio, fecha_fin, activa } = req.body;

    if (!id_catalogo || !nombre || !descuento_porcentaje || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({
            success: false,
            message: "id_catalogo, nombre, descuento, fecha_inicio y fecha_fin son obligatorios"
        });
    }

    try {
        // Validar que el catálogo exista y esté activo
        const [catRows] = await pool.query(
            "SELECT id FROM catalogo WHERE id = ? AND activo = 1",
            [id_catalogo]
        );

        if (catRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Ítem del catálogo no encontrado o inactivo"
            });
        }

        // Validar duplicado
        const existe = await validarOfertaActiva(id_catalogo);
        if (existe) {
            return res.status(400).json({
                success: false,
                message: "Este producto ya tiene una oferta activa vigente"
            });
        }

        const sql = `
            INSERT INTO ofertas (id_catalogo, nombre, descuento_porcentaje, fecha_inicio, fecha_fin, activa)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            id_catalogo,
            nombre,
            descuento_porcentaje,
            fecha_inicio,
            fecha_fin,
            activa !== undefined ? activa : 1
        ]);

        res.status(201).json({
            success: true,
            message: "Oferta creada correctamente",
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error("Error al crear oferta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// =============================================================
// ACTUALIZAR OFERTA
// =============================================================
const updateOferta = async (req, res) => {
    const { id } = req.params;
    const { id_catalogo, nombre, descuento_porcentaje, fecha_inicio, fecha_fin, activa } = req.body;

    try {
        // Validar duplicado al actualizar
        if (activa == 1) {
            const existe = await validarOfertaActiva(id_catalogo, id);
            if (existe) {
                return res.status(400).json({
                    success: false,
                    message: "Este producto ya tiene otra oferta activa vigente"
                });
            }
        }

        const sql = `
            UPDATE ofertas
            SET id_catalogo = ?, nombre = ?, descuento_porcentaje = ?, 
                fecha_inicio = ?, fecha_fin = ?, activa = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            id_catalogo,
            nombre,
            descuento_porcentaje,
            fecha_inicio,
            fecha_fin,
            activa !== undefined ? activa : 1,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Oferta no encontrada" });
        }

        res.json({ success: true, message: "Oferta actualizada correctamente" });

    } catch (error) {
        console.error("Error al actualizar oferta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// =============================================================
// DESACTIVAR OFERTA
// =============================================================
const deleteOferta = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            "UPDATE ofertas SET activa = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Oferta no encontrada" });
        }

        res.json({ success: true, message: "Oferta desactivada correctamente" });

    } catch (error) {
        console.error("Error al desactivar oferta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllOfertas,
    getOfertasActivas,
    getOfertaById,
    createOferta,
    updateOferta,
    deleteOferta
};
