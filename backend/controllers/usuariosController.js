// controllers/usuariosController.js

const pool = require('../config/database');
const bcrypt = require("bcryptjs");

// ======================================================
// 🔹 Obtener todos los usuarios
// ======================================================
const getAllUsuarios = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                id, nombre_usuario, nombre, email, rol, activo, fecha_creacion
            FROM usuarios
            ORDER BY fecha_creacion DESC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error("Error al obtener usuarios:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ======================================================
// 🔹 Obtener un usuario por ID
// ======================================================
const getUsuarioById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            "SELECT id, nombre_usuario, nombre, email, rol, activo FROM usuarios WHERE id = ?",
            [id]
        );

        if (rows.length === 0)
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error("Error al obtener usuario:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ======================================================
// 🔹 Crear usuario
// ======================================================
const createUsuario = async (req, res) => {
    const { nombre_usuario, nombre, email, password, rol, activo } = req.body;

    if (!nombre_usuario || !nombre || !email || !password || !rol) {
        return res.status(400).json({
            success: false,
            message: "Todos los campos son obligatorios"
        });
    }

    try {
        const [exist] = await pool.query(
            "SELECT id FROM usuarios WHERE email = ? OR nombre_usuario = ?",
            [email, nombre_usuario]
        );

        if (exist.length > 0) {
            return res.status(400).json({
                success: false,
                message: "El usuario o email ya están registrados"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO usuarios (nombre_usuario, nombre, email, password_hash, rol, activo)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            nombre_usuario,
            nombre,
            email,
            hashedPassword,
            rol,
            activo ? 1 : 0
        ]);

        res.status(201).json({
            success: true,
            message: "Usuario creado correctamente",
            data: { id: result.insertId }
        });

    } catch (err) {
        console.error("Error al crear usuario:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ======================================================
// 🔹 Actualizar usuario
// ======================================================
const updateUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre_usuario, nombre, email, password, rol, activo } = req.body;

    try {
        let hashedPassword = null;

        if (password && password.trim() !== "") {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const sql = `
            UPDATE usuarios
            SET nombre_usuario = ?, nombre = ?, email = ?, rol = ?, activo = ?
                ${hashedPassword ? ", password_hash = ?" : ""}
            WHERE id = ?
        `;

        const params = hashedPassword
            ? [nombre_usuario, nombre, email, rol, activo ? 1 : 0, hashedPassword, id]
            : [nombre_usuario, nombre, email, rol, activo ? 1 : 0, id];

        const [result] = await pool.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        }

        res.json({ success: true, message: "Usuario actualizado correctamente" });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "El email o nombre de usuario ya está en uso"
            });
        }

        console.error("Error al actualizar usuario:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ======================================================
// 🔹 Activar / Inactivar usuario
// ======================================================
const toggleEstadoUsuario = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    try {
        const [result] = await pool.query(
            "UPDATE usuarios SET activo = ? WHERE id = ?",
            [estado ? 1 : 0, id]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });

        res.json({
            success: true,
            message: estado ? "Usuario activado" : "Usuario desactivado"
        });

    } catch (err) {
        console.error("Error al cambiar estado:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

// ======================================================
// 🔹 Eliminar DEFINITIVAMENTE usuario
// ======================================================
const deleteUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        }

        res.json({ success: true, message: "Usuario eliminado correctamente" });

    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    toggleEstadoUsuario,
    deleteUsuario
};
