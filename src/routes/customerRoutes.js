// src/routes/customerRoutes.js
const express = require('express');
const customerController = require('../controllers/customerController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para clientes
router.post('/', customerController.createCustomer);
router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', customerController.updateCustomer);

// Rutas para documentos de clientes
router.post('/:id/documents', customerController.addCustomerDocument);
router.delete('/:customerId/documents/:documentId', customerController.deleteCustomerDocument);
router.get('/documents/:documentId/download', customerController.downloadDocument);

// Rutas para información financiera y ventas
router.get('/:id/sales', customerController.getCustomerSales);
router.get('/:id/financial-summary', customerController.getCustomerFinancialSummary);
router.get('/:id/check-debt', customerController.checkCustomerDebt);

module.exports = router;