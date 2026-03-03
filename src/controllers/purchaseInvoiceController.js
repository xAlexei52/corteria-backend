// src/controllers/purchaseInvoiceController.js
const purchaseInvoiceService = require('../services/purchaseInvoiceService');

const purchaseInvoiceController = {
  /**
   * Obtiene la factura de compra de una entrada de trailer
   * @route GET /api/trailer-entries/:entryId/purchase-invoice
   */
  async getByEntry(req, res) {
    try {
      const { entryId } = req.params;
      const invoice = await purchaseInvoiceService.getByEntry(entryId);

      res.status(200).json({ success: true, invoice });
    } catch (error) {
      console.error('Get purchase invoice error:', error);

      if (error.message === 'Trailer entry not found' || error.message === 'Purchase invoice not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Error fetching purchase invoice',
        error: error.message
      });
    }
  },

  /**
   * Actualiza la factura de compra de una entrada de trailer
   * @route PUT /api/trailer-entries/:entryId/purchase-invoice
   */
  async updateByEntry(req, res) {
    try {
      const { entryId } = req.params;
      const { invoiceNumber, amountMXN, amountUSD, status, notes } = req.body;

      const invoice = await purchaseInvoiceService.updateByEntry(entryId, {
        invoiceNumber,
        amountMXN,
        amountUSD,
        status,
        notes
      });

      res.status(200).json({
        success: true,
        message: 'Purchase invoice updated successfully',
        invoice
      });
    } catch (error) {
      console.error('Update purchase invoice error:', error);

      if (error.message === 'Purchase invoice not found') {
        return res.status(404).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating purchase invoice',
        error: error.message
      });
    }
  }
};

module.exports = purchaseInvoiceController;
