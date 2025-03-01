// src/routes/fixedExpenseRoutes.js
const express = require('express');
const fixedExpenseController = require('../controllers/fixedExpenseController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para gastos fijos
router.post('/', fixedExpenseController.createFixedExpense);
router.get('/', fixedExpenseController.listFixedExpenses);
router.get('/:id', fixedExpenseController.getFixedExpenseById);
router.put('/:id', fixedExpenseController.updateFixedExpense);

// Ruta para obtener el costo diario total por ciudad
router.get('/total-daily-cost/:city', fixedExpenseController.getTotalDailyCost);

module.exports = router;