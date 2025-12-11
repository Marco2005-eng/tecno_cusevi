const mysql = require("mysql2/promise");
require("dotenv").config();

// Mostrar configuración usada (sin exponer password)
console.log("=====================================");
console.log("📡 Conectando a MySQL...");
console.log("➡ Host:", process.env.DB_HOST);
console.log("➡ Base:", process.env.DB_NAME);
console.log("➡ Puerto:", process.env.DB_PORT);
console.log("=====================================");

// Crear pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,        // Siempre el proxy externo
    port: process.env.DB_PORT,        // Puerto externo (44108)
    user: process.env.DB_USER,        // root
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
