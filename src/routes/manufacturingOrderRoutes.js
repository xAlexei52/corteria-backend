// src/routes/manufacturingOrderRoutes.js (modificado)
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

// Nuevas rutas para manejar insumos, gastos y subproductos
router.post('/:id/expenses', manufacturingOrderController.addOrderExpenses);
router.post('/:id/subproducts', manufacturingOrderController.addOrderSubproducts);
router.post('/:id/calculate', manufacturingOrderController.calculateOrderCosts);

module.exports = router;