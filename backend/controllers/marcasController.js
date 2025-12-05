// controllers/marcasController.js
const pool = require('../config/database');

// Obtener todas las marcas
const getAllMarcas = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM marcas ORDER BY nombre ASC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error al obtener marcas:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Obtener una marca por ID
const getMarcaById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query("SELECT * FROM marcas WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Marca no encontrada" });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error("Error al obtener marca:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Crear una nueva marca
const createMarca = async (req, res) => {
    const { nombre, logo_url } = req.body;

    if (!nombre) {
        return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }

    try {
        const sql = `
            INSERT INTO marcas (nombre, logo_url)
            VALUES (?, ?)
        `;
        const [result] = await pool.query(sql, [
            nombre,
            logo_url || null
        ]);

        res.status(201).json({
            success: true,
            message: "Marca creada correctamente",
            data: { id: result.insertId }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Ya existe una marca con ese nombre"
            });
        }
        console.error("Error al crear marca:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Actualizar marca
const updateMarca = async (req, res) => {
    const { id } = req.params;
    const { nombre, logo_url } = req.body;

    try {
        const sql = `
            UPDATE marcas
            SET nombre = ?, logo_url = ?
            WHERE id = ?
        `;
        const [result] = await pool.query(sql, [
            nombre,
            logo_url || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Marca no encontrada" });
        }

        res.json({ success: true, message: "Marca actualizada correctamente" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "El nombre ya está siendo usado por otra marca"
            });
        }
        console.error("Error al actualizar marca:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Eliminar marca
const deleteMarca = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM marcas WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Marca no encontrada" });
        }

        res.json({ success: true, message: "Marca eliminada correctamente" });
    } catch (error) {
        // Si la marca está siendo usada por productos no se puede eliminar
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).json({
                success: false,
                message: "No se puede eliminar porque está siendo usada en productos"
            });
        }

        console.error("Error al eliminar marca:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllMarcas,
    getMarcaById,
    createMarca,
    updateMarca,
    deleteMarca
};
