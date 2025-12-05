const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
    getAllCompras,
    getCompraById,
    createCompra,
    updateCompra,
    deleteCompra
} = require("../controllers/comprasController");

// Todas protegidas por autenticación
router.get("/", auth, getAllCompras);
router.get("/:id", auth, getCompraById);
router.post("/", auth, createCompra);
router.put("/:id", auth, updateCompra);
router.delete("/:id", auth, deleteCompra);

module.exports = router;
