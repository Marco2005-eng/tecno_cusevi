// routes/configuracionRoutes.js
const express = require("express");
const router = express.Router();

const {
    obtenerConfiguracion,
    actualizarConfiguracion,
    backupBaseDatos
} = require("../controllers/configuracionController");

// Middleware opcional
// const auth = require("../middlewares/authMiddleware");

// GET: obtener configuración
router.get("/", obtenerConfiguracion);

// PUT: actualizar configuración
router.put("/", actualizarConfiguracion);

// Backup (opcional)
router.get("/backup", backupBaseDatos);

module.exports = router;
