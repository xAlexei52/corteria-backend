// src/routes/projectExpenseRoutes.js
const express = require('express');
const projectExpenseController = require('../controllers/projectExpenseController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para gastos específicos
router.get('/expenses/:id', projectExpenseController.getExpenseById);
router.put('/expenses/:id', projectExpenseController.updateExpense);
router.delete('/expenses/:id', projectExpenseController.deleteExpense);

// Rutas para gastos de un proyecto específico
router.post('/:projectId/expenses', projectExpenseController.createExpense);
router.get('/:projectId/expenses', projectExpenseController.listExpenses);

module.exports = router;