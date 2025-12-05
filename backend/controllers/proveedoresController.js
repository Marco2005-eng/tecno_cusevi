// controllers/proveedoresController.js
const pool = require('../config/database');

// Obtener todos los proveedores
const getAllProveedores = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM proveedores ORDER BY nombre_empresa ASC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error al obtener proveedores:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Obtener un proveedor por ID
const getProveedorById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query("SELECT * FROM proveedores WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error("Error al obtener proveedor:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Crear un proveedor
const createProveedor = async (req, res) => {
    const { nombre_empresa, contacto_nombre, telefono, email, direccion, ruc } = req.body;

    if (!nombre_empresa) {
        return res.status(400).json({ success: false, message: "El nombre de la empresa es obligatorio" });
    }

    try {
        const sql = `
            INSERT INTO proveedores (nombre_empresa, contacto_nombre, telefono, email, direccion, ruc)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            nombre_empresa,
            contacto_nombre || null,
            telefono || null,
            email || null,
            direccion || null,
            ruc || null
        ]);

        res.status(201).json({
            success: true,
            message: "Proveedor registrado correctamente",
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error("Error al crear proveedor:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Actualizar proveedor
const updateProveedor = async (req, res) => {
    const { id } = req.params;
    const { nombre_empresa, contacto_nombre, telefono, email, direccion, ruc } = req.body;

    try {
        const sql = `
            UPDATE proveedores
            SET nombre_empresa = ?, contacto_nombre = ?, telefono = ?, email = ?, direccion = ?, ruc = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            nombre_empresa,
            contacto_nombre || null,
            telefono || null,
            email || null,
            direccion || null,
            ruc || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
        }

        res.json({ success: true, message: "Proveedor actualizado correctamente" });

    } catch (error) {
        console.error("Error al actualizar proveedor:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// Eliminar proveedor
const deleteProveedor = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM proveedores WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
        }

        res.json({ success: true, message: "Proveedor eliminado correctamente" });

    } catch (error) {
        // No se puede eliminar si tiene productos o compras asociadas
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).json({
                success: false,
                message: "No se puede eliminar porque está relacionado con registros de productos o compras"
            });
        }

        console.error("Error al eliminar proveedor:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor
};
