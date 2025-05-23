// src/controllers/companyExpenseController.js
const companyExpenseService = require('../services/companyExpenseService');
const multer = require('multer');
const path = require('path');

// Configuración de Multer para almacenar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Tipos de archivo permitidos
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan PDF, imágenes (JPEG, PNG, WEBP) y documentos de Word.'), false);
    }
  }
}).single('file');

const companyExpenseController = {
  /**
   * Crea un nuevo gasto
   * @route POST /api/company-expenses
   */
  async createExpense(req, res) {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      try {
        const { date, amount, referenceNumber, category, notes, cityId } = req.body;
        
        // Validación básica
        if (!amount) {
          return res.status(400).json({
            success: false,
            message: 'El monto es requerido'
          });
        }
        
        // Validar que el monto sea un número positivo
        if (isNaN(amount) || parseFloat(amount) <= 0) {
          return res.status(400).json({
            success: false,
            message: 'El monto debe ser un número positivo'
          });
        }
        
        // Usar la ciudad del usuario si no es admin
        const expenseCityId = req.user.role === 'admin' ? (cityId || req.user.cityId) : req.user.cityId;
        
        const expense = await companyExpenseService.createExpense(
          {
            date: date || new Date(),
            amount: parseFloat(amount),
            referenceNumber,
            category: category || 'other',
            notes,
            cityId: expenseCityId
          },
          req.file,
          req.user.id
        );
        
        res.status(201).json({
          success: true,
          message: 'Gasto registrado exitosamente',
          expense
        });
      } catch (error) {
        console.error('Error al crear gasto:', error);
        
        if (error.message === 'City not found') {
          return res.status(404).json({
            success: false,
            message: 'Ciudad no encontrada'
          });
        }
        
        res.status(500).json({
          success: false,
          message: 'Error al registrar el gasto',
          error: error.message
        });
      }
    });
  },
  
  /**
   * Obtiene un gasto por ID
   * @route GET /api/company-expenses/:id
   */
  async getExpenseById(req, res) {
    try {
      const { id } = req.params;
      
      const expense = await companyExpenseService.getExpenseById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && expense.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver gastos de otras ciudades'
        });
      }
      
      res.status(200).json({
        success: true,
        expense
      });
    } catch (error) {
      console.error('Error al obtener gasto:', error);
      
      if (error.message === 'Company expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al obtener el gasto',
        error: error.message
      });
    }
  },
  
  /**
   * Lista gastos con filtros opcionales
   * @route GET /api/company-expenses
   */
  async listExpenses(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        category, 
        startDate, 
        endDate,
        cityId
      } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      const filters = {
        search,
        category,
        startDate,
        endDate,
        cityId: userRole === 'admin' ? (cityId || undefined) : userCityId
      };
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await companyExpenseService.listExpenses(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error al listar gastos:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error al listar los gastos',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un gasto
   * @route PUT /api/company-expenses/:id
   */
  async updateExpense(req, res) {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      try {
        const { id } = req.params;
        const { date, amount, referenceNumber, category, notes, cityId } = req.body;
        
        // Obtener el gasto actual para verificar permisos
        const currentExpense = await companyExpenseService.getExpenseById(id);
        
        // Verificar permisos por ciudad
        if (req.user.role !== 'admin' && currentExpense.cityId !== req.user.cityId) {
          return res.status(403).json({
            success: false,
            message: 'No tienes permiso para actualizar gastos de otras ciudades'
          });
        }
        
        // Construir objeto con los campos a actualizar
        const updateData = {};
        if (date) updateData.date = date;
        if (amount !== undefined) {
          // Validar que el monto sea un número positivo
          if (isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({
              success: false,
              message: 'El monto debe ser un número positivo'
            });
          }
          updateData.amount = parseFloat(amount);
        }
        if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber;
        if (category) updateData.category = category;
        if (notes !== undefined) updateData.notes = notes;
        
        // Solo el admin puede cambiar la ciudad
        if (req.user.role === 'admin' && cityId) {
          updateData.cityId = cityId;
        }
        
        const expense = await companyExpenseService.updateExpense(id, updateData, req.file);
        
        res.status(200).json({
          success: true,
          message: 'Gasto actualizado exitosamente',
          expense
        });
      } catch (error) {
        console.error('Error al actualizar gasto:', error);
        
        if (error.message === 'Company expense not found') {
          return res.status(404).json({
            success: false,
            message: 'Gasto no encontrado'
          });
        }
        
        if (error.message === 'City not found') {
          return res.status(404).json({
            success: false,
            message: 'Ciudad no encontrada'
          });
        }
        
        res.status(500).json({
          success: false,
          message: 'Error al actualizar el gasto',
          error: error.message
        });
      }
    });
  },
  
  /**
   * Elimina un gasto
   * @route DELETE /api/company-expenses/:id
   */
  async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener el gasto para verificar permisos
      const expense = await companyExpenseService.getExpenseById(id);
      
      // Solo el admin puede eliminar gastos
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden eliminar gastos'
        });
      }
      
      await companyExpenseService.deleteExpense(id);
      
      res.status(200).json({
        success: true,
        message: 'Gasto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      
      if (error.message === 'Company expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el gasto',
        error: error.message
      });
    }
  },
  
  /**
   * Descarga el archivo adjunto de un gasto
   * @route GET /api/company-expenses/:id/download
   */
  async downloadFile(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener el gasto para verificar permisos
      const expense = await companyExpenseService.getExpenseById(id);
      
      // Verificar permisos por ciudad
      if (req.user.role !== 'admin' && expense.cityId !== req.user.cityId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para descargar archivos de gastos de otras ciudades'
        });
      }
      
      const fileInfo = await companyExpenseService.getExpenseFile(id);
      
      // Configurar headers para la descarga
      res.setHeader('Content-Type', fileInfo.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      
      // Enviar el archivo
      res.sendFile(fileInfo.path);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      
      if (error.message === 'Company expense not found') {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }
      
      if (error.message === 'This expense has no attached file') {
        return res.status(404).json({
          success: false,
          message: 'Este gasto no tiene archivo adjunto'
        });
      }
      
      if (error.message === 'File not found on server') {
        return res.status(404).json({
          success: false,
          message: 'El archivo no se encuentra en el servidor'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al descargar el archivo',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene estadísticas de gastos
   * @route GET /api/company-expenses/statistics
   */
  async getStatistics(req, res) {
    try {
      const { startDate, endDate, cityId } = req.query;
      
      // Filtrar por ciudad según el rol
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      const filters = {
        startDate,
        endDate,
        cityId: userRole === 'admin' ? (cityId || undefined) : userCityId
      };
      
      const statistics = await companyExpenseService.getExpenseStatistics(filters);
      
      res.status(200).json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas',
        error: error.message
      });
    }
  }
};

module.exports = companyExpenseController;