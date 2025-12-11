// backend/controllers/categoriasController.js
const pool = require('../config/database'); // Importamos la conexión a la BD

// Obtener todas las categorías
const getAllCategorias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categorias ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Obtener una categoría por su ID
const getCategoriaById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error al obtener categoría:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Crear una nueva categoría
const createCategoria = async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
        return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio' });
    }
    try {
        const sql = 'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)';
        const [result] = await pool.query(sql, [nombre, descripcion || null]);
        res.status(201).json({ success: true, message: 'Categoría creada correctamente', data: { id: result.insertId } });
    } catch (error) {
        // Manejar error de nombre duplicado
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El nombre de la categoría ya existe' });
        }
        console.error('Error al crear categoría:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Actualizar una categoría existente
const updateCategoria = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    if (!nombre) {
        return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio' });
    }
    try {
        const sql = 'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?';
        const [result] = await pool.query(sql, [nombre, descripcion || null, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
        }
        res.json({ success: true, message: 'Categoría actualizada correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El nombre de la categoría ya existe' });
        }
        console.error('Error al actualizar categoría:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Eliminar una categoría
const deleteCategoria = async (req, res) => {
    const { id } = req.params;
    try {
        // Primero, verificar si la categoría está siendo usada por algún producto del catálogo
        const [checkResult] = await pool.query('SELECT COUNT(*) as count FROM catalogo WHERE id_categoria = ?', [id]);
        if (checkResult[0].count > 0) {
            return res.status(400).json({ success: false, message: 'No se puede eliminar la categoría porque está asociada a uno o más productos del catálogo' });
        }

        const sql = 'DELETE FROM categorias WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
        }
        res.json({ success: true, message: 'Categoría eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllCategorias,
    getCategoriaById,
    createCategoria,
    updateCategoria,
    deleteCategoria
};