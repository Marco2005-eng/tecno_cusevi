const pool = require("../config/database");

/**
 * Registrar movimiento en KARDEX
 * 
 * @param {Object} data
 * @param {Number} data.id_producto
 * @param {String} data.tipo_movimiento  // entrada | salida
 * @param {Number} data.cantidad
 * @param {Number} data.stock_resultante
 * @param {String} data.detalle
 * @param {String} data.tipo_referencia  // venta | compra | ajuste | pedido
 * @param {Number} data.id_referencia
 * @param {Number} data.id_usuario
 * @param {Object} data.conn  // conexión opcional (para transacciones)
 */
async function registrarMovimientoKardex(data) {
    const {
        id_producto,
        tipo_movimiento,
        cantidad,
        stock_resultante,
        detalle,
        tipo_referencia,
        id_referencia,
        id_usuario = null,
        conn = null
    } = data;

    const executor = conn || pool; // usa transacción o conexión normal

    try {
        await executor.query(
            `
            INSERT INTO cardex 
            (id_producto, tipo_movimiento, cantidad, stock_resultante, detalle, tipo_referencia, id_referencia, id_usuario)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            [
                id_producto,
                tipo_movimiento,
                cantidad,
                stock_resultante,
                detalle,
                tipo_referencia,
                id_referencia,
                id_usuario
            ]
        );

        return true;

    } catch (error) {
        console.error("Error registrando movimiento en KARDEX:", error);
        throw error;
    }
}

module.exports = { registrarMovimientoKardex };
