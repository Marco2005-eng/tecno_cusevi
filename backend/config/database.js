const mysql = require('mysql2/promise');
require('dotenv').config();

// Elegir host correcto automáticamente
let host = process.env.DB_HOST;

// Render SIEMPRE debe usar el host interno privado de Railway
if (process.env.RENDER === "true") {
    host = "mysql.railway.internal";
}

// Mostrar configuración usada (sin mostrar password)
console.log("=====================================");
console.log("📡 Conectando a MySQL...");
console.log("➡ Host:", host);
console.log("➡ Base de datos:", process.env.DB_NAME);
console.log("➡ Puerto:", process.env.DB_PORT);
console.log("=====================================");

// Crear pool de conexiones
const pool = mysql.createPool({
    host,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
