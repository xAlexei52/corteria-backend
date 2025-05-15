// src/routes/cityRoutes.js
const express = require('express');
const cityController = require('../controllers/cityController');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para listar y obtener ciudades (accesibles para todos los usuarios)
router.get('/', cityController.listCities);
router.get('/:id', cityController.getCityById);

// Rutas de administración (solo para admin)
router.use(adminMiddleware);
router.post('/', cityController.createCity);
router.put('/:id', cityController.updateCity);
router.delete('/:id', cityController.deleteCity);

module.exports = router;