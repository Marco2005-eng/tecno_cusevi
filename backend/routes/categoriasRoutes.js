// backend/routes/categoriasRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllCategorias,
    getCategoriaById,
    createCategoria,
    updateCategoria,
    deleteCategoria
} = require('../controllers/categoriasController');

router.get('/', getAllCategorias);        
router.get('/:id', getCategoriaById);     
router.post('/', createCategoria);        
router.put('/:id', updateCategoria);      
router.delete('/:id', deleteCategoria);    

module.exports = router;