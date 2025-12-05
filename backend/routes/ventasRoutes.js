// routes/ventasRoutes.js
const express = require('express');
const router = express.Router();

const {
    getAllVentas,
    getVentaById,
    createVenta,
    updateVenta,
    deleteVenta
} = require('../controllers/ventasController');

// Base: /api/ventas

// Listar todas las ventas
router.get('/', getAllVentas);

// Obtener una venta por ID
router.get('/:id', getVentaById);

// Crear una venta (con items, ofertas, stock, kardex)
router.post('/', createVenta);

// Actualizar datos de una venta (cabecera)
router.put('/:id', updateVenta);

// Eliminar una venta
router.delete('/:id', deleteVenta);

module.exports = router;
