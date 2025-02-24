// src/routes/usuarioRoutes.js
const express = require('express');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

// Ruta para registrar un usuario
router.post('/registro', usuarioController.registrar);

// Ruta para iniciar sesión
router.post('/login', usuarioController.login);

// Rutas para recuperación de contraseña
router.post('/olvido-password', usuarioController.olvidoPassword);
router.post('/reset-password/:token', usuarioController.resetPassword);

module.exports = router;