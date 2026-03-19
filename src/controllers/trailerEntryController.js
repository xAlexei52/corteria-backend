// src/controllers/trailerEntryController.js (actualizado para cityId)
const trailerEntryService = require('../services/trailerEntryService');

const trailerEntryController = {
  /**
   * Crea una nueva entrada de trailer
   * @route POST /api/trailer-entries
   */
  async createEntry(req, res) {
    try {
      const {
        date, productId, supplier, boxes, kilos, reference, cityId,
        needsProcessing, entryCost, targetWarehouseId,
        entryType, pedimentoNumber, purchaseInvoiceNumber, weightUnit,
        entryCostMXN, entryCostUSD
      } = req.body;
      
      // Validación básica
      if (!productId || !supplier || !boxes || !kilos || !cityId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, supplier, boxes, kilos, and cityId are required'
        });
      }
      
      // Verificar datos numéricos
      if (isNaN(boxes) || isNaN(kilos) || boxes <= 0 || kilos <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Boxes and kilos must be positive numbers'
        });
      }
      
      // Validar costo si se proporciona
      if (entryCost !== undefined && (isNaN(entryCost) || entryCost < 0)) {
        return res.status(400).json({
          success: false,
          message: 'Entry cost must be a non-negative number'
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
          cityId,
          needsProcessing: needsProcessing !== undefined ? needsProcessing : true,
          entryCost,
          entryType: entryType || 'trailer',
          pedimentoNumber: pedimentoNumber || null,
          purchaseInvoiceNumber: purchaseInvoiceNumber || null,
          weightUnit: weightUnit || 'kg',
          entryCostMXN: entryCostMXN || null,
          entryCostUSD: entryCostUSD || null
        },
        req.user.id
      );
      
      res.status(201).json({
        success: true,
        message: 'Trailer entry created successfully',
        entry
      });
    } catch (error) {
      console.error('Create trailer entry error:', error);
      
      if (error.message === 'Product not found' || 
          error.message === 'Target warehouse not found' ||
          error.message.includes('Target warehouse is required') ||
          error.message.includes('City not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
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
      if (req.user.role !== 'admin' && entry.cityId !== req.user.cityId) {
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
        cityId,
        needsProcessing,
        processingStatus
      } = req.query;
      
      // Si no es admin, filtrar por ciudad del usuario
      const userCityId = req.user.cityId;
      const userRole = req.user.role;
      
      const filters = {
        supplier,
        productId,
        startDate,
        endDate,
        processingStatus
      };
      
      // Convertir needsProcessing a booleano si se proporciona
      if (needsProcessing !== undefined) {
        filters.needsProcessing = needsProcessing === 'true';
      }
      
      // Aplicar filtro de ciudad según rol
      filters.cityId = userRole === 'admin' ? (cityId || undefined) : userCityId;
      
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
      const {
        date, productId, supplier, boxes, kilos, reference,
        needsProcessing, entryCost, targetWarehouseId, cityId,
        entryType, pedimentoNumber, purchaseInvoiceNumber, weightUnit,
        entryCostMXN, entryCostUSD
      } = req.body;
      
      // Obtener la entrada para verificar permisos
      const currentEntry = await trailerEntryService.getEntryById(id);
      
      // Verificar si el usuario tiene acceso según la ciudad
      if (req.user.role !== 'admin' && currentEntry.cityId !== req.user.cityId) {
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
      if (needsProcessing !== undefined) updateData.needsProcessing = needsProcessing;
      if (entryCost !== undefined) updateData.entryCost = entryCost;
      if (targetWarehouseId) updateData.targetWarehouseId = targetWarehouseId;
      
      // Solo el admin puede cambiar la ciudad
      if (req.user.role === 'admin' && cityId) {
        updateData.cityId = cityId;
      }
      
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
      if (entryType !== undefined) updateData.entryType = entryType;
      if (pedimentoNumber !== undefined) updateData.pedimentoNumber = pedimentoNumber;
      if (purchaseInvoiceNumber !== undefined) updateData.purchaseInvoiceNumber = purchaseInvoiceNumber;
      if (weightUnit !== undefined) updateData.weightUnit = weightUnit;
      if (entryCostMXN !== undefined) updateData.entryCostMXN = entryCostMXN;
      if (entryCostUSD !== undefined) updateData.entryCostUSD = entryCostUSD;
      
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
      
      if (error.message.includes('Cannot change processing requirement') ||
          error.message.includes('Target warehouse is required') ||
          error.message === 'Target warehouse not found' ||
          error.message.includes('City not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
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
      if (req.user.role !== 'admin' && currentEntry.cityId !== req.user.cityId) {
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
      
      if (error.message.includes('Cannot delete trailer entry with manufacturing orders')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting trailer entry',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene las entradas de trailer con kilos disponibles para procesar
   * @route GET /api/trailer-entries/available
   */
  async getAvailableEntries(req, res) {
    try {
      const { productId, city } = req.query;
      
      // Si no es admin, filtrar por ciudad del usuario
      const filters = {
        productId
      };
      
      // Aplicar filtro de ciudad según rol
      if (req.user.role !== 'admin') {
        filters.city = req.user.city;
      } else if (city) {
        filters.city = city;
      }
      
      const entries = await trailerEntryService.getAvailableEntries(filters);
      
      res.status(200).json({
        success: true,
        entries
      });
    } catch (error) {
      console.error('Get available entries error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fetching available entries',
        error: error.message
      });
    }
  }
};

module.exports = trailerEntryController;