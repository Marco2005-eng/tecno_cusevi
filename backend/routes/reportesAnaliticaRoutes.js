const express = require("express");
const router = express.Router();

const {
    getMetricas,
    getVentasTiempo,
    getTopProductos,
    getVentasCategorias,
    getDetalleVentas
} = require("../controllers/reportesAnaliticaController");

// MÉTRICAS
router.get("/metricas", getMetricas);

// GRÁFICOS
router.get("/ventas-tiempo", getVentasTiempo);
router.get("/top-productos", getTopProductos);
router.get("/ventas-categorias", getVentasCategorias);

// TABLA
router.get("/detalle", getDetalleVentas);

module.exports = router;
