// src/controllers/trailerEntryController.js
const trailerEntryService = require('../services/trailerEntryService');

const trailerEntryController = {
  /**
   * Crea una nueva entrada de trailer
   * @route POST /api/trailer-entries
   */
  async createEntry(req, res) {
    try {
      const { date, productId, supplier, boxes, kilos, reference, city } = req.body;
      
      // Validación básica
      if (!productId || !supplier || !boxes || !kilos || !city) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, supplier, boxes, kilos, and city are required'
        });
      }
      
      // Verificar datos numéricos
      if (isNaN(boxes) || isNaN(kilos) || boxes <= 0 || kilos <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Boxes and kilos must be positive numbers'
        });
      }
      
      const entry = await trailerEntryService.createEntry(
        {
          date: date || new Date(),
          productId,
          supplier,
          boxes,
          kilos,
          reference,
          city
        },
        req.user.id // ID del usuario autenticado
      );
      
      res.status(201).json({
        success: true,
        message: 'Trailer entry created successfully',
        entry
      });
    } catch (error) {
      console.error('Create trailer entry error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating trailer entry',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene una entrada por ID
   * @route GET /api/trailer-entries/:id
   */
  async getEntryById(req, res) {
    try {
      const { id } = req.params;
      
      const entry = await trailerEntryService.getEntryById(id);
      
      // Verificar si el usuario tiene acceso según la ciudad
      if (req.user.role !== 'admin' && entry.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this entry'
        });
      }
      
      res.status(200).json({
        success: true,
        entry
      });
    } catch (error) {
      console.error('Get trailer entry error:', error);
      
      if (error.message === 'Trailer entry not found') {
        return res.status(404).json({
          success: false,
          message: 'Trailer entry not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching trailer entry',
        error: error.message
      });
    }
  },
  
  /**
   * Lista entradas con filtros opcionales
   * @route GET /api/trailer-entries
   */
  async listEntries(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        supplier, 
        productId, 
        startDate, 
        endDate, 
        city 
      } = req.query;
      
      // Si no es admin, filtrar por ciudad del usuario
      const filters = {
        supplier,
        productId,
        startDate,
        endDate
      };
      
      // Aplicar filtro de ciudad según rol
      if (req.user.role !== 'admin') {
        filters.city = req.user.city;
      } else if (city) {
        filters.city = city;
      }
      
      const pagination = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      };
      
      const result = await trailerEntryService.listEntries(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List trailer entries error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing trailer entries',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza una entrada
   * @route PUT /api/trailer-entries/:id
   */
  async updateEntry(req, res) {
    try {
      const { id } = req.params;
      const { date, productId, supplier, boxes, kilos, reference } = req.body;
      
      // Obtener la entrada para verificar permisos
      const currentEntry = await trailerEntryService.getEntryById(id);
      
      // Verificar si el usuario tiene acceso según la ciudad
      if (req.user.role !== 'admin' && currentEntry.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this entry'
        });
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (date) updateData.date = date;
      if (productId) updateData.productId = productId;
      if (supplier) updateData.supplier = supplier;
      if (boxes !== undefined) {
        if (isNaN(boxes) || boxes <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Boxes must be a positive number'
          });
        }
        updateData.boxes = boxes;
      }
      if (kilos !== undefined) {
        if (isNaN(kilos) || kilos <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Kilos must be a positive number'
          });
        }
        updateData.kilos = kilos;
      }
      if (reference !== undefined) updateData.reference = reference;
      
      // No permitir cambiar la ciudad
      const entry = await trailerEntryService.updateEntry(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Trailer entry updated successfully',
        entry
      });
    } catch (error) {
      console.error('Update trailer entry error:', error);
      
      if (error.message === 'Trailer entry not found') {
        return res.status(404).json({
          success: false,
          message: 'Trailer entry not found'
        });
      }
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating trailer entry',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina una entrada
   * @route DELETE /api/trailer-entries/:id
   */
  async deleteEntry(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener la entrada para verificar permisos
      const currentEntry = await trailerEntryService.getEntryById(id);
      
      // Verificar si el usuario tiene acceso según la ciudad
      if (req.user.role !== 'admin' && currentEntry.city !== req.user.city) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this entry'
        });
      }
      
      await trailerEntryService.deleteEntry(id);
      
      res.status(200).json({
        success: true,
        message: 'Trailer entry deleted successfully'
      });
    } catch (error) {
      console.error('Delete trailer entry error:', error);
      
      if (error.message === 'Trailer entry not found') {
        return res.status(404).json({
          success: false,
          message: 'Trailer entry not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting trailer entry',
        error: error.message
      });
    }
  }
};

module.exports = trailerEntryController;