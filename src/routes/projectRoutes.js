// Actualización del archivo src/routes/projectRoutes.js
const express = require('express');
const projectController = require('../controllers/projectController');
const projectExpenseController = require('../controllers/projectExpenseController');
const projectIncomeController = require('../controllers/projectIncomeController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para proyectos
router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.patch('/:id/status', projectController.updateProjectStatus);

// Ruta para el resumen financiero
router.get('/:id/financial-summary', projectController.getProjectFinancialSummary);

// Rutas para gastos específicos
router.get('/expenses/:id', projectExpenseController.getExpenseById);
router.put('/expenses/:id', projectExpenseController.updateExpense);
router.delete('/expenses/:id', projectExpenseController.deleteExpense);

// Rutas para gastos de un proyecto específico
router.post('/:projectId/expenses', projectExpenseController.createExpense);
router.get('/:projectId/expenses', projectExpenseController.listExpenses);

// Rutas para ingresos específicos
router.get('/incomes/:id', projectIncomeController.getIncomeById);
router.put('/incomes/:id', projectIncomeController.updateIncome);
router.delete('/incomes/:id', projectIncomeController.deleteIncome);

// Rutas para ingresos de un proyecto específico
router.post('/:projectId/incomes', projectIncomeController.createIncome);
router.get('/:projectId/incomes', projectIncomeController.listIncomes);

module.exports = router;