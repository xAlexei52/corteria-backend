// src/routes/manufacturingOrderRoutes.js
const express = require('express');
const manufacturingOrderController = require('../controllers/manufacturingOrderController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para órdenes de manufactura
router.post('/', manufacturingOrderController.createOrder);
router.get('/', manufacturingOrderController.listOrders);
router.get('/:id', manufacturingOrderController.getOrderById);
router.patch('/:id/status', manufacturingOrderController.updateOrderStatus);
router.delete('/:id', manufacturingOrderController.deleteOrder);

// Ruta para calcular gastos
router.post('/:id/calculate-expenses', manufacturingOrderController.calculateExpenses);

// Ruta para obtener rentabilidad de una orden
router.get('/:id/profitability', manufacturingOrderController.getOrderProfitability);

// Ruta para obtener análisis de gastos por producto
router.get('/analysis/products', manufacturingOrderController.getProductExpenseAnalysis);

module.exports = router;