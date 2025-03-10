// src/routes/projectIncomeRoutes.js
const express = require('express');
const projectIncomeController = require('../controllers/projectIncomeController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para ingresos específicos
router.get('/incomes/:id', projectIncomeController.getIncomeById);
router.put('/incomes/:id', projectIncomeController.updateIncome);
router.delete('/incomes/:id', projectIncomeController.deleteIncome);

// Rutas para ingresos de un proyecto específico
router.post('/:projectId/incomes', projectIncomeController.createIncome);
router.get('/:projectId/incomes', projectIncomeController.listIncomes);

module.exports = router;