    const express = require("express");
    const router = express.Router();

    const {
        getAllUsuarios,
        getUsuarioById,
        createUsuario,
        updateUsuario,
        toggleEstadoUsuario,
        deleteUsuario
    } = require("../controllers/usuariosController");

    router.get("/", getAllUsuarios);
    router.get("/:id", getUsuarioById);
    router.post("/", createUsuario);
    router.put("/:id", updateUsuario);
    router.patch("/:id/estado", toggleEstadoUsuario);  
    router.delete("/:id", deleteUsuario);

    module.exports = router;
