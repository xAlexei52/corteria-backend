// src/routes/inventoryRoutes.js
const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para el inventario
router.get('/', inventoryController.listInventory);
router.get('/products/summary/:city', inventoryController.getProductInventorySummaryByCity);
router.post('/transfer', inventoryController.transferInventory);

module.exports = router;