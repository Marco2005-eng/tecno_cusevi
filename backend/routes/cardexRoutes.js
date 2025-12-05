const express = require("express");
const router = express.Router();

const { getKardexByProducto } = require("../controllers/cardexController");

// GET /api/cardex/:id_producto
router.get("/:id_producto", getKardexByProducto);

module.exports = router;
