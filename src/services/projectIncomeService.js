// src/services/projectIncomeService.js
const { ProjectIncome, Project, Usuario } = require('../config/database');
const { Op } = require('sequelize');

const projectIncomeService = {
  /**
   * Registra un nuevo ingreso en un proyecto
   * @param {Object} incomeData - Datos del ingreso
   * @param {string} userId - ID del usuario que registra el ingreso
   * @returns {Promise<Object>} Ingreso registrado
   */
  async createIncome(incomeData, userId) {
    // Verificar que el proyecto existe
    const project = await Project.findByPk(incomeData.projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Crear el ingreso
    const income = await ProjectIncome.create({
      ...incomeData,
      createdBy: userId
    });
    
    return await this.getIncomeById(income.id);
  },

  /**
   * Obtiene un ingreso por ID
   * @param {string} id - ID del ingreso
   * @returns {Promise<Object>} Ingreso encontrado
   */
  async getIncomeById(id) {
    const income = await ProjectIncome.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!income) {
      throw new Error('Income not found');
    }
    
    return income;
  },

  /**
   * Lista ingresos de un proyecto con filtros opcionales
   * @param {string} projectId - ID del proyecto
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de ingresos y metadatos de paginación
   */
  async listIncomes(projectId, filters = {}, pagination = {}) {
    const where = { projectId };
    
    // Aplicar filtros
    if (filters.startDate && filters.endDate) {
      where.date = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      where.date = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      where.date = { [Op.lte]: new Date(filters.endDate) };
    }
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.search) {
      where.description = { [Op.like]: `%${filters.search}%` };
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await ProjectIncome.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['date', 'DESC']],
      limit,
      offset
    });
    
    return {
      incomes: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un ingreso
   * @param {string} id - ID del ingreso
   * @param {Object} incomeData - Datos a actualizar
   * @returns {Promise<Object>} Ingreso actualizado
   */
  async updateIncome(id, incomeData) {
    const income = await ProjectIncome.findByPk(id);
    
    if (!income) {
      throw new Error('Income not found');
    }
    
    await income.update(incomeData);
    
    return await this.getIncomeById(id);
  },

  /**
   * Elimina un ingreso
   * @param {string} id - ID del ingreso
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteIncome(id) {
    const income = await ProjectIncome.findByPk(id);
    
    if (!income) {
      throw new Error('Income not found');
    }
    
    await income.destroy();
    
    return true;
  }
};

module.exports = projectIncomeService;