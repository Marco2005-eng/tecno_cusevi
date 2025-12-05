const express = require("express");
const router = express.Router();

const {
    getResumenGeneral,
    getMovimientos,
    registrarManual,
    getGraficoMensual,
    getGraficoSemanal,
    getGraficoAnualDetallado
} = require("../controllers/finanzasController");


router.get("/resumen", getResumenGeneral);
router.get("/movimientos", getMovimientos);
router.post("/manual", registrarManual);
router.get("/grafico-mensual", getGraficoMensual);
router.get("/grafico-semanal", getGraficoSemanal);
router.get("/grafico-anual-detallado", getGraficoAnualDetallado);

module.exports = router;
