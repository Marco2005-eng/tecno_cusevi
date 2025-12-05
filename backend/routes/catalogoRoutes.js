const express = require('express');
const router = express.Router();

const {
    getAllCatalogo,
    getProductosForCatalogo,
    getCatalogoById,
    createCatalogoItem,
    updateCatalogoItem,
    deleteCatalogoItem
} = require('../controllers/catalogoController');

// Catálogo
router.get('/', getAllCatalogo);
router.get('/for-form', getProductosForCatalogo);
router.get('/:id', getCatalogoById);
router.post('/', createCatalogoItem);
router.put('/:id', updateCatalogoItem);
router.delete('/:id', deleteCatalogoItem);

module.exports = router;
