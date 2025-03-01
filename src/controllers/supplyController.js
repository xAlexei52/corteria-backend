// src/controllers/supplyController.js
const supplyService = require('../services/supplyService');

const supplyController = {
  /**
   * Crea un nuevo insumo
   * @route POST /api/supplies
   */
  async createSupply(req, res) {
    try {
      const { name, description, unit, costPerUnit } = req.body;
      
      // Validación básica
      if (!name || !unit || costPerUnit === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Name, unit, and cost per unit are required'
        });
      }
      
      // Validar que el costo sea un número positivo
      if (isNaN(costPerUnit) || costPerUnit < 0) {
        return res.status(400).json({
          success: false,
          message: 'Cost per unit must be a positive number'
        });
      }
      
      const supply = await supplyService.createSupply({
        name,
        description,
        unit,
        costPerUnit
      });
      
      res.status(201).json({
        success: true,
        message: 'Supply created successfully',
        supply
      });
    } catch (error) {
      console.error('Create supply error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error creating supply',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene un insumo por ID
   * @route GET /api/supplies/:id
   */
  async getSupplyById(req, res) {
    try {
      const { id } = req.params;
      
      const supply = await supplyService.getSupplyById(id);
      
      res.status(200).json({
        success: true,
        supply
      });
    } catch (error) {
      console.error('Get supply error:', error);
      
      if (error.message === 'Supply not found') {
        return res.status(404).json({
          success: false,
          message: 'Supply not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching supply',
        error: error.message
      });
    }
  },
  
  /**
   * Lista insumos con filtros opcionales
   * @route GET /api/supplies
   */
  async listSupplies(req, res) {
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
      
      const result = await supplyService.listSupplies(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List supplies error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing supplies',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza un insumo
   * @route PUT /api/supplies/:id
   */
  async updateSupply(req, res) {
    try {
      const { id } = req.params;
      const { name, description, unit, costPerUnit, active } = req.body;
      
      // Verificar que al menos un campo esté presente
      if (!name && description === undefined && unit === undefined && 
          costPerUnit === undefined && active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be provided to update'
        });
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (unit) updateData.unit = unit;
      
      if (costPerUnit !== undefined) {
        // Validar que el costo sea un número positivo
        if (isNaN(costPerUnit) || costPerUnit < 0) {
          return res.status(400).json({
            success: false,
            message: 'Cost per unit must be a positive number'
          });
        }
        updateData.costPerUnit = costPerUnit;
      }
      
      if (active !== undefined) updateData.active = active;
      
      const supply = await supplyService.updateSupply(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Supply updated successfully',
        supply
      });
    } catch (error) {
      console.error('Update supply error:', error);
      
      if (error.message === 'Supply not found') {
        return res.status(404).json({
          success: false,
          message: 'Supply not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating supply',
        error: error.message
      });
    }
  }
};

module.exports = supplyController;