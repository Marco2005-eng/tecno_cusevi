const express = require("express");
const router = express.Router();

const {
    ventasHoy,
    pedidosHoy,
    stockBajo,
    nuevosClientes
} = require("../controllers/reportesController");

router.get("/ventas-hoy", ventasHoy);
router.get("/pedidos-hoy", pedidosHoy);
router.get("/stock-bajo", stockBajo);
router.get("/nuevos-clientes", nuevosClientes);

module.exports = router;
