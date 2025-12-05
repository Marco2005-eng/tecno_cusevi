const express = require('express');
const router = express.Router();

const {
    getAllClientes,
    getClienteById,
    getClienteByEmail,
    createCliente,
    updateCliente,
    deleteCliente,
    saveOrUpdateByEmail
} = require("../controllers/clientesController");

router.get('/', getAllClientes);
router.get('/:id', getClienteById);
router.get("/email/:email", getClienteByEmail);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);
router.post("/save-profile", saveOrUpdateByEmail);

module.exports = router;
