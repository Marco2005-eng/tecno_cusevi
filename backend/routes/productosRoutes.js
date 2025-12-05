// routes/productosRoutes.js
const express = require('express');
const router = express.Router();

const {
    getAllProductos,
    getProductosDisponibles,
    getProductoById,
    createProducto,
    updateProducto,
    deleteProducto
} = require('../controllers/productosController');

// Rutas base: /api/productos
router.get('/', getAllProductos);
router.get('/disponibles', getProductosDisponibles);
router.get('/:id', getProductoById);
router.post('/', createProducto);
router.put('/:id', updateProducto);
router.delete('/:id', deleteProducto);

module.exports = router;
