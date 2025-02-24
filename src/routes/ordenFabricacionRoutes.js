const express = require('express');
const ordenFabricacionController = require('../controllers/ordenFabricacionController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para órdenes de fabricación
router.post('/', ordenFabricacionController.crear);
router.get('/:id', ordenFabricacionController.obtenerPorId);
router.get('/', ordenFabricacionController.listar);
router.patch('/:id/estado', ordenFabricacionController.actualizarEstado);

module.exports = router;