// src/controllers/manufacturingOrderController.js
const manufacturingOrderService = require('../services/manufacturingOrderService');

const manufacturingOrderController = {
  /**
   * Crea una nueva orden de manufactura
   * @route POST /api/manufacturing-orders
   */
  async createOrder(req, res) {
    try {
      const { trailerEntryId, productId, kilosToProcess, boxesEstimated, notes, destinationWarehouseId } = req.body;
      
      // Validación básica
      if (!trailerEntryId || !productId || !kilosToProcess || !destinationWarehouseId) {
        return res.status(400).json({
          success: false,
          message: 'Trailer entry ID, product ID, kilos to process, and destination warehouse ID are required'
        });
      }
      
      // Validar que los kilos sean un número positivo
      if (isNaN(kilosToProcess) || kilosToProcess <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Kilos to process must be a positive number'
        });
      }
      
      // Validar que las cajas sean un número positivo si se proporcionan
      if (boxesEstimated !== undefined && (isNaN(boxesEstimated) || boxesEstimated <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Boxes estimated must be a positive number'
        });
      }
      
      const order = await manufacturingOrderService.createOrder({
        trailerEntryId,
        productId,
        kilosToProcess,
        boxesEstimated,
        notes,
        destinationWarehouseId
      }, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Manufacturing order created successfully',
        order
      });
    } catch (error) {
      console.error('Create manufacturing order error:', error);
      
      if (error.message.includes('not found') || 
          error.message.includes('already has a manufacturing order') ||
          error.message.includes('Cannot process more than available')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating manufacturing order',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene una orden por ID
   * @route GET /api/manufacturing-orders/:id
   */
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      
      const order = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad (solo admin puede ver órdenes de otras ciudades)
      if (req.user.role !== 'admin' && order.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view orders from other cities'
        });
      }
      
      res.status(200).json({
        success: true,
        order
      });
    } catch (error) {
      console.error('Get manufacturing order error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching manufacturing order',
        error: error.message
      });
    }
  },
  
  /**
   * Lista órdenes con filtros opcionales
   * @route GET /api/manufacturing-orders
   */
  async listOrders(req, res) {
    try {
      const { page = 1, limit = 10, status, city, startDate, endDate, productId } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCity = req.user.city;
      const userRole = req.user.role;
      
      const filters = {
        status,
        startDate,
        endDate,
        productId,
        city: userRole === 'admin' ? (city || undefined) : userCity
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await manufacturingOrderService.listOrders(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List manufacturing orders error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing manufacturing orders',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza el estado de una orden
   * @route PATCH /api/manufacturing-orders/:id/status
   */
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, startDate, endDate } = req.body;
      
      // Validar estado
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Valid status is required: pending, in_progress, completed, cancelled'
        });
      }
      
      // Obtener la orden para verificar permisos
      const currentOrder = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad (solo usuarios de la misma ciudad pueden actualizar)
      if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update orders from other cities'
        });
      }
      
      const order = await manufacturingOrderService.updateOrderStatus(id, status, { startDate, endDate });
      
      res.status(200).json({
        success: true,
        message: `Manufacturing order status updated to: ${status}`,
        order
      });
    } catch (error) {
      console.error('Update manufacturing order status error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating manufacturing order status',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina una orden
   * @route DELETE /api/manufacturing-orders/:id
   */
  async deleteOrder(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener la orden para verificar permisos
      const currentOrder = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad (solo usuarios de la misma ciudad pueden eliminar)
      if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete orders from other cities'
        });
      }
      
      await manufacturingOrderService.deleteOrder(id);
      
      res.status(200).json({
        success: true,
        message: 'Manufacturing order deleted successfully'
      });
    } catch (error) {
      console.error('Delete manufacturing order error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      if (error.message.includes('Cannot delete order with status')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting manufacturing order',
        error: error.message
      });
    }
  },
  
  /**
   * Calcula los gastos para una orden
   * @route POST /api/manufacturing-orders/:id/calculate-expenses
   */
  async calculateExpenses(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener la orden para verificar permisos
      const currentOrder = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad (solo usuarios de la misma ciudad pueden calcular gastos)
      if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to calculate expenses for orders from other cities'
        });
      }
      
      const expenses = await manufacturingOrderService.calculateExpenses(id);
      
      res.status(200).json({
        success: true,
        message: 'Expenses calculated successfully',
        expenses
      });
    } catch (error) {
      console.error('Calculate expenses error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      if (error.message.includes('does not have a recipe')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error calculating expenses',
        error: error.message
      });
    }
  },
  // En manufacturingOrderController.js

/**
 * Obtiene la información de rentabilidad de una orden
 * @route GET /api/manufacturing-orders/:id/profitability
 */
async getOrderProfitability(req, res) {
  try {
    const { id } = req.params;
    
    // Primero verificamos permisos como en otros métodos
    const currentOrder = await manufacturingOrderService.getOrderById(id);
    
    if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view orders from other cities'
      });
    }
    
    const profitability = await manufacturingOrderService.calculateProfitability(id);
    
    res.status(200).json({
      success: true,
      profitability
    });
  } catch (error) {
    console.error('Get order profitability error:', error);
    
    if (error.message === 'Manufacturing order not found') {
      return res.status(404).json({
        success: false,
        message: 'Manufacturing order not found'
      });
    }
    
    if (error.message === 'Cost per kilo or selling price not available') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error calculating order profitability',
      error: error.message
    });
  }
},

/**
 * Obtiene análisis de gastos por producto y período
 * @route GET /api/manufacturing-orders/product-expense-analysis
 */
async getProductExpenseAnalysis(req, res) {
  try {
    const { productId, startDate, endDate, city } = req.query;
    
    // Filtrar por ciudad según el rol
    const userCity = req.user.city;
    const userRole = req.user.role;
    
    // Si no es admin, solo puede ver su ciudad
    const cityFilter = userRole === 'admin' ? (city || undefined) : userCity;
    
    const analysis = await manufacturingOrderService.getProductExpenseAnalysis({
      productId,
      startDate,
      endDate,
      city: cityFilter
    });
    
    res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Product expense analysis error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error generating product expense analysis',
      error: error.message
    });
  }
}
};

module.exports = manufacturingOrderController;