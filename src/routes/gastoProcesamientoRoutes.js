// src/routes/gastoProcesamientoRoutes.js
const express = require('express');
const gastoProcesamientoController = require('../controllers/gastoProcesamientoController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas principales
router.post('/registrar-automatico', gastoProcesamientoController.registrarGastosAutomaticos);
router.get('/:ordenId/resumen', gastoProcesamientoController.obtenerResumenGastos);

module.exports = router;