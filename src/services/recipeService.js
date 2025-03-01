// src/services/recipeService.js
const { Recipe, RecipeSupply, Supply, Product, sequelize } = require('../config/database');
const { Op } = require('sequelize');

const recipeService = {
  /**
   * Crea una nueva receta con sus insumos
   * @param {Object} recipeData - Datos de la receta
   * @param {Array} supplies - Lista de insumos con sus cantidades
   * @returns {Promise<Object>} Receta creada con sus insumos
   */
  async createRecipe(recipeData, supplies = []) {
    const transaction = await sequelize.transaction();
    
    try {
      // Crear la receta
      const recipe = await Recipe.create(recipeData, { transaction });
      
      // Agregar insumos a la receta
      if (supplies && supplies.length > 0) {
        const recipeSupplies = supplies.map(supply => ({
          recipeId: recipe.id,
          supplyId: supply.supplyId,
          quantity: supply.quantity
        }));
        
        await RecipeSupply.bulkCreate(recipeSupplies, { transaction });
      }
      
      await transaction.commit();
      
      // Obtener la receta completa con sus insumos
      return await this.getRecipeById(recipe.id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtiene una receta por ID con sus insumos
   * @param {string} id - ID de la receta
   * @returns {Promise<Object>} Receta encontrada con sus insumos
   */
  async getRecipeById(id) {
    const recipe = await Recipe.findByPk(id, {
      include: [
        {
          model: RecipeSupply,
          as: 'supplies',
          include: [
            {
              model: Supply,
              as: 'supply'
            }
          ]
        },
        {
          model: Product,
          as: 'products'
        }
      ]
    });
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    
    return recipe;
  },

  /**
   * Lista recetas con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de recetas y metadatos de paginación
   */
  async listRecipes(filters = {}, pagination = {}) {
    const where = {};
    
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
    const { count, rows } = await Recipe.findAndCountAll({
      where,
      include: [
        {
          model: Product,
          as: 'products'
        }
      ],
      order: [['name', 'ASC']],
      limit,
      offset
    });
    
    return {
      recipes: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza una receta
   * @param {string} id - ID de la receta
   * @param {Object} recipeData - Datos a actualizar de la receta
   * @param {Array} supplies - Lista actualizada de insumos (opcional)
   * @returns {Promise<Object>} Receta actualizada
   */
  async updateRecipe(id, recipeData, supplies) {
    const transaction = await sequelize.transaction();
    
    try {
      const recipe = await Recipe.findByPk(id);
      
      if (!recipe) {
        await transaction.rollback();
        throw new Error('Recipe not found');
      }
      
      // Actualizar datos básicos de la receta
      await recipe.update(recipeData, { transaction });
      
      // Si se proporcionaron insumos, actualizar la relación
      if (supplies) {
        // Eliminar insumos existentes
        await RecipeSupply.destroy({
          where: { recipeId: id },
          transaction
        });
        
        // Agregar nuevos insumos
        if (supplies.length > 0) {
          const recipeSupplies = supplies.map(supply => ({
            recipeId: id,
            supplyId: supply.supplyId,
            quantity: supply.quantity
          }));
          
          await RecipeSupply.bulkCreate(recipeSupplies, { transaction });
        }
      }
      
      await transaction.commit();
      
      // Obtener la receta actualizada con sus insumos
      return await this.getRecipeById(id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Asocia un producto a una receta
   * @param {string} productId - ID del producto
   * @param {string} recipeId - ID de la receta
   * @returns {Promise<Object>} Producto actualizado
   */
  async assignRecipeToProduct(productId, recipeId) {
    // Verificar que existan producto y receta
    const [product, recipe] = await Promise.all([
      Product.findByPk(productId),
      Recipe.findByPk(recipeId)
    ]);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    
    // Actualizar la asociación
    await product.update({ recipeId });
    
    return product;
  }
};

module.exports = recipeService;