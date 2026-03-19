// src/services/productService.js
const { Product, SaleDetail } = require('../config/database');
const { Op } = require('sequelize');

const productService = {
  /**
   * Crea un nuevo producto
   * @param {Object} productData - Datos del producto
   * @returns {Promise<Object>} Producto creado
   */
  async createProduct(productData) {
    const product = await Product.create(productData);
    return product;
  },

  /**
   * Obtiene un producto por ID
   * @param {string} id - ID del producto
   * @returns {Promise<Object>} Producto encontrado
   */
  async getProductById(id) {
    const product = await Product.findByPk(id);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  },

  /**
   * Lista productos con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de productos y metadatos de paginación
   */
  async listProducts(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = pagination.page || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await Product.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset
    });
    
    return {
      products: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un producto
   * @param {string} id - ID del producto
   * @param {Object} productData - Datos a actualizar
   * @returns {Promise<Object>} Producto actualizado
   */
  async updateProduct(id, productData) {
    const product = await Product.findByPk(id);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    await product.update(productData);
    
    return product;
  },

  /**
   * Activa o desactiva un producto
   * @param {string} id - ID del producto
   * @param {boolean} active - Nuevo estado
   * @returns {Promise<Object>} Producto actualizado
   */
  async setProductActive(id, active) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error('Product not found');
    await product.update({ active });
    return product;
  },

  /**
   * Elimina un producto permanentemente (solo si no tiene ventas)
   * @param {string} id - ID del producto
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteProduct(id) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error('Product not found');

    const usedInSales = await SaleDetail.count({ where: { productId: id } });
    if (usedInSales > 0) throw new Error('Cannot delete a product with sales history');

    await product.destroy();
    return true;
  }
};

module.exports = productService;