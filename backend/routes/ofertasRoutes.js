    // routes/ofertasRoutes.js
    const express = require('express');
    const router = express.Router();

    const {
        getAllOfertas,
        getOfertasActivas,
        getOfertaById,
        createOferta,
        updateOferta,
        deleteOferta
    } = require('../controllers/ofertasController');

    // Rutas base: /api/ofertas
    router.get('/', getAllOfertas);           // Todas
    router.get('/activas', getOfertasActivas); // Solo activas y vigentes
    router.get('/:id', getOfertaById);        // Una por ID
    router.post('/', createOferta);           // Crear
    router.put('/:id', updateOferta);         // Actualizar
    router.delete('/:id', deleteOferta);      // Desactivar

    module.exports = router;
