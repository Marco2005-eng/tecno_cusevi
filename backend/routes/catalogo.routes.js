const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ===============================
// AJUSTAR STOCK
// ===============================
router.post("/ajustar-stock/:id", async (req, res) => {
    const catalogoId = req.params.id;
    const { tipo, cantidad, motivo } = req.body;

    if (!tipo || !cantidad) {
        return res.status(400).json({ message: "Datos incompletos" });
    }

    try {
        // Obtener registro actual del catálogo
        const [rows] = await db.execute("SELECT * FROM catalogo WHERE id = ?", [catalogoId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        const producto = rows[0];
        let nuevoStock = producto.stock_disponible;

        // Procesar ajuste
        if (tipo === "add") {
            nuevoStock += cantidad;
        } else if (tipo === "remove") {
            nuevoStock -= cantidad;
            if (nuevoStock < 0) nuevoStock = 0;
        } else if (tipo === "set") {
            nuevoStock = cantidad;
        } else {
            return res.status(400).json({ message: "Tipo de ajuste no válido" });
        }

        // Actualizar stock en la tabla catalogo
        await db.execute(
            "UPDATE catalogo SET stock_disponible = ? WHERE id = ?",
            [nuevoStock, catalogoId]
        );

        // Registrar movimiento en el cardex
        await db.execute(
            `INSERT INTO cardex (catalogo_id, tipo, cantidad, stock_resultante, motivo, fecha)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [catalogoId, tipo, cantidad, nuevoStock, motivo]
        );

        // Crear alerta si corresponde
        if (nuevoStock === 0) {
            await registrarAlerta("stock", `Producto SIN STOCK: ${producto.nombre_venta}`);
        } else if (nuevoStock <= 3) {
            await registrarAlerta("stock", `Stock bajo: ${producto.nombre_venta}`);
        }

        res.json({
            message: "Stock ajustado correctamente",
            nuevoStock
        });

    } catch (error) {
        console.error("Error ajustando stock:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// Función para registrar alertas
async function registrarAlerta(tipo, mensaje) {
    try {
        await db.execute(
            "INSERT INTO alertas (tipo, mensaje, fecha) VALUES (?, ?, NOW())",
            [tipo, mensaje]
        );
    } catch (err) {
        console.warn("No se pudo registrar alerta:", err);
    }
}

module.exports = router;
