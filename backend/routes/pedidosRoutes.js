// ============================================================
// 📦 RUTAS DE PEDIDOS — COMPATIBLE CON CLOUDINARY & RENDER
// ============================================================

const express = require("express");
const router = express.Router();

// ============================================================
// 📁 MULTER + CLOUDINARY (subida de comprobantes)
// ============================================================

const upload = require("../utils/multerCloudinary");

// ============================================================
// 🧠 CONTROLADORES
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
// 📌 RUTAS CLIENTE
// ============================================================

// Crear un pedido simulado (checkout sin pago aún)
router.post("/simular", createPedidoSimulado);

// Obtener pedidos del cliente
router.get("/cliente/:id_cliente", getPedidosByCliente);

// Obtener estado actual del pedido
router.get("/:id/estado", getEstadoActual);

// Cliente sube comprobante de Cloudinary
router.put(
    "/:id/cliente-confirmar",
    upload.single("comprobante"), // <--- Archivo enviado
    clienteConfirmaPago
);


// ============================================================
// 📌 RUTAS ADMIN
// ============================================================

// 🟦 Historial del pedido (IMPORTANTE: antes que /:id)
router.get("/:id/historial", getHistorial);

// 🟦 Registrar seguimiento de pedido
router.post("/:id/seguimiento", crearSeguimiento);

// 🟦 Confirmar pago → genera la venta + resta stock
router.put("/:id/confirmar", adminConfirmaPago);

// 🟦 Cancelar un pedido
router.put("/:id/cancelar", cancelarPedido);

// 🟦 Obtener un pedido por ID (detalles + items + estado)
router.get("/:id", getPedidoById);

// 🟦 Listar TODOS los pedidos
router.get("/", getAllPedidos);


// ============================================================
// EXPORTAR RUTAS
// ============================================================

module.exports = router;
