// src/services/trailerEntryCostService.js
const { TrailerEntryCost, TrailerEntry, Usuario, sequelize } = require('../config/database');

const trailerEntryCostService = {
  /**
   * Crea un costo para una entrada de trailer
   */
  async createCost(trailerEntryId, costData, userId) {
    const transaction = await sequelize.transaction();

    try {
      const entry = await TrailerEntry.findByPk(trailerEntryId, { transaction });
      if (!entry) {
        throw new Error('Trailer entry not found');
      }

      const cost = await TrailerEntryCost.create({
        ...costData,
        trailerEntryId,
        createdBy: userId
      }, { transaction });

      await transaction.commit();

      return await TrailerEntryCost.findByPk(cost.id, {
        include: [{ model: Usuario, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Lista todos los costos de una entrada de trailer
   */
  async listCostsByEntry(trailerEntryId) {
    const entry = await TrailerEntry.findByPk(trailerEntryId);
    if (!entry) {
      throw new Error('Trailer entry not found');
    }

    return await TrailerEntryCost.findAll({
      where: { trailerEntryId },
      include: [{ model: Usuario, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'ASC']]
    });
  },

  /**
   * Obtiene un costo por ID
   */
  async getCostById(id) {
    const cost = await TrailerEntryCost.findByPk(id, {
      include: [
        { model: TrailerEntry, as: 'trailerEntry' },
        { model: Usuario, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!cost) {
      throw new Error('Trailer entry cost not found');
    }

    return cost;
  },

  /**
   * Actualiza un costo
   */
  async updateCost(id, costData) {
    const cost = await TrailerEntryCost.findByPk(id);
    if (!cost) {
      throw new Error('Trailer entry cost not found');
    }

    await cost.update(costData);

    return await TrailerEntryCost.findByPk(id, {
      include: [{ model: Usuario, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }]
    });
  },

  /**
   * Elimina un costo
   */
  async deleteCost(id) {
    const cost = await TrailerEntryCost.findByPk(id);
    if (!cost) {
      throw new Error('Trailer entry cost not found');
    }

    await cost.destroy();
    return true;
  }
};

module.exports = trailerEntryCostService;
