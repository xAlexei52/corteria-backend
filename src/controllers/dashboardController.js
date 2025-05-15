// src/controllers/dashboardController.js (actualizado)
const dashboardService = require('../services/dashboardService');

const dashboardController = {
  /**
   * Obtiene un resumen completo para el dashboard
   * @route GET /api/dashboard
   */
  async getDashboardSummary(req, res) {
    try {
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      // Solo admin puede ver datos de todas las ciudades
      const cityId = userRole === 'admin' ? (req.query.cityId || null) : userCityId;
      
      const summary = await dashboardService.getDashboardSummary(cityId);
      
      res.status(200).json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('Dashboard summary error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard summary',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene las ventas del mes actual
   * @route GET /api/dashboard/current-month-sales
   */
  async getCurrentMonthSales(req, res) {
    try {
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      // Solo admin puede ver datos de todas las ciudades
      const cityId = userRole === 'admin' ? (req.query.cityId || null) : userCityId;
      
      const sales = await dashboardService.getCurrentMonthSales(cityId);
      
      res.status(200).json({
        success: true,
        sales
      });
    } catch (error) {
      console.error('Current month sales error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching current month sales',
        error: error.message
      });
    }
  },
  
  /**
   * Compara las ventas del mes actual con el mes anterior
   * @route GET /api/dashboard/sales-comparison
   */
  async compareSalesWithPreviousMonth(req, res) {
    try {
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      // Solo admin puede ver datos de todas las ciudades
      const cityId = userRole === 'admin' ? (req.query.cityId || null) : userCityId;
      
      const comparison = await dashboardService.compareSalesWithPreviousMonth(cityId);
      
      res.status(200).json({
        success: true,
        comparison
      });
    } catch (error) {
      console.error('Sales comparison error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching sales comparison',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene las últimas entradas de trailer
   * @route GET /api/dashboard/recent-entries
   */
  async getRecentTrailerEntries(req, res) {
    try {
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      // Solo admin puede ver datos de todas las ciudades
      const cityId = userRole === 'admin' ? (req.query.cityId || null) : userCityId;
      
      const limit = parseInt(req.query.limit || 5);
      
      const entries = await dashboardService.getRecentTrailerEntries(cityId, limit);
      
      res.status(200).json({
        success: true,
        entries
      });
    } catch (error) {
      console.error('Recent trailer entries error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching recent trailer entries',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene las últimas ventas
   * @route GET /api/dashboard/recent-sales
   */
  async getRecentSales(req, res) {
    try {
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      // Solo admin puede ver datos de todas las ciudades
      const cityId = userRole === 'admin' ? (req.query.cityId || null) : userCityId;
      
      const limit = parseInt(req.query.limit || 5);
      
      const sales = await dashboardService.getRecentSales(cityId, limit);
      
      res.status(200).json({
        success: true,
        sales
      });
    } catch (error) {
      console.error('Recent sales error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching recent sales',
        error: error.message
      });
    }
  }
};

module.exports = dashboardController;