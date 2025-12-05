const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* =======================================================
   TOKEN
========================================================= */
const generarToken = (usuario) => {
    return jwt.sign(
        {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
};

/* =======================================================
   REGISTRO
========================================================= */
const register = async (req, res) => {
    const { nombre_usuario, nombre, email, password, rol } = req.body;

    if (!nombre_usuario || !nombre || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Todos los campos son obligatorios"
        });
    }

    try {
        const [existing] = await pool.query(
            "SELECT id FROM usuarios WHERE email = ? OR nombre_usuario = ?",
            [email, nombre_usuario]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "El usuario o email ya están registrados"
            });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO usuarios (nombre_usuario, nombre, email, password_hash, rol)
             VALUES (?, ?, ?, ?, ?)`,
            [nombre_usuario, nombre, email, password_hash, rol || "cliente"]
        );

        const usuario = {
            id: result.insertId,
            nombre,
            email,
            rol: rol || "cliente"
        };

        const token = generarToken(usuario);

        res.status(201).json({
            success: true,
            message: "Usuario registrado correctamente",
            token,
            usuario: {
                ...usuario,
                id_cliente: null
            }
        });

    } catch (error) {
        console.error("Error en register:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* =======================================================
   LOGIN
========================================================= */
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email y contraseña requeridos"
        });
    }

    try {
        const [rows] = await pool.query(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        const usuario = rows[0];

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                message: "Contraseña incorrecta"
            });
        }

        // 🔍 BUSCAR SI EXISTE CLIENTE RELACIONADO
        const [[cliente]] = await pool.query(
            "SELECT id FROM clientes WHERE email = ?",
            [usuario.email]
        );

        const token = generarToken(usuario);

        res.json({
            success: true,
            message: "Inicio de sesión exitoso",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                id_cliente: cliente ? cliente.id : null
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const validarToken = (req, res) => {
    res.json({
        success: true,
        message: "Token válido",
        usuario: req.usuario
    });
};

module.exports = {
    register,
    login,
    validarToken
};
