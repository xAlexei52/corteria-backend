// src/services/companyExpenseService.js
const { CompanyExpense, City, Usuario, sequelize } = require('../config/database');
const { Op } = require('sequelize');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Directorio para almacenar documentos de gastos
const UPLOADS_DIR = path.join(__dirname, '../../uploads/expenses');

// Crear el directorio si no existe
fs.ensureDirSync(UPLOADS_DIR);

const companyExpenseService = {
  /**
   * Crea un nuevo gasto de la empresa
   * @param {Object} expenseData - Datos del gasto
   * @param {Object} file - Archivo adjunto (opcional)
   * @param {string} userId - ID del usuario que crea el gasto
   * @returns {Promise<Object>} Gasto creado
   */
  async createExpense(expenseData, file, userId) {
    const transaction = await sequelize.transaction();
    
    try {
      // Verificar que la ciudad existe
      const city = await City.findByPk(expenseData.cityId);
      if (!city) {
        throw new Error('City not found');
      }
      
      // Si hay un archivo, procesarlo
      let fileData = {};
      if (file) {
        // Crear directorio para el mes actual
        const date = new Date();
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthDir = path.join(UPLOADS_DIR, yearMonth);
        await fs.ensureDir(monthDir);
        
        // Generar nombre único para el archivo
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(monthDir, fileName);
        
        // Guardar el archivo
        await fs.writeFile(filePath, file.buffer);
        
        fileData = {
          fileName: file.originalname,
          fileType: file.mimetype,
          filePath: `uploads/expenses/${yearMonth}/${fileName}`
        };
      }
      
      // Crear el gasto
      const expense = await CompanyExpense.create({
        ...expenseData,
        ...fileData,
        createdBy: userId
      }, { transaction });
      
      await transaction.commit();
      
      // Retornar el gasto con sus relaciones
      return await this.getExpenseById(expense.id);
      
    } catch (error) {
      await transaction.rollback();
      
      // Si hubo error y se creó un archivo, eliminarlo
      if (fileData.filePath) {
        try {
          await fs.remove(path.join(__dirname, '../../', fileData.filePath));
        } catch (fileError) {
          console.error('Error removing file after failed transaction:', fileError);
        }
      }
      
      throw error;
    }
  },

  /**
   * Obtiene un gasto por ID
   * @param {string} id - ID del gasto
   * @returns {Promise<Object>} Gasto encontrado
   */
  async getExpenseById(id) {
    const expense = await CompanyExpense.findByPk(id, {
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Usuario,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!expense) {
      throw new Error('Company expense not found');
    }
    
    return expense;
  },

  /**
   * Lista gastos con filtros opcionales
   * @param {Object} filters - Filtros para la búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Lista de gastos y metadatos de paginación
   */
  async listExpenses(filters = {}, pagination = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.cityId) {
      where.cityId = filters.cityId;
    }
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.startDate && filters.endDate) {
      where.date = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      where.date = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      where.date = { [Op.lte]: new Date(filters.endDate) };
    }
    
    if (filters.search) {
      where[Op.or] = [
        { referenceNumber: { [Op.like]: `%${filters.search}%` } },
        { notes: { [Op.like]: `%${filters.search}%` } }
      ];
    }
    
    // Configurar paginación
    const limit = pagination.limit || 10;
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;
    
    // Ejecutar consulta
    const { count, rows } = await CompanyExpense.findAndCountAll({
      where,
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'code']
        },
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
      expenses: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Actualiza un gasto
   * @param {string} id - ID del gasto
   * @param {Object} expenseData - Datos a actualizar
   * @param {Object} file - Nuevo archivo adjunto (opcional)
   * @returns {Promise<Object>} Gasto actualizado
   */
  async updateExpense(id, expenseData, file) {
    const transaction = await sequelize.transaction();
    
    try {
      const expense = await CompanyExpense.findByPk(id, { transaction });
      
      if (!expense) {
        throw new Error('Company expense not found');
      }
      
      // Si se proporciona nueva ciudad, verificar que existe
      if (expenseData.cityId && expenseData.cityId !== expense.cityId) {
        const city = await City.findByPk(expenseData.cityId);
        if (!city) {
          throw new Error('City not found');
        }
      }
      
      let fileData = {};
      let oldFilePath = null;
      
      // Si hay un nuevo archivo
      if (file) {
        // Guardar referencia del archivo anterior para eliminarlo después
        if (expense.filePath) {
          oldFilePath = path.join(__dirname, '../../', expense.filePath);
        }
        
        // Crear directorio para el mes actual
        const date = new Date();
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthDir = path.join(UPLOADS_DIR, yearMonth);
        await fs.ensureDir(monthDir);
        
        // Generar nombre único para el archivo
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(monthDir, fileName);
        
        // Guardar el archivo
        await fs.writeFile(filePath, file.buffer);
        
        fileData = {
          fileName: file.originalname,
          fileType: file.mimetype,
          filePath: `uploads/expenses/${yearMonth}/${fileName}`
        };
      }
      
      // Actualizar el gasto
      await expense.update({
        ...expenseData,
        ...fileData
      }, { transaction });
      
      await transaction.commit();
      
      // Si se actualizó el archivo, eliminar el anterior
      if (oldFilePath) {
        try {
          await fs.remove(oldFilePath);
        } catch (error) {
          console.error('Error removing old file:', error);
        }
      }
      
      return await this.getExpenseById(id);
      
    } catch (error) {
      await transaction.rollback();
      
      // Si hubo error y se creó un nuevo archivo, eliminarlo
      if (fileData.filePath) {
        try {
          await fs.remove(path.join(__dirname, '../../', fileData.filePath));
        } catch (fileError) {
          console.error('Error removing file after failed transaction:', fileError);
        }
      }
      
      throw error;
    }
  },

  /**
   * Elimina un gasto
   * @param {string} id - ID del gasto
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteExpense(id) {
    const transaction = await sequelize.transaction();
    
    try {
      const expense = await CompanyExpense.findByPk(id, { transaction });
      
      if (!expense) {
        throw new Error('Company expense not found');
      }
      
      // Guardar la ruta del archivo para eliminarlo después
      const filePath = expense.filePath ? path.join(__dirname, '../../', expense.filePath) : null;
      
      // Eliminar el registro
      await expense.destroy({ transaction });
      
      await transaction.commit();
      
      // Eliminar el archivo físico si existe
      if (filePath) {
        try {
          await fs.remove(filePath);
        } catch (error) {
          console.error('Error removing expense file:', error);
        }
      }
      
      return true;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de gastos
   * @param {Object} filters - Filtros para las estadísticas
   * @returns {Promise<Object>} Estadísticas de gastos
   */
  async getExpenseStatistics(filters = {}) {
    const where = {};
    
    // Aplicar filtros
    if (filters.cityId) {
      where.cityId = filters.cityId;
    }
    
    if (filters.startDate && filters.endDate) {
      where.date = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      where.date = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      where.date = { [Op.lte]: new Date(filters.endDate) };
    }
    
    // Total de gastos
    const totalStats = await CompanyExpense.findAll({
      where,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount']
      ],
      raw: true
    });
    
    // Gastos por categoría
    const byCategory = await CompanyExpense.findAll({
      where,
      attributes: [
        'category',
        [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });
    
    // Gastos por mes (últimos 12 meses)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    
    const byMonth = await CompanyExpense.findAll({
      where: {
        ...where,
        date: {
          [Op.gte]: twelveMonthsAgo
        }
      },
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'ASC']],
      raw: true
    });
    
    return {
      total: {
        amount: parseFloat(totalStats[0]?.totalAmount || 0),
        count: parseInt(totalStats[0]?.totalCount || 0)
      },
      byCategory: byCategory.map(cat => ({
        category: cat.category,
        amount: parseFloat(cat.amount || 0),
        count: parseInt(cat.count || 0)
      })),
      byMonth: byMonth.map(month => ({
        month: month.month,
        amount: parseFloat(month.amount || 0),
        count: parseInt(month.count || 0)
      }))
    };
  },

  /**
   * Descarga un archivo adjunto
   * @param {string} expenseId - ID del gasto
   * @returns {Promise<Object>} Información del archivo
   */
  async getExpenseFile(expenseId) {
    const expense = await CompanyExpense.findByPk(expenseId);
    
    if (!expense) {
      throw new Error('Company expense not found');
    }
    
    if (!expense.filePath) {
      throw new Error('This expense has no attached file');
    }
    
    const fullPath = path.join(__dirname, '../../', expense.filePath);
    
    // Verificar que el archivo existe
    if (!await fs.pathExists(fullPath)) {
      throw new Error('File not found on server');
    }
    
    return {
      path: fullPath,
      fileName: expense.fileName,
      fileType: expense.fileType
    };
  }
};

module.exports = companyExpenseService;