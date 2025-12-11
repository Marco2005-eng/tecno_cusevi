const express = require("express");
const router = express.Router();

const {
    getAlertas,
    crearAlerta,
    marcarLeida,
    marcarTodasLeidas,
    borrarAlerta
} = require("../controllers/alertasController");

// Obtener todas las alertas
router.get("/", getAlertas);

// Crear una alerta manualmente
router.post("/", async (req, res) => {
    const result = await crearAlerta(req.body);
    res.json(result);
});

// Marcar una alerta como leída
router.put("/:id/leida", marcarLeida);

// Marcar TODAS como leídas
router.put("/leida/todas", marcarTodasLeidas);

// Borrar una alerta
router.delete("/:id", borrarAlerta);

module.exports = router;
