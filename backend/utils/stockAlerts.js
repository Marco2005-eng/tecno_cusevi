const pool = require("../config/database");
const { crearAlerta } = require("../controllers/alertasController");

// Nivel de stock considerado “bajo”
const MIN_STOCK = 3;

async function verificarStockBajo(id_producto) {
    try {
        // Obtener datos del producto
        const [[producto]] = await pool.query(`
            SELECT id, nombre, cantidad_disponible
            FROM productos
            WHERE id = ?
        `, [id_producto]);

        if (!producto) return;

        // Si no es stock bajo → no hacer nada
        if (producto.cantidad_disponible > MIN_STOCK) return;

        // Verificar si ya existe alerta activa sin leer
        const [[alertaExistente]] = await pool.query(`
            SELECT id FROM alertas
            WHERE tipo = 'stock'
              AND id_referencia = ?
              AND leida = 0
            LIMIT 1
        `, [producto.id]);

        // Ya existe → no duplicamos
        if (alertaExistente) return;

        // Crear alerta automática
        await crearAlerta(
            "stock",
            `Stock bajo: ${producto.nombre}`,
            `El producto '${producto.nombre}' tiene solo ${producto.cantidad_disponible} unidades.`,
            producto.id
        );

    } catch (error) {
        console.log("Error verificando stock bajo:", error);
    }
}

module.exports = { verificarStockBajo, MIN_STOCK };
