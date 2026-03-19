// src/controllers/cityController.js
const cityService = require('../services/cityService');

const cityController = {
  /**
   * Crea una nueva ciudad
   * @route POST /api/cities
   */
  async createCity(req, res) {
    try {
      const { name, code } = req.body;
      
      // Validación básica
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'City name and code are required'
        });
      }
      
      const city = await cityService.createCity({
        name,
        code
      });
      
      res.status(201).json({
        success: true,
        message: 'City created successfully',
        city
      });
    } catch (error) {
      console.error('Create city error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating city',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene una ciudad por ID
   * @route GET /api/cities/:id
   */
  async getCityById(req, res) {
    try {
      const { id } = req.params;
      
      const city = await cityService.getCityById(id);
      
      res.status(200).json({
        success: true,
        city
      });
    } catch (error) {
      console.error('Get city error:', error);
      
      if (error.message === 'City not found') {
        return res.status(404).json({
          success: false,
          message: 'City not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching city',
        error: error.message
      });
    }
  },
  
  /**
   * Lista ciudades con filtros opcionales
   * @route GET /api/cities
   */
  async listCities(req, res) {
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
      
      const result = await cityService.listCities(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List cities error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing cities',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza una ciudad
   * @route PUT /api/cities/:id
   */
  async updateCity(req, res) {
    try {
      const { id } = req.params;
      const { name, code, active } = req.body;
      
      // Verificar que al menos un campo esté presente
      if (!name && !code && active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be provided to update'
        });
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (name) updateData.name = name;
      if (code) updateData.code = code;
      if (active !== undefined) updateData.active = active;
      
      const city = await cityService.updateCity(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'City updated successfully',
        city
      });
    } catch (error) {
      console.error('Update city error:', error);
      
      if (error.message === 'City not found') {
        return res.status(404).json({
          success: false,
          message: 'City not found'
        });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating city',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina una ciudad (desactivación lógica)
   * @route DELETE /api/cities/:id
   */
  async deleteCity(req, res) {
    try {
      const { id } = req.params;
      
      await cityService.deleteCity(id);
      
      res.status(200).json({
        success: true,
        message: 'City deleted successfully'
      });
    } catch (error) {
      console.error('Delete city error:', error);
      
      if (error.message === 'City not found') {
        return res.status(404).json({
          success: false,
          message: 'City not found'
        });
      }
      
      if (error.message.includes('Cannot delete city with associated')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting city',
        error: error.message
      });
    }
  }
};

module.exports = cityController;