// src/controllers/saleController.js
const saleService = require('../services/saleService');

const saleController = {
  /**
   * Crea una nueva venta
   * @route POST /api/sales
   */
  async createSale(req, res) {
    try {
      const { 
        customerId, date, notes, products 
      } = req.body;
      
      // Validación básica
      if (!customerId || !products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID and at least one product are required'
        });
      }
      
      // Validar cada producto
      for (const product of products) {
        if (!product.productId || !product.warehouseId || !product.quantity || !product.unitPrice) {
          return res.status(400).json({
            success: false,
            message: 'Each product must have productId, warehouseId, quantity, and unitPrice'
          });
        }
        
        if (isNaN(product.quantity) || product.quantity <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Product quantity must be a positive number'
          });
        }
        
        if (isNaN(product.unitPrice) || product.unitPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Product unit price must be a positive number'
          });
        }
      }
      
      const sale = await saleService.createSale(
        {
          customerId,
          date: date || new Date(),
          notes
        },
        products,
        req.user.id
      );
      
      res.status(201).json({
        success: true,
        message: 'Sale created successfully',
        sale
      });
    } catch (error) {
      console.error('Create sale error:', error);
      
      if (error.message.includes('not found') || 
          error.message.includes('Insufficient stock')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating sale',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene una venta por ID
   * @route GET /api/sales/:id
   */
  async getSaleById(req, res) {
    try {
      const { id } = req.params;
      
      const sale = await saleService.getSaleById(id);
      
      // Verificar permisos por ciudad (solo admin puede ver ventas de otras ciudades)
      if (req.user.role !== 'admin' && sale.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view sales from other cities'
        });
      }
      
      res.status(200).json({
        success: true,
        sale
      });
    } catch (error) {
      console.error('Get sale error:', error);
      
      if (error.message === 'Sale not found') {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching sale',
        error: error.message
      });
    }
  },
  
  /**
   * Lista ventas con filtros opcionales
   * @route GET /api/sales
   */
  async listSales(req, res) {
    try {
      const { 
        page = 1, limit = 10, startDate, endDate,
        status, customerId, city
      } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCity = req.user.city;
      const userRole = req.user.role;
      
      const filters = {
        startDate,
        endDate,
        status,
        customerId,
        city: userRole === 'admin' ? (city || undefined) : userCity
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await saleService.listSales(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List sales error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing sales',
        error: error.message
      });
    }
  },
  
  /**
   * Cancela una venta
   * @route PATCH /api/sales/:id/cancel
   */
  async cancelSale(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener la venta para verificar permisos
      const currentSale = await saleService.getSaleById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && currentSale.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to cancel sales from other cities'
        });
      }
      
      const sale = await saleService.cancelSale(id);
      
      res.status(200).json({
        success: true,
        message: 'Sale cancelled successfully',
        sale
      });
    } catch (error) {
      console.error('Cancel sale error:', error);
      
      if (error.message === 'Sale not found') {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }
      
      if (error.message.includes('Cannot cancel a sale with payments')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error cancelling sale',
        error: error.message
      });
    }
  },
  
  /**
   * Registra un pago para una venta
   * @route POST /api/sales/:id/payments
   */
  async registerPayment(req, res) {
    try {
      const { id } = req.params;
      const { 
        amount, date, paymentMethod, 
        referenceNumber, notes 
      } = req.body;
      
      // Validación básica
      if (!amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Amount and payment method are required'
        });
      }
      
      // Validar que el monto sea positivo
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }
      
      // Validar método de pago
      const validMethods = ['cash', 'credit_card', 'bank_transfer', 'check', 'other'];
      if (!validMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
      }
      
      // Obtener la venta para verificar permisos
      const currentSale = await saleService.getSaleById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && currentSale.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to register payments for sales from other cities'
        });
      }
      
      const result = await saleService.registerPayment(
        id,
        {
          amount,
          date: date || new Date(),
          paymentMethod,
          referenceNumber,
          notes
        },
        req.user.id
      );
      
      res.status(200).json({
        success: true,
        message: 'Payment registered successfully',
        payment: result.payment,
        sale: result.sale
      });
    } catch (error) {
      console.error('Register payment error:', error);
      
      if (error.message === 'Sale not found') {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }
      
      if (error.message.includes('Cannot register payment for a cancelled sale') ||
          error.message.includes('Cannot pay more than pending amount')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error registering payment',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene estadísticas de ventas
   * @route GET /api/sales/stats
   */
  async getSalesStats(req, res) {
    try {
      const { startDate, endDate, city } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCity = req.user.city;
      const userRole = req.user.role;
      
      const filters = {
        startDate,
        endDate,
        city: userRole === 'admin' ? (city || undefined) : userCity
      };
      
      const stats = await saleService.getSalesStats(filters);
      
      res.status(200).json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Get sales stats error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching sales statistics',
        error: error.message
      });
    }
  }
};

module.exports = saleController;