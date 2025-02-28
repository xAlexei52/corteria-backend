// src/controllers/productController.js
const productService = require('../services/productService');

const productController = {
  /**
   * Crea un nuevo producto
   * @route POST /api/products
   */
  async createProduct(req, res) {
    try {
      const { name, description, pricePerKilo } = req.body;
      
      // Validación básica
      if (!name || !pricePerKilo) {
        return res.status(400).json({
          success: false,
          message: 'Name and price per kilo are required'
        });
      }
      
      const product = await productService.createProduct({
        name,
        description,
        pricePerKilo
      });
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      console.error('Create product error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error creating product',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un producto por ID
   * @route GET /api/products/:id
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      const product = await productService.getProductById(id);
      
      res.status(200).json({
        success: true,
        product
      });
    } catch (error) {
      console.error('Get product error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching product',
        error: error.message
      });
    }
  },
  
  /**
   * Lista productos con filtros opcionales
   * @route GET /api/products
   */
  async listProducts(req, res) {
    try {
      const { page = 1, limit = 10, search, active } = req.query;
      
      const filters = {
        search,
        active: active === 'true' ? true : (active === 'false' ? false : undefined)
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await productService.listProducts(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List products error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing products',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un producto
   * @route PUT /api/products/:id
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, description, pricePerKilo, active } = req.body;
      
      // Verificar que al menos un campo esté presente
      if (!name && description === undefined && pricePerKilo === undefined && active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be provided to update'
        });
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (pricePerKilo !== undefined) updateData.pricePerKilo = pricePerKilo;
      if (active !== undefined) updateData.active = active;
      
      const product = await productService.updateProduct(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        product
      });
    } catch (error) {
      console.error('Update product error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating product',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina un producto (desactivación lógica)
   * @route DELETE /api/products/:id
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      
      await productService.deleteProduct(id);
      
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting product',
        error: error.message
      });
    }
  }
};

module.exports = productController;