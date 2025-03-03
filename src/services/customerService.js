// src/services/customerService.js
const { Customer, CustomerDocument, Sale, Payment, sequelize } = require('../config/database');
const { Op } = require('sequelize');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Directorio para almacenar documentos de clientes (asegúrate de que exista)
const UPLOADS_DIR = path.join(__dirname, '../../uploads/customers');

// Crear el directorio si no existe
fs.ensureDirSync(UPLOADS_DIR);

const customerService = {
  /**
   * Crea un nuevo cliente
   * @param {Object} customerData - Datos del cliente
   * @returns {Promise<Object>} Cliente creado
   */
  async createCustomer(customerData) {
    const customer = await Customer.create(customerData);
    return customer;
  },

  /**
   * Obtiene un cliente por ID
   * @param {string} id - ID del cliente
   * @returns {Promise<Object>} Cliente encontrado
   */
  async getCustomerById(id) {
    const customer = await Customer.findByPk(id, {
      include: [
        {
          model: CustomerDocument,
          as: 'documents'
        }
      ]
    });
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    return customer;
  },

  /**
   * Lista clientes con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de clientes y metadatos de paginación
   */
  async listCustomers(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.city) {
      where.city = filters.city;
    }
    
    if (filters.active !== undefined) {
      where.active = filters.active;
    }
    
    if (filters.hasDebt !== undefined) {
      where.balance = filters.hasDebt ? { [Op.gt]: 0 } : 0;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${filters.search}%` } },
        { lastName: { [Op.like]: `%${filters.search}%` } },
        { phone: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await Customer.findAndCountAll({
      where,
      include: [
        {
          model: CustomerDocument,
          as: 'documents',
          required: false
        }
      ],
      order: [
        ['city', 'ASC'],
        ['lastName', 'ASC'],
        ['firstName', 'ASC']
      ],
      limit,
      offset
    });
    
    return {
      customers: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un cliente
   * @param {string} id - ID del cliente
   * @param {Object} customerData - Datos a actualizar
   * @returns {Promise<Object>} Cliente actualizado
   */
  async updateCustomer(id, customerData) {
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    await customer.update(customerData);
    
    return await this.getCustomerById(id);
  },

  /**
   * Agrega un documento a un cliente
   * @param {string} customerId - ID del cliente
   * @param {Object} file - Archivo subido
   * @param {Object} documentData - Datos adicionales del documento
   * @param {string} userId - ID del usuario que sube el documento
   * @returns {Promise<Object>} Documento creado
   */
  async addCustomerDocument(customerId, file, documentData, userId) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Crear directorio para el cliente si no existe
    const customerDir = path.join(UPLOADS_DIR, customerId);
    await fs.ensureDir(customerDir);
    
    // Generar un nombre único para el archivo
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(customerDir, fileName);
    
    // Guardar el archivo
    await fs.writeFile(filePath, file.buffer);
    
    // Crear registro en la base de datos
    const document = await CustomerDocument.create({
      fileName: file.originalname,
      fileType: file.mimetype,
      filePath: `uploads/customers/${customerId}/${fileName}`,
      description: documentData.description || '',
      uploadedBy: userId,
      customerId
    });
    
    return document;
  },

  /**
   * Elimina un documento de un cliente
   * @param {string} documentId - ID del documento
   * @returns {Promise<boolean>} true si se eliminó correctamente
   */
  async deleteCustomerDocument(documentId) {
    const document = await CustomerDocument.findByPk(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Eliminar el archivo físico
    try {
      await fs.remove(path.join(__dirname, '../../', document.filePath));
    } catch (error) {
      console.error('Error deleting document file:', error);
      // Continuamos incluso si no se puede eliminar el archivo físico
    }
    
    // Eliminar el registro
    await document.destroy();
    
    return true;
  },

  /**
   * Obtiene todas las ventas de un cliente
   * @param {string} customerId - ID del cliente
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de ventas del cliente
   */
  async getCustomerSales(customerId, pagination = {}) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;
    
    // Obtener ventas
    const { count, rows } = await Sale.findAndCountAll({
      where: { customerId },
      include: [
        {
          model: Payment,
          as: 'payments'
        }
      ],
      order: [['date', 'DESC']],
      limit,
      offset
    });
    
    return {
      sales: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Obtiene un resumen de la situación financiera del cliente
   * @param {string} customerId - ID del cliente
   * @returns {Promise<Object>} Resumen financiero
   */
  async getCustomerFinancialSummary(customerId) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Obtener estadísticas de ventas
    const totalSales = await Sale.count({
      where: { customerId }
    });
    
    // Ventas pendientes de pago
    const pendingSales = await Sale.findAll({
      where: { 
        customerId,
        [Op.or]: [
          { status: 'pending' },
          { status: 'partially_paid' }
        ]
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('pending_amount')), 'totalPending']
      ],
      raw: true
    });
    
    // Pagos totales
    const totalPayments = await Payment.findAll({
      where: { customerId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalPaid']
      ],
      raw: true
    });
    
    return {
      customerId,
      totalSales,
      totalPurchases: customer.totalPurchases,
      totalPaid: totalPayments[0].totalPaid || 0,
      currentBalance: customer.balance,
      pendingSales: pendingSales[0].totalPending || 0,
      lastPurchaseDate: customer.lastPurchaseDate
    };
  },

  /**
   * Verifica si un cliente tiene deudas pendientes
   * @param {string} customerId - ID del cliente
   * @returns {Promise<Object>} Información de la deuda
   */
  async checkCustomerDebt(customerId) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Obtener las ventas pendientes o parcialmente pagadas
    const pendingSales = await Sale.findAll({
      where: { 
        customerId,
        [Op.or]: [
          { status: 'pending' },
          { status: 'partially_paid' }
        ]
      },
      order: [['date', 'ASC']]
    });
    
    // Calcular la antigüedad de la deuda más vieja
    let oldestDebtDays = 0;
    
    if (pendingSales.length > 0) {
      const oldestSaleDate = new Date(pendingSales[0].date);
      const today = new Date();
      const diffTime = Math.abs(today - oldestSaleDate);
      oldestDebtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return {
      hasDebt: customer.balance > 0,
      debtAmount: customer.balance,
      oldestDebtDays,
      pendingSales: pendingSales.length
    };
  },
  /**
 * Obtiene la URL pública de un documento
 * @param {string} documentId - ID del documento
 * @returns {Promise<string>} URL del documento
 */
async getDocumentUrl(documentId) {
    const document = await CustomerDocument.findByPk(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Construir la URL completa basada en la configuración del servidor
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/${document.filePath}`;
  }
};

module.exports = customerService;