// src/routes/companyExpenseRoutes.js
const express = require('express');
const companyExpenseController = require('../controllers/companyExpenseController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para gastos de la empresa
router.post('/', companyExpenseController.createExpense);
router.get('/', companyExpenseController.listExpenses);
router.get('/statistics', companyExpenseController.getStatistics);
router.get('/:id', companyExpenseController.getExpenseById);
router.put('/:id', companyExpenseController.updateExpense);
router.delete('/:id', companyExpenseController.deleteExpense);
router.get('/:id/download', companyExpenseController.downloadFile);

module.exports = router;