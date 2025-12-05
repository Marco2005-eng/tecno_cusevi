const pool = require('../config/database');
const { crearAlerta } = require("../utils/alertas");
const { verificarStockBajo } = require("../utils/stockAlerts");

/* ============================================================
   🔹 OBTENER TODOS LOS PRODUCTOS
============================================================ */
const getAllProductos = async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.*,
                m.nombre AS marca_nombre,
                pr.nombre_empresa AS proveedor_nombre,
                c.num_factura AS factura_compra
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id
            JOIN proveedores pr ON p.id_proveedor = pr.id
            JOIN compras c ON p.id_compra = c.id
            ORDER BY p.fecha_creacion DESC
        `;

        const [rows] = await pool.query(sql);

        rows.forEach(p => {
            p.precio_compra = Number(p.precio_compra);
            p.cantidad_comprada = Number(p.cantidad_comprada);
            p.cantidad_disponible = Number(p.cantidad_disponible);
        });

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   🔹 PRODUCTOS ACTIVOS
============================================================ */
const getProductosDisponibles = async (req, res) => {
    try {
        const sql = `
            SELECT p.id, p.nombre, p.cantidad_disponible, m.nombre AS marca
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id
            WHERE p.activo = 1
            ORDER BY p.nombre ASC
        `;

        const [rows] = await pool.query(sql);

        rows.forEach(p => {
            p.cantidad_disponible = Number(p.cantidad_disponible);
        });

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Error al obtener productos disponibles:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   🔹 OBTENER PRODUCTO POR ID
============================================================ */
const getProductoById = async (req, res) => {
    const { id } = req.params;

    try {
        const sql = `
            SELECT 
                p.*,
                m.nombre AS marca_nombre,
                pr.nombre_empresa AS proveedor_nombre,
                c.num_factura AS factura_compra
            FROM productos p
            JOIN marcas m ON p.id_marca = m.id
            JOIN proveedores pr ON p.id_proveedor = pr.id
            JOIN compras c ON p.id_compra = c.id
            WHERE p.id = ?
        `;

        const [rows] = await pool.query(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Producto no encontrado" });
        }

        const p = rows[0];

        p.precio_compra = Number(p.precio_compra);
        p.cantidad_comprada = Number(p.cantidad_comprada);
        p.cantidad_disponible = Number(p.cantidad_disponible);

        res.json({ success: true, data: p });

    } catch (error) {
        console.error("Error al obtener producto:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   🔹 CREAR PRODUCTO + ALERTA STOCK
============================================================ */
const createProducto = async (req, res) => {
    const {
        id_compra,
        id_proveedor,
        id_marca,
        nombre,
        sku,
        cantidad_comprada,
        cantidad_disponible,
        precio_compra,
        fecha_compra,
        notas
    } = req.body;

    if (!id_compra || !id_proveedor || !id_marca || !nombre || !precio_compra || !fecha_compra) {
        return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
    }

    try {
        const sql = `
            INSERT INTO productos (
                id_compra, id_proveedor, id_marca, nombre, sku,
                cantidad_comprada, cantidad_disponible, precio_compra,
                fecha_compra, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            id_compra,
            id_proveedor,
            id_marca,
            nombre,
            sku || null,
            cantidad_comprada || 0,
            cantidad_disponible || 0,
            precio_compra,
            fecha_compra,
            notas || null
        ]);

        const newId = result.insertId;

        // 🔥 Verificar stock bajo automáticamente
        await verificarStockBajo(newId);

        // 🔔 Alerta nueva creación
        await crearAlerta(
            "sistema",
            "Nuevo producto agregado",
            `Se registró el producto: ${nombre}`,
            newId
        );

        res.status(201).json({
            success: true,
            message: "Producto creado correctamente",
            data: { id: newId }
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ success: false, message: "El SKU ya existe" });
        }

        console.error("Error al crear producto:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   🔹 ACTUALIZAR PRODUCTO + ALERTA STOCK
============================================================ */
const updateProducto = async (req, res) => {
    const { id } = req.params;

    const {
        id_marca,
        id_proveedor,
        nombre,
        sku,
        precio_compra,
        cantidad_comprada,
        cantidad_disponible,
        notas,
        activo
    } = req.body;

    try {
        const sql = `
            UPDATE productos
            SET id_marca = ?, id_proveedor = ?, nombre = ?, sku = ?,
                precio_compra = ?, cantidad_comprada = ?, cantidad_disponible = ?,
                notas = ?, activo = ?
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            id_marca,
            id_proveedor,
            nombre,
            sku || null,
            precio_compra,
            cantidad_comprada,
            cantidad_disponible,
            notas || null,
            activo !== undefined ? activo : 1,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Producto no encontrado" });
        }

        // 🔥 Verificación de stock bajo al actualizar
        await verificarStockBajo(id);

        // 🔔 Alerta por actualización
        await crearAlerta(
            "sistema",
            `Producto actualizado`,
            `El producto ${nombre} fue modificado.`,
            id
        );

        res.json({ success: true, message: "Producto actualizado correctamente" });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ success: false, message: "El SKU ya está en uso" });
        }

        console.error("Error al actualizar producto:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

/* ============================================================
   🔹 ELIMINAR PRODUCTO + ALERTA
============================================================ */
const deleteProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [[p]] = await pool.query("SELECT nombre FROM productos WHERE id=?", [id]);

        const [result] = await pool.query("DELETE FROM productos WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Producto no encontrado" });
        }

        // 🔔 Alerta de eliminación
        await crearAlerta(
            "sistema",
            "Producto eliminado",
            `El producto ${p?.nombre || id} fue removido del inventario.`,
            id
        );

        res.json({ success: true, message: "Producto eliminado correctamente" });

    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(400).json({
                success: false,
                message: "No se puede eliminar el producto porque tiene ventas o movimientos asociados"
            });
        }

        console.error("Error al eliminar producto:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = {
    getAllProductos,
    getProductosDisponibles,
    getProductoById,
    createProducto,
    updateProducto,
    deleteProducto
};
