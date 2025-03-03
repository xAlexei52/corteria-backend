// src/controllers/inventoryController.js
const inventoryService = require('../services/inventoryService');

const inventoryController = {
  /**
   * Lista el inventario con filtros opcionales
   * @route GET /api/inventory
   */
  async listInventory(req, res) {
    try {
      const { page = 1, limit = 10, itemType, itemId, warehouseId, city } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCity = req.user.city;
      const userRole = req.user.role;
      
      const filters = {
        itemType,
        itemId,
        warehouseId,
        city: userRole === 'admin' ? (city || undefined) : userCity
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await inventoryService.listInventory(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List inventory error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing inventory',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un resumen del inventario de productos por ciudad
   * @route GET /api/inventory/products/summary/:city
   */
  async getProductInventorySummaryByCity(req, res) {
    try {
      const { city } = req.params;
      
      // Verificar permisos por ciudad (solo admin puede ver inventario de otras ciudades)
      if (req.user.role !== 'admin' && city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view inventory from other cities'
        });
      }
      
      const summary = await inventoryService.getProductInventorySummaryByCity(city);
      
      res.status(200).json({
        success: true,
        ...summary
      });
    } catch (error) {
      console.error('Get product inventory summary error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error getting product inventory summary',
        error: error.message
      });
    }
  },
  
  /**
   * Transfiere inventario entre almacenes
   * @route POST /api/inventory/transfer
   */
  async transferInventory(req, res) {
    try {
      const { sourceWarehouseId, destinationWarehouseId, itemType, itemId, quantity } = req.body;
      
      // Validación básica
      if (!sourceWarehouseId || !destinationWarehouseId || !itemType || !itemId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Source warehouse, destination warehouse, item type, item ID, and quantity are required'
        });
      }
      
      // Validar que la cantidad sea un número positivo
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive number'
        });
      }
      
      // Verificar permisos (solo usuarios de la misma ciudad o admins)
      const sourceWarehouse = await inventoryService.getWarehouseDetails(sourceWarehouseId);
      const destinationWarehouse = await inventoryService.getWarehouseDetails(destinationWarehouseId);
      
      if (!sourceWarehouse || !destinationWarehouse) {
        return res.status(404).json({
          success: false,
          message: 'One or both warehouses not found'
        });
      }
      
      if (req.user.role !== 'admin' && 
          (sourceWarehouse.city !== req.user.city || destinationWarehouse.city !== req.user.city)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to transfer inventory between these warehouses'
        });
      }
      
      const result = await inventoryService.transferInventory({
        sourceWarehouseId,
        destinationWarehouseId,
        itemType,
        itemId,
        quantity
      });
      
      res.status(200).json({
        success: true,
        message: 'Inventory transferred successfully',
        ...result
      });
    } catch (error) {
      console.error('Transfer inventory error:', error);
      
      if (error.message.includes('not found') || 
          error.message.includes('Insufficient inventory')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error transferring inventory',
        error: error.message
      });
    }
  }
};

module.exports = inventoryController;