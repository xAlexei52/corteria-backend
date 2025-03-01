// src/controllers/recipeController.js
const recipeService = require('../services/recipeService');

const recipeController = {
  /**
   * Crea una nueva receta
   * @route POST /api/recipes
   */
  async createRecipe(req, res) {
    try {
      const { name, description, processingTime, supplies } = req.body;
      
      // Validación básica
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Recipe name is required'
        });
      }
      
      // Validar que supplies sea un array si está presente
      if (supplies && !Array.isArray(supplies)) {
        return res.status(400).json({
          success: false,
          message: 'Supplies must be an array'
        });
      }
      
      // Validar cada insumo
      if (supplies && supplies.length > 0) {
        for (const supply of supplies) {
          if (!supply.supplyId || supply.quantity === undefined) {
            return res.status(400).json({
              success: false,
              message: 'Each supply must have a supplyId and quantity'
            });
          }
          
          if (isNaN(supply.quantity) || supply.quantity <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Supply quantity must be a positive number'
            });
          }
        }
      }
      
      const recipe = await recipeService.createRecipe(
        {
          name,
          description,
          processingTime: processingTime || null
        },
        supplies
      );
      
      res.status(201).json({
        success: true,
        message: 'Recipe created successfully',
        recipe
      });
    } catch (error) {
      console.error('Create recipe error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error creating recipe',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene una receta por ID
   * @route GET /api/recipes/:id
   */
  async getRecipeById(req, res) {
    try {
      const { id } = req.params;
      
      const recipe = await recipeService.getRecipeById(id);
      
      res.status(200).json({
        success: true,
        recipe
      });
    } catch (error) {
      console.error('Get recipe error:', error);
      
      if (error.message === 'Recipe not found') {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error fetching recipe',
        error: error.message
      });
    }
  },
  
  /**
   * Lista recetas con filtros opcionales
   * @route GET /api/recipes
   */
  async listRecipes(req, res) {
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
      
      const result = await recipeService.listRecipes(filters, pagination);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('List recipes error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error listing recipes',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza una receta
   * @route PUT /api/recipes/:id
   */
  async updateRecipe(req, res) {
    try {
      const { id } = req.params;
      const { name, description, processingTime, supplies, active } = req.body;
      
      // Verificar que al menos un campo esté presente
      if (!name && description === undefined && processingTime === undefined && 
          supplies === undefined && active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be provided to update'
        });
      }
      
      // Validar que supplies sea un array si está presente
      if (supplies !== undefined && !Array.isArray(supplies)) {
        return res.status(400).json({
          success: false,
          message: 'Supplies must be an array'
        });
      }
      
      // Validar cada insumo
      if (supplies && supplies.length > 0) {
        for (const supply of supplies) {
          if (!supply.supplyId || supply.quantity === undefined) {
            return res.status(400).json({
              success: false,
              message: 'Each supply must have a supplyId and quantity'
            });
          }
          
          if (isNaN(supply.quantity) || supply.quantity <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Supply quantity must be a positive number'
            });
          }
        }
      }
      
      // Construir objeto con los campos a actualizar
      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (processingTime !== undefined) updateData.processingTime = processingTime;
      if (active !== undefined) updateData.active = active;
      
      const recipe = await recipeService.updateRecipe(id, updateData, supplies);
      
      res.status(200).json({
        success: true,
        message: 'Recipe updated successfully',
        recipe
      });
    } catch (error) {
      console.error('Update recipe error:', error);
      
      if (error.message === 'Recipe not found') {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating recipe',
        error: error.message
      });
    }
  },
  
  /**
   * Asigna una receta a un producto
   * @route POST /api/recipes/:recipeId/assign/:productId
   */
  async assignRecipeToProduct(req, res) {
    try {
      const { recipeId, productId } = req.params;
      
      const product = await recipeService.assignRecipeToProduct(productId, recipeId);
      
      res.status(200).json({
        success: true,
        message: 'Recipe assigned to product successfully',
        product
      });
    } catch (error) {
      console.error('Assign recipe error:', error);
      
      if (error.message === 'Recipe not found' || error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error assigning recipe to product',
        error: error.message
      });
    }
  }
};

module.exports = recipeController;