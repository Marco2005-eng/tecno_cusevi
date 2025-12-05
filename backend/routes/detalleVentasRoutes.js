// routes/detalleVentasRoutes.js
const express = require('express');
const router = express.Router();

const {
    getDetallesByVenta,
    addDetalleVenta,
    updateDetalleVenta,
    deleteDetalleVenta
} = require('../controllers/detalleVentasController');

// Rutas base: /api/detalle-ventas
router.get('/:id_venta', getDetallesByVenta);
router.post('/', addDetalleVenta);
router.put('/:id', updateDetalleVenta);
router.delete('/:id', deleteDetalleVenta);

module.exports = router;
