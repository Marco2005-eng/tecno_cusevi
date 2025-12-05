// routes/detallePedidosRoutes.js
const express = require('express');
const router = express.Router();

const {
    getDetallesByPedido,
    addDetalle,
    updateDetalle,
    deleteDetalle
} = require('../controllers/detallePedidosController');

// Rutas base: /api/detalle-pedidos
router.get('/:id_pedido', getDetallesByPedido); // obtener todos los detalles de un pedido
router.post('/', addDetalle);                  // agregar producto
router.put('/:id', updateDetalle);             // actualizar un detalle
router.delete('/:id', deleteDetalle);          // eliminar un detalle
router.get("/:idPedido", getDetalleByPedido);

module.exports = router;
