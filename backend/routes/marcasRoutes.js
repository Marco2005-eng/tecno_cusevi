// routes/marcasRoutes.js
const express = require('express');
const router = express.Router();

const {
    getAllMarcas,
    getMarcaById,
    createMarca,
    updateMarca,
    deleteMarca
} = require('../controllers/marcasController');

// Rutas base: /api/marcas
router.get('/', getAllMarcas);
router.get('/:id', getMarcaById);
router.post('/', createMarca);
router.put('/:id', updateMarca);
router.delete('/:id', deleteMarca);

module.exports = router;
