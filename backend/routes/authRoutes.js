const express = require('express');
const router = express.Router();

const { register, login, validarToken } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Registro
router.post('/register', register);

// Login
router.post('/login', login);

// Validación de token
router.get('/validar', auth, validarToken);

module.exports = router;
