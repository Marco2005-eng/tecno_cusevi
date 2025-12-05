const pool = require('../config/database');

const getAllClientes = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM clientes ORDER BY fecha_registro DESC");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const getClienteById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query("SELECT * FROM clientes WHERE id = ?", [id]);

        if (rows.length === 0)
            return res.status(404).json({ success: false, message: "Cliente no encontrado" });

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const getClienteByEmail = async (req, res) => {
    const { email } = req.params;

    try {
        const [rows] = await pool.query("SELECT * FROM clientes WHERE email = ?", [email]);

        if (rows.length === 0)
            return res.json({ success: true, data: null });

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const createCliente = async (req, res) => {
    const { nombre, email, telefono, direccion } = req.body;

    if (!nombre || !email)
        return res.status(400).json({ success: false, message: "Nombre y email son obligatorios" });

    try {
        const [[existente]] = await pool.query("SELECT id FROM clientes WHERE email = ?", [email]);

        if (existente)
            return res.status(400).json({ success: false, message: "Ya existe un cliente con este email" });

        const [result] = await pool.query(
            "INSERT INTO clientes (nombre, email, telefono, direccion) VALUES (?, ?, ?, ?)",
            [nombre, email, telefono || null, direccion || null]
        );

        res.status(201).json({ success: true, message: "Cliente creado", data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const updateCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, email, telefono, direccion } = req.body;

    try {
        const [[duplicado]] = await pool.query(
            "SELECT id FROM clientes WHERE email = ? AND id != ?",
            [email, id]
        );

        if (duplicado)
            return res.status(400).json({ success: false, message: "El email ya pertenece a otro cliente" });

        const [result] = await pool.query(
            "UPDATE clientes SET nombre=?, email=?, telefono=?, direccion=? WHERE id=?",
            [nombre, email, telefono || null, direccion || null, id]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Cliente no encontrado" });

        res.json({ success: true, message: "Cliente actualizado" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const deleteCliente = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM clientes WHERE id = ?", [id]);

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Cliente no encontrado" });

        res.json({ success: true, message: "Cliente eliminado" });
    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2")
            return res.status(400).json({ success: false, message: "No se puede eliminar: tiene pedidos o ventas" });

        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const saveOrUpdateByEmail = async (req, res) => {
    const { nombre, email, telefono, direccion } = req.body;

    if (!email)
        return res.status(400).json({ success: false, message: "El email es obligatorio" });

    try {
        const [rows] = await pool.query("SELECT id FROM clientes WHERE email = ?", [email]);

        if (rows.length > 0) {
            const idCliente = rows[0].id;

            await pool.query(
                "UPDATE clientes SET nombre=?, telefono=?, direccion=? WHERE id=?",
                [nombre, telefono || null, direccion || null, idCliente]
            );

            return res.json({ success: true, message: "Datos actualizados", data: { id: idCliente } });
        }

        const [insert] = await pool.query(
            "INSERT INTO clientes (nombre, email, telefono, direccion) VALUES (?, ?, ?, ?)",
            [nombre, email, telefono || null, direccion || null]
        );

        res.json({ success: true, message: "Cliente creado", data: { id: insert.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllClientes,
    getClienteById,
    getClienteByEmail,
    createCliente,
    updateCliente,
    deleteCliente,
    saveOrUpdateByEmail
};
