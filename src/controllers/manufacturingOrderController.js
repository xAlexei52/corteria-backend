// src/controllers/manufacturingOrderController.js (modificado)
const manufacturingOrderService = require('../services/manufacturingOrderService');

const manufacturingOrderController = {
  /**
   * Crea una nueva orden de manufactura
   * @route POST /api/manufacturing-orders
   */
  async createOrder(req, res) {
    try {
      const { 
        trailerEntryId, productId, usedKilos, totalOutputKilos,
        boxesEstimated, notes, destinationWarehouseId, cityId
      } = req.body;
      
      // Validación básica
      if (!trailerEntryId || !productId || !usedKilos || !destinationWarehouseId) {
        return res.status(400).json({
          success: false,
          message: 'Trailer entry ID, product ID, used kilos, and destination warehouse ID are required'
        });
      }
      
      // Validar que los kilos sean números positivos
      if (isNaN(usedKilos) || usedKilos <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Used kilos must be a positive number'
        });
      }
      
      if (totalOutputKilos && (isNaN(totalOutputKilos) || totalOutputKilos <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Total output kilos must be a positive number'
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
        usedKilos,
        cityId,
        totalOutputKilos: totalOutputKilos || usedKilos,
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
          error.message.includes('no available kilos') ||
          error.message.includes('Cannot use more than available kilos')) {
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
   * Agrega insumos y gastos a una orden
   * @route POST /api/manufacturing-orders/:id/expenses
   */
  async addOrderExpenses(req, res) {
    try {
      const { id } = req.params;
      const { expenses } = req.body;
      
      // Validación básica
      if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one expense is required'
        });
      }
      
      // Obtener la orden para verificar permisos
      const order = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad
    if (req.user.role !== 'admin' && order.cityId !== req.user.cityId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit orders from other cities'
      });
    }
      
      const result = await manufacturingOrderService.addOrderExpenses(id, expenses);
      
      res.status(200).json({
        success: true,
        message: 'Expenses added successfully',
        expenses: result
      });
    } catch (error) {
      console.error('Add expenses error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      if (error.message.includes('Cannot add expenses') || 
          error.message.includes('Invalid expense type') ||
          error.message.includes('Supply with ID')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error adding expenses',
        error: error.message
      });
    }
  },
  
  /**
   * Agrega subproductos a una orden
   * @route POST /api/manufacturing-orders/:id/subproducts
   */
  async addOrderSubproducts(req, res) {
    try {
      const { id } = req.params;
      const { subproducts } = req.body;
      
      // Validación básica
      if (!subproducts || !Array.isArray(subproducts) || subproducts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one subproduct is required'
        });
      }
      
      // Obtener la orden para verificar permisos
      const order = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && order.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify orders from other cities'
        });
      }
      
      const result = await manufacturingOrderService.addOrderSubproducts(id, subproducts);
      
      res.status(200).json({
        success: true,
        message: 'Subproducts added successfully',
        subproducts: result
      });
    } catch (error) {
      console.error('Add subproducts error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      if (error.message.includes('Cannot add subproducts') || 
          error.message.includes('Product with ID')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error adding subproducts',
        error: error.message
      });
    }
  },
  
  /**
   * Calcula los costos y rentabilidad de una orden
   * @route POST /api/manufacturing-orders/:id/calculate
   */
  async calculateOrderCosts(req, res) {
    try {
      const { id } = req.params;
      const { sellingPricePerKilo } = req.body;
      
      // Validación básica
      if (!sellingPricePerKilo || isNaN(sellingPricePerKilo) || sellingPricePerKilo <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Selling price per kilo is required and must be a positive number'
        });
      }
      
      // Obtener la orden para verificar permisos
      const order = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && order.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to calculate costs for orders from other cities'
        });
      }
      
      const result = await manufacturingOrderService.calculateOrderCosts(id, { sellingPricePerKilo });
      
      res.status(200).json({
        success: true,
        message: 'Costs calculated successfully',
        calculation: result
      });
    } catch (error) {
      console.error('Calculate costs error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error calculating costs',
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
      if (req.user.role !== 'admin' && order.cityId !== req.user.cityId) {
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
      const { 
        page = 1, limit = 10, status, cityId, startDate, endDate, 
        productId, trailerEntryId, calculationStatus 
      } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      const filters = {
        status,
        startDate,
        endDate,
        productId,
        trailerEntryId,
        calculationStatus,
        cityId: userRole === 'admin' ? (cityId || undefined) : userCityId
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
      if (req.user.role !== 'admin' && currentOrder.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update orders from other cities'
        });
      }
      
      // Si se completa, verificar que se hayan calculado los costos
      if (status === 'completed' && currentOrder.calculationStatus !== 'calculated') {
        return res.status(400).json({
          success: false,
          message: 'Order costs must be calculated before completion'
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
      
      if (error.message.includes('Order costs must be calculated')) {
        return res.status(400).json({
          success: false,
          message: error.message
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
      if (req.user.role !== 'admin' && currentOrder.city !== req.user.cityId) {
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
  }
};

module.exports = manufacturingOrderController;