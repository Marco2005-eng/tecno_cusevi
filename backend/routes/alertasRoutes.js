const express = require("express");
const router = express.Router();

const {
    getAlertas,
    crearAlerta,
    marcarLeida,
    marcarTodasLeidas,
    borrarAlerta
} = require("../controllers/alertasController");


router.get("/", getAlertas);


router.post("/", async (req, res) => {
    const result = await crearAlerta(req.body);
    res.json(result);
});


router.put("/leer/:id", marcarLeida);


router.put("/leer-todo", marcarTodasLeidas);


router.delete("/:id", borrarAlerta);

module.exports = router;
