const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

const {
    getDetallesByVenta,
    addDetalleVenta,
    deleteDetalleVenta
} = require("../controllers/ventasDetalleController");

// ================================
//   RUTAS DETALLE DE VENTA
//   Base: /api/ventas-detalle
// ================================

// Obtener detalles de una venta
router.get("/venta/:id_venta", auth, getDetallesByVenta);

// Agregar un producto a una venta
router.post("/", auth, addDetalleVenta);

// Eliminar un detalle de venta
router.delete("/detalle/:id_detalle", auth, deleteDetalleVenta);

module.exports = router;
