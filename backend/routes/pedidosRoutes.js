// ============================================================
//  📦 RUTAS DE PEDIDOS — CORREGIDAS Y OPTIMIZADAS
// ============================================================

const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");

// ============================================================
//  MULTER — COMPROBANTES
// ============================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/comprobantes/");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `comprobante_${Date.now()}${ext}`);
    }
});

function fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
        return cb(new Error("Formato no permitido. Solo JPG/PNG."));
    }
    cb(null, true);
}

const upload = multer({ storage, fileFilter });

// ============================================================
//  CONTROLADOR
// ============================================================
const { 
    getAllPedidos,
    getPedidoById,
    getPedidosByCliente,
    createPedidoSimulado,
    clienteConfirmaPago,
    adminConfirmaPago,
    cancelarPedido,
    crearSeguimiento,
    getHistorial,
    getEstadoActual
} = require("../controllers/pedidosController");


// ============================================================
//  📌 RUTAS CLIENTE
// ============================================================

// Crear un pedido (simulación)
router.post("/simular", createPedidoSimulado);

// Obtener pedidos del cliente
router.get("/cliente/:id_cliente", getPedidosByCliente);

// Obtener estado actual del pedido
router.get("/:id/estado", getEstadoActual);

// Cliente confirma pago con comprobante
router.put(
    "/:id/cliente-confirmar",
    upload.single("comprobante"),
    clienteConfirmaPago
);


// ============================================================
//  📌 RUTAS ADMIN
// ============================================================

// Historial del pedido (antes que /:id)
router.get("/:id/historial", getHistorial);

// Registrar seguimiento
router.post("/:id/seguimiento", crearSeguimiento);

// Confirmar pago → genera venta
router.put("/:id/confirmar", adminConfirmaPago);

// Cancelar pedido
router.put("/:id/cancelar", cancelarPedido);

// Obtener pedido por ID (última ruta dinámica)
router.get("/:id", getPedidoById);

// Listar todos los pedidos
router.get("/", getAllPedidos);


module.exports = router;
