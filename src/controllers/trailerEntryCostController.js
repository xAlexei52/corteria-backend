// src/controllers/trailerEntryCostController.js
const trailerEntryCostService = require('../services/trailerEntryCostService');

const trailerEntryCostController = {
  /**
   * Crea un costo para una entrada de trailer
   * @route POST /api/trailer-entries/:entryId/costs
   */
  async createCost(req, res) {
    try {
      const { entryId } = req.params;
      const { concept, amount, currency, notes } = req.body;

      if (!concept || amount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Concept and amount are required'
        });
      }

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      const cost = await trailerEntryCostService.createCost(
        entryId,
        { concept, amount, currency: currency || 'MXN', notes },
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'Cost created successfully',
        cost
      });
    } catch (error) {
      console.error('Create trailer entry cost error:', error);

      if (error.message === 'Trailer entry not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating cost',
        error: error.message
      });
    }
  },

  /**
   * Lista los costos de una entrada de trailer
   * @route GET /api/trailer-entries/:entryId/costs
   */
  async listCosts(req, res) {
    try {
      const { entryId } = req.params;
      const costs = await trailerEntryCostService.listCostsByEntry(entryId);

      res.status(200).json({ success: true, costs });
    } catch (error) {
      console.error('List trailer entry costs error:', error);

      if (error.message === 'Trailer entry not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Error listing costs',
        error: error.message
      });
    }
  },

  /**
   * Actualiza un costo
   * @route PUT /api/trailer-entries/:entryId/costs/:id
   */
  async updateCost(req, res) {
    try {
      const { id } = req.params;
      const { concept, amount, currency, notes } = req.body;

      const updateData = {};
      if (concept !== undefined) updateData.concept = concept;
      if (amount !== undefined) {
        if (isNaN(amount) || amount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number'
          });
        }
        updateData.amount = amount;
      }
      if (currency !== undefined) updateData.currency = currency;
      if (notes !== undefined) updateData.notes = notes;

      const cost = await trailerEntryCostService.updateCost(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Cost updated successfully',
        cost
      });
    } catch (error) {
      console.error('Update trailer entry cost error:', error);

      if (error.message === 'Trailer entry cost not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating cost',
        error: error.message
      });
    }
  },

  /**
   * Elimina un costo
   * @route DELETE /api/trailer-entries/:entryId/costs/:id
   */
  async deleteCost(req, res) {
    try {
      const { id } = req.params;
      await trailerEntryCostService.deleteCost(id);

      res.status(200).json({
        success: true,
        message: 'Cost deleted successfully'
      });
    } catch (error) {
      console.error('Delete trailer entry cost error:', error);

      if (error.message === 'Trailer entry cost not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting cost',
        error: error.message
      });
    }
  }
};

module.exports = trailerEntryCostController;
