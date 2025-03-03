// src/routes/saleRoutes.js
const express = require('express');
const saleController = require('../controllers/saleController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para ventas
router.post('/', saleController.createSale);
router.get('/', saleController.listSales);
router.get('/stats', saleController.getSalesStats);
router.get('/:id', saleController.getSaleById);
router.patch('/:id/cancel', saleController.cancelSale);
router.post('/:id/payments', saleController.registerPayment);

module.exports = router;