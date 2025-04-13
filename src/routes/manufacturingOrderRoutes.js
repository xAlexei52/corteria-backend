// src/routes/manufacturingOrderRoutes.js
const express = require('express');
const manufacturingOrderController = require('../controllers/manufacturingOrderController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para análisis y reportes
router.get('/analysis/products', manufacturingOrderController.getProductExpenseAnalysis);

// Rutas para insumos y productos procesados
router.delete('/inputs/:inputId', manufacturingOrderController.removeProductionInput);
router.delete('/processed-products/:productId', manufacturingOrderController.removeProcessedProduct);
router.put('/stages/:stageId', manufacturingOrderController.updateProductionStage);

// Rutas CRUD principales para órdenes
router.post('/', manufacturingOrderController.createOrder);
router.get('/', manufacturingOrderController.listOrders);
router.get('/:id', manufacturingOrderController.getOrderById);
router.delete('/:id', manufacturingOrderController.deleteOrder);

// Rutas para gestión del estado de la orden
router.patch('/:id/status', manufacturingOrderController.updateOrderStatus);

// Rutas para cálculos y reportes de una orden específica
router.get('/:id/costs', manufacturingOrderController.calculateTotalCosts);
router.get('/:id/profitability', manufacturingOrderController.getOrderProfitability);

// Rutas para gestión de componentes de una orden específica
router.post('/:id/inputs', manufacturingOrderController.addProductionInput);
router.post('/:id/stages', manufacturingOrderController.createProductionStage);
router.post('/:id/processed-products', manufacturingOrderController.addProcessedProduct);

module.exports = router;