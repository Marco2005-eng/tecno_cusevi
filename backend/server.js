const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ============================================================
//  BASE_URL DINÁMICO (NGROK / RENDER / LOCAL)
// ============================================================
global.BASE_URL = "";
global.PUBLIC_URL = process.env.PUBLIC_URL || "";

// ============================================================
//  SOCKET.IO
// ============================================================
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }
});

module.exports.io = io;

io.on("connection", (socket) => {
    console.log("🔵 Cliente conectado:", socket.id);
    socket.on("disconnect", () => console.log("🔴 Cliente desconectado:", socket.id));
});

// ============================================================
//  MIDDLEWARE BASE_URL
// ============================================================
app.use((req, res, next) => {
    global.BASE_URL = `${req.protocol}://${req.get('host')}`;
    next();
});

// ============================================================
//  CONFIGURACIONES GENERALES
// ============================================================
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ============================================================
//  ARCHIVOS ESTÁTICOS
// ============================================================

// Public (Frontend tienda y admin)
app.use(express.static(path.join(__dirname, '../public')));

// Uploads (⚠ Render los borra al reiniciar)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
//  RUTAS API
// ============================================================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/marcas', require('./routes/marcasRoutes'));
app.use('/api/proveedores', require('./routes/proveedoresRoutes'));
app.use('/api/compras', require('./routes/comprasRoutes'));
app.use('/api/productos', require('./routes/productosRoutes'));
app.use('/api/catalogo', require('./routes/catalogoRoutes'));
app.use('/api/categorias', require('./routes/categoriasRoutes'));
app.use('/api/clientes', require('./routes/clientesRoutes'));
app.use('/api/pedidos', require('./routes/pedidosRoutes'));
app.use('/api/ventas', require('./routes/ventasRoutes'));
app.use('/api/ventas-detalle', require('./routes/ventasDetalleRoutes'));
app.use('/api/ofertas', require('./routes/ofertasRoutes'));
app.use('/api/cardex', require('./routes/cardexRoutes'));
app.use('/api/alertas', require('./routes/alertasRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/reportes', require('./routes/reportesRoutes'));
app.use('/api/reportes-analitica', require('./routes/reportesAnaliticaRoutes'));
app.use('/api/config', require('./routes/configPublicRoutes'));
app.use('/api/configuracion', require('./routes/configuracionRoutes'));
app.use('/api/catalogo-public', require('./routes/catalogoPublicRoutes'));

// ============================================================
//  SERVER LISTEN
// ============================================================
server.listen(PORT, () => {
    console.log("=====================================");
    console.log(`🚀 Servidor API encendido en puerto ${PORT}`);

    console.log("📂 PUBLIC_URL:", PUBLIC_URL || "(no definido)");
    console.log("📡 BASE_URL (dinámico): se actualiza por request");

    console.log("-------------------------------------");
    console.log("🔧 Base de Datos");
    console.log("➡ Host:", process.env.DB_HOST);
    console.log("➡ Base:", process.env.DB_NAME);
    console.log("➡ Puerto:", process.env.DB_PORT);
    console.log("=====================================");

    console.log("📡 WebSocket listo para alertas en tiempo real");
});
