// routes/proveedoresRoutes.js
const express = require('express');
const router = express.Router();

const {
    getAllProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor
} = require('../controllers/proveedoresController');

// Rutas base: /api/proveedores
router.get('/', getAllProveedores);
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.delete('/:id', deleteProveedor);

module.exports = router;
