// src/routes/warehouseRoutes.js
const express = require('express');
const warehouseController = require('../controllers/warehouseController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para almacenes
router.post('/', warehouseController.createWarehouse);
router.get('/', warehouseController.listWarehouses);
router.get('/by-city/:cityId', warehouseController.getWarehousesByCity);
router.get('/main/:cityId', warehouseController.getMainWarehouseByCity);
router.get('/:id', warehouseController.getWarehouseById);
router.put('/:id', warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);

module.exports = router;