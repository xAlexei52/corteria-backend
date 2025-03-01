// src/routes/supplyRoutes.js
const express = require('express');
const supplyController = require('../controllers/supplyController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para insumos
router.post('/', supplyController.createSupply);
router.get('/', supplyController.listSupplies);
router.get('/:id', supplyController.getSupplyById);
router.put('/:id', supplyController.updateSupply);

module.exports = router;