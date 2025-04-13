// src/controllers/manufacturingOrderController.js
const manufacturingOrderService = require('../services/manufacturingOrderService');

const manufacturingOrderController = {
  /**
   * Crea una nueva orden de manufactura
   * @route POST /api/manufacturing-orders
   */
  async createOrder(req, res) {
    try {
      const { 
        trailerEntryId, 
        productId, 
        kilosToProcess, 
        boxesEstimated, 
        notes, 
        destinationWarehouseId,
        expectedYield
      } = req.body;
      
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
      
      // Validar rendimiento esperado si se proporciona
      if (expectedYield !== undefined && (isNaN(expectedYield) || expectedYield <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Expected yield must be a positive number'
        });
      }
      
      const order = await manufacturingOrderService.createOrder({
        trailerEntryId,
        productId,
        kilosToProcess,
        boxesEstimated,
        notes,
        destinationWarehouseId,
        expectedYield
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
      const { 
        page = 1, 
        limit = 10, 
        status, 
        city, 
        startDate, 
        endDate, 
        productId,
        trailerEntryId
      } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCity = req.user.city;
      const userRole = req.user.role;
      
      const filters = {
        status,
        startDate,
        endDate,
        productId,
        trailerEntryId,
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
      const { 
        status, 
        startDate, 
        endDate, 
        kilosObtained, 
        boxesObtained 
      } = req.body;
      
      // Validar estado
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Valid status is required: pending, in_progress, completed, cancelled'
        });
      }
      
      // Si se está completando, verificar kilos obtenidos
      if (status === 'completed' && (!kilosObtained || kilosObtained <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Kilos obtained is required and must be greater than zero when completing an order'
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
      
      const order = await manufacturingOrderService.updateOrderStatus(id, status, { 
        startDate, 
        endDate,
        kilosObtained,
        boxesObtained
      });
      
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
      
      if (error.message.includes('Kilos obtained is required')) {
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
   * Calcula los costos totales para una orden
   * @route GET /api/manufacturing-orders/:id/costs
   */
  async calculateTotalCosts(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener la orden para verificar permisos
      const currentOrder = await manufacturingOrderService.getOrderById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view costs for orders from other cities'
        });
      }
      
      const costs = await manufacturingOrderService.calculateTotalCosts(id);
      
      res.status(200).json({
        success: true,
        message: 'Costs calculated successfully',
        costs
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
   * Obtiene la información de rentabilidad de una orden
   * @route GET /api/manufacturing-orders/:id/profitability
   */
  async getOrderProfitability(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar permisos
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
   * @route GET /api/manufacturing-orders/analysis/products
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
  },
  
  /**
 * Agrega uno o varios insumos a una orden de manufactura
 * @route POST /api/manufacturing-orders/:id/inputs
 */
async addProductionInput(req, res) {
  try {
    const { id } = req.params;
    const inputData = req.body;
    
    // Verificar permisos
    const currentOrder = await manufacturingOrderService.getOrderById(id);
    
    if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update orders from other cities'
      });
    }

    // Verificar si es un único insumo o un array de insumos
    const isArray = Array.isArray(inputData);
    
    // Si es un array, validar cada elemento
    if (isArray) {
      if (inputData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one input must be provided'
        });
      }
      
      // Validar cada insumo
      for (const input of inputData) {
        if (!input.inputType || !input.name || !input.quantity || !input.unit || input.unitCost === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Each input must include inputType, name, quantity, unit, and unitCost'
          });
        }
        
        // Validar tipo de insumo
        const validTypes = ['supply', 'packaging', 'other'];
        if (!validTypes.includes(input.inputType)) {
          return res.status(400).json({
            success: false,
            message: `Input type for ${input.name} must be: supply, packaging, or other`
          });
        }
        
        // Validar que la cantidad y costo sean números positivos
        if (isNaN(input.quantity) || input.quantity <= 0) {
          return res.status(400).json({
            success: false,
            message: `Quantity for ${input.name} must be a positive number`
          });
        }
        
        if (isNaN(input.unitCost) || input.unitCost < 0) {
          return res.status(400).json({
            success: false,
            message: `Unit cost for ${input.name} must be a non-negative number`
          });
        }
      }
      
      // Procesar múltiples insumos
      const inputs = await manufacturingOrderService.addMultipleProductionInputs(id, inputData);
      
      res.status(201).json({
        success: true,
        message: `${inputs.length} production inputs added successfully`,
        inputs
      });
    } else {
      // Código existente para un solo insumo
      const { 
        inputType, 
        itemId, 
        name, 
        quantity, 
        unit, 
        unitCost,
        productionStageId,
        notes
      } = inputData;
      
      // Validación básica
      if (!inputType || !name || !quantity || !unit || unitCost === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Input type, name, quantity, unit, and unit cost are required'
        });
      }
      
      // Validar tipo de insumo
      const validTypes = ['supply', 'packaging', 'other'];
      if (!validTypes.includes(inputType)) {
        return res.status(400).json({
          success: false,
          message: 'Input type must be: supply, packaging, or other'
        });
      }
      
      // Validar que la cantidad y costo sean números positivos
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive number'
        });
      }
      
      if (isNaN(unitCost) || unitCost < 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit cost must be a non-negative number'
        });
      }
      
      const input = await manufacturingOrderService.addProductionInput(id, {
        inputType,
        itemId,
        name,
        quantity,
        unit,
        unitCost,
        productionStageId,
        notes
      });
      
      res.status(201).json({
        success: true,
        message: 'Production input added successfully',
        input
      });
    }
  } catch (error) {
    console.error('Add production input error:', error);
    
    if (error.message === 'Manufacturing order not found' || 
        error.message === 'Production stage not found' ||
        error.message === 'Supply not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot add inputs to order with status')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error adding production input',
      error: error.message
    });
  }
},
  
  /**
   * Elimina un insumo de una orden de manufactura
   * @route DELETE /api/manufacturing-orders/inputs/:inputId
   */
  async removeProductionInput(req, res) {
    try {
      const { inputId } = req.params;
      
      await manufacturingOrderService.removeProductionInput(inputId);
      
      res.status(200).json({
        success: true,
        message: 'Production input removed successfully'
      });
    } catch (error) {
      console.error('Remove production input error:', error);
      
      if (error.message === 'Production input not found') {
        return res.status(404).json({
          success: false,
          message: 'Production input not found'
        });
      }
      
      if (error.message.includes('Cannot remove inputs from order with status')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error removing production input',
        error: error.message
      });
    }
  },
  /**
   * Crea una etapa de producción en una orden de manufactura
   * @route POST /api/manufacturing-orders/:id/stages
   */
  async createProductionStage(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, 
        initialKilos, 
        initialCost, 
        description, 
        status 
      } = req.body;
      
      // Validación básica
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Stage name is required'
        });
      }
      
      // Verificar permisos
      const currentOrder = await manufacturingOrderService.getOrderById(id);
      
      if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update orders from other cities'
        });
      }
      
      const stage = await manufacturingOrderService.createProductionStage(id, {
        name,
        initialKilos,
        initialCost,
        description,
        status
      });
      
      res.status(201).json({
        success: true,
        message: 'Production stage created successfully',
        stage
      });
    } catch (error) {
      console.error('Create production stage error:', error);
      
      if (error.message === 'Manufacturing order not found') {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing order not found'
        });
      }
      
      if (error.message.includes('Cannot add stages to order with status')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating production stage',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza una etapa de producción
   * @route PUT /api/manufacturing-orders/stages/:stageId
   */
  async updateProductionStage(req, res) {
    try {
      const { stageId } = req.params;
      const { 
        name, 
        status, 
        finalKilos, 
        additionalCost, 
        costPerKilo,
        description,
        startDate,
        endDate
      } = req.body;
      
      // Validaciones básicas
      if (status === 'completed' && !finalKilos) {
        return res.status(400).json({
          success: false,
          message: 'Final kilos are required when completing a stage'
        });
      }
      
      // Validar que los kilos sean positivos si se proporcionan
      if (finalKilos !== undefined && (isNaN(finalKilos) || finalKilos <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Final kilos must be a positive number'
        });
      }
      
      // Actualizar la etapa
      const stage = await manufacturingOrderService.updateProductionStage(stageId, {
        name,
        status,
        finalKilos,
        additionalCost,
        costPerKilo,
        description,
        startDate,
        endDate
      });
      
      res.status(200).json({
        success: true,
        message: 'Production stage updated successfully',
        stage
      });
    } catch (error) {
      console.error('Update production stage error:', error);
      
      if (error.message === 'Production stage not found') {
        return res.status(404).json({
          success: false,
          message: 'Production stage not found'
        });
      }
      
      if (error.message.includes('Cannot update stages for order with status') ||
          error.message.includes('Final kilos are required')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating production stage',
        error: error.message
      });
    }
  },
  
  /**
   * Agrega un producto procesado a una orden de manufactura
   * @route POST /api/manufacturing-orders/:id/processed-products
   */
  async addProcessedProduct(req, res) {
    try {
      const { id } = req.params;
      const { 
        productId, 
        kilos, 
        boxes, 
        costPerKilo, 
        totalCost,
        warehouseId,
        notes
      } = req.body;
      
      // Validación básica
      if (!productId || !kilos || !warehouseId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, kilos, and warehouse ID are required'
        });
      }
      
      // Validar que los kilos sean un número positivo
      if (isNaN(kilos) || kilos <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Kilos must be a positive number'
        });
      }
      
      // Verificar permisos
      const currentOrder = await manufacturingOrderService.getOrderById(id);
      
      if (req.user.role !== 'admin' && currentOrder.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update orders from other cities'
        });
      }
      
      const processedProduct = await manufacturingOrderService.addProcessedProduct(id, {
        productId,
        kilos,
        boxes,
        costPerKilo: costPerKilo || (currentOrder.costPerKilo || 0),
        totalCost: totalCost || (kilos * (costPerKilo || currentOrder.costPerKilo || 0)),
        warehouseId,
        notes
      });
      
      res.status(201).json({
        success: true,
        message: 'Processed product added successfully',
        processedProduct
      });
    } catch (error) {
      console.error('Add processed product error:', error);
      
      if (error.message === 'Manufacturing order not found' ||
          error.message === 'Product not found' ||
          error.message === 'Warehouse not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Cannot add processed products to order with status') ||
          error.message.includes('Cannot exceed maximum expected kilos')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error adding processed product',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina un producto procesado
   * @route DELETE /api/manufacturing-orders/processed-products/:productId
   */
  async removeProcessedProduct(req, res) {
    try {
      const { productId } = req.params;
      
      await manufacturingOrderService.removeProcessedProduct(productId);
      
      res.status(200).json({
        success: true,
        message: 'Processed product removed successfully'
      });
    } catch (error) {
      console.error('Remove processed product error:', error);
      
      if (error.message === 'Processed product not found') {
        return res.status(404).json({
          success: false,
          message: 'Processed product not found'
        });
      }
      
      if (error.message.includes('Cannot remove a processed product that has already been added to inventory') ||
          error.message.includes('Cannot remove processed products from order with status')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error removing processed product',
        error: error.message
      });
    }
  }
};

module.exports = manufacturingOrderController;