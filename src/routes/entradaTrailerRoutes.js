// src/routes/entradaTrailerRoutes.js
const express = require('express');
const entradaTrailerController = require('../controllers/entradaTrailerController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas básicas CRUD
router.post('/', entradaTrailerController.crear);
router.get('/:id', entradaTrailerController.obtenerPorId);
router.get('/', entradaTrailerController.listar);
router.patch('/:id/estado', entradaTrailerController.actualizarEstado);

// Ruta para estadísticas
router.get('/estadisticas/resumen', entradaTrailerController.obtenerEstadisticas);

module.exports = router;