// controllers/comprasController.js
const pool = require("../config/database");

/* ============================================================
   📌 1. OBTENER TODAS LAS COMPRAS
   ============================================================ */
const getAllCompras = async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.*, 
                p.nombre_empresa AS proveedor_nombre
            FROM compras c
            JOIN proveedores p ON c.id_proveedor = p.id
            ORDER BY c.fecha_creacion DESC
        `;

        const [rows] = await pool.query(sql);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener compras:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   📌 2. OBTENER UNA COMPRA POR ID
   ============================================================ */
const getCompraById = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                c.*, 
                p.nombre_empresa AS proveedor_nombre
            FROM compras c
            JOIN proveedores p ON c.id_proveedor = p.id
            WHERE c.id = ?
        `;

        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0)
            return res.status(404).json({ success: false, message: "Compra no encontrada" });

        res.json({ success: true, data: rows[0] });

    } catch (error) {
        console.error("Error al obtener compra:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   📌 3. CREAR UNA NUEVA COMPRA
   ============================================================ */
const createCompra = async (req, res) => {
    const { id_proveedor, fecha_compra, num_factura, estado, notas } = req.body;

    if (!id_proveedor || !fecha_compra) {
        return res.status(400).json({
            success: false,
            message: "El proveedor y la fecha de compra son obligatorios"
        });
    }

    try {
        const sql = `
            INSERT INTO compras 
            (id_proveedor, fecha_compra, num_factura, estado, notas)
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            id_proveedor,
            fecha_compra,
            num_factura || null,
            estado || "recibido",
            notas || null
        ]);

        res.status(201).json({
            success: true,
            message: "Compra registrada correctamente",
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error("Error al crear compra:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   📌 4. ACTUALIZAR UNA COMPRA
   ============================================================ */
const updateCompra = async (req, res) => {
    const { id } = req.params;
    const { id_proveedor, fecha_compra, num_factura, estado, notas } = req.body;

    try {
        const sql = `
            UPDATE compras
            SET id_proveedor = ?, fecha_compra = ?, num_factura = ?, estado = ?, notas = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            id_proveedor,
            fecha_compra,
            num_factura || null,
            estado,
            notas || null,
            id
        ]);

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Compra no encontrada" });

        res.json({ success: true, message: "Compra actualizada correctamente" });

    } catch (error) {
        console.error("Error al actualizar compra:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   📌 5. ELIMINAR UNA COMPRA
   ============================================================ */
const deleteCompra = async (req, res) => {
    const { id } = req.params;

    try {
        // Si tiene productos asociados → ERROR
        const [related] = await pool.query(
            "SELECT id FROM productos WHERE id_compra = ?",
            [id]
        );

        if (related.length > 0) {
            return res.status(400).json({
                success: false,
                message: "No se puede eliminar. La compra tiene productos asociados."
            });
        }

        const [result] = await pool.query("DELETE FROM compras WHERE id = ?", [id]);

        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: "Compra no encontrada" });

        res.json({ success: true, message: "Compra eliminada correctamente" });

    } catch (error) {
        console.error("Error al eliminar compra:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllCompras,
    getCompraById,
    createCompra,
    updateCompra,
    deleteCompra
};
