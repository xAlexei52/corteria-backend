// src/controllers/customerController.js (actualizado)
const customerService = require('../services/customerService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer para almacenar los archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo permitidos
    const allowedTypes = [
      'image/jpeg', 'image/png', 'application/pdf',
      'image/jpg', 'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, JPG, WEBP, and PDF are allowed.'), false);
    }
  }
}).single('document');

const customerController = {
  /**
   * Crea un nuevo cliente
   * @route POST /api/customers
   */
  async createCustomer(req, res) {
    try {
      const { 
        firstName, lastName, phone, email, 
        address, cityId, active 
      } = req.body;
      
      // Validación básica
      if (!firstName || !lastName || !cityId) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, and cityId are required'
        });
      }
      
      // Crear cliente
      const customer = await customerService.createCustomer({
        firstName,
        lastName,
        phone,
        email,
        address,
        cityId,
        active: active !== undefined ? active : true
      });
      
      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      
      if (error.message.includes('City not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating customer',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un cliente por ID
   * @route GET /api/customers/:id
   */
  async getCustomerById(req, res) {
    try {
      const { id } = req.params;
      
      const customer = await customerService.getCustomerById(id);
      
      // Verificar permisos por ciudad (solo admin puede ver clientes de otras ciudades)
      if (req.user.role !== 'admin' && customer.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view customers from other cities'
        });
      }
      
      res.status(200).json({
        success: true,
        customer
      });
    } catch (error) {
      console.error('Get customer error:', error);
      
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching customer',
        error: error.message
      });
    }
  },
  
  /**
   * Lista clientes con filtros opcionales
   * @route GET /api/customers
   */
  async listCustomers(req, res) {
    try {
      const { 
        page = 1, limit = 10, search, 
        cityId, active, hasDebt 
      } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      const filters = {
        search,
        active: active === 'true' ? true : (active === 'false' ? false : undefined),
        hasDebt: hasDebt === 'true' ? true : (hasDebt === 'false' ? false : undefined),
        cityId: userRole === 'admin' ? (cityId || undefined) : userCityId
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await customerService.listCustomers(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List customers error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing customers',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un cliente
   * @route PUT /api/customers/:id
   */
  async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const { 
        firstName, lastName, phone, email, 
        address, cityId, active 
      } = req.body;
      
      // Obtener el cliente para verificar permisos
      const currentCustomer = await customerService.getCustomerById(id);
      
      // Verificar permisos por ciudad (solo usuarios de la misma ciudad o admin pueden actualizar)
      if (req.user.role !== 'admin' && currentCustomer.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update customers from other cities'
        });
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      
      // Solo el admin puede cambiar la ciudad o el estado activo
      if (req.user.role === 'admin') {
        if (cityId) updateData.cityId = cityId;
        if (active !== undefined) updateData.active = active;
      }
      
      const customer = await customerService.updateCustomer(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        customer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      
      if (error.message === 'Customer not found' || error.message.includes('City not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating customer',
        error: error.message
      });
    }
  },
  
  /**
   * Añade un documento a un cliente
   * @route POST /api/customers/:id/documents
   */
  async addCustomerDocument(req, res) {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      try {
        const { id } = req.params;
        const { description } = req.body;
        
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }
        
        // Obtener el cliente para verificar permisos
        const customer = await customerService.getCustomerById(id);
        
        // Verificar permisos por ciudad
        if (req.user.role !== 'admin' && customer.cityId !== req.user.cityId) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to add documents to customers from other cities'
          });
        }
        
        const document = await customerService.addCustomerDocument(
          id,
          req.file,
          { description },
          req.user.id
        );
        
        res.status(201).json({
          success: true,
          message: 'Document added successfully',
          document
        });
      } catch (error) {
        console.error('Add customer document error:', error);
        
        if (error.message === 'Customer not found') {
          return res.status(404).json({
            success: false,
            message: 'Customer not found'
          });
        }
        
        res.status(500).json({
          success: false,
          message: 'Error adding document',
          error: error.message
        });
      }
    });
  },
  
  /**
   * Elimina un documento de un cliente
   * @route DELETE /api/customers/:customerId/documents/:documentId
   */
  async deleteCustomerDocument(req, res) {
    try {
      const { customerId, documentId } = req.params;
      
      // Obtener el cliente para verificar permisos
      const customer = await customerService.getCustomerById(customerId);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && customer.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete documents from customers in other cities'
        });
      }
      
      await customerService.deleteCustomerDocument(documentId);
      
      res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Delete customer document error:', error);
      
      if (error.message === 'Customer not found' || error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting document',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene las ventas de un cliente
   * @route GET /api/customers/:id/sales
   */
  async getCustomerSales(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      // Obtener el cliente para verificar permisos
      const customer = await customerService.getCustomerById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && customer.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view sales from customers in other cities'
        });
      }
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await customerService.getCustomerSales(id, pagination);
      
      res.status(200).json({
        success: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName
        },
        ...result
      });
    } catch (error) {
      console.error('Get customer sales error:', error);
      
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching customer sales',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un resumen financiero del cliente
   * @route GET /api/customers/:id/financial-summary
   */
  async getCustomerFinancialSummary(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener el cliente para verificar permisos
      const customer = await customerService.getCustomerById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && customer.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view financial data of customers in other cities'
        });
      }
      
      const summary = await customerService.getCustomerFinancialSummary(id);
      
      res.status(200).json({
        success: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName
        },
        summary
      });
    } catch (error) {
      console.error('Get customer financial summary error:', error);
      
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching customer financial summary',
        error: error.message
      });
    }
  },
  
  /**
   * Verifica si un cliente tiene deudas pendientes
   * @route GET /api/customers/:id/check-debt
   */
  async checkCustomerDebt(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener el cliente para verificar permisos
      const customer = await customerService.getCustomerById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && customer.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to check debt for customers in other cities'
        });
      }
      
      const debtInfo = await customerService.checkCustomerDebt(id);
      
      res.status(200).json({
        success: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName
        },
        debtInfo
      });
    } catch (error) {
      console.error('Check customer debt error:', error);
      
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error checking customer debt',
        error: error.message
      });
    }
  },

  /**
   * Descarga un documento de cliente
   * @route GET /api/customers/documents/:documentId/download
   */
  async downloadDocument(req, res) {
    try {
      const { documentId } = req.params;
      
      // Obtener el documento
      const document = await CustomerDocument.findByPk(documentId, {
        include: [
          {
            model: Customer,
            as: 'customer'
          }
        ]
      });
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && document.customer.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to download documents from customers in other cities'
        });
      }
      
      // Ruta completa al archivo
      const filePath = path.join(__dirname, '../../', document.filePath);
      
      // Verificar si el archivo existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Document file not found'
        });
      }
      
      // Enviar el archivo al cliente
      res.download(filePath, document.fileName);
    } catch (error) {
      console.error('Download document error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error downloading document',
        error: error.message
      });
    }
  }
};

module.exports = customerController;