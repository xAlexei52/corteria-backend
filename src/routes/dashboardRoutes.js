// src/routes/dashboardRoutes.js
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas para el dashboard
router.get('/', dashboardController.getDashboardSummary);
router.get('/current-month-sales', dashboardController.getCurrentMonthSales);
router.get('/sales-comparison', dashboardController.compareSalesWithPreviousMonth);
router.get('/recent-entries', dashboardController.getRecentTrailerEntries);
router.get('/recent-sales', dashboardController.getRecentSales);

module.exports = router;