// src/services/purchaseInvoiceService.js
const { PurchaseInvoice, TrailerEntry, Usuario, sequelize } = require('../config/database');

const purchaseInvoiceService = {
  /**
   * Obtiene la factura de compra asociada a una entrada de trailer
   */
  async getByEntry(trailerEntryId) {
    const entry = await TrailerEntry.findByPk(trailerEntryId);
    if (!entry) {
      throw new Error('Trailer entry not found');
    }

    const invoice = await PurchaseInvoice.findOne({
      where: { trailerEntryId },
      include: [{ model: Usuario, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }]
    });

    if (!invoice) {
      throw new Error('Purchase invoice not found');
    }

    return invoice;
  },

  /**
   * Actualiza la factura de compra de una entrada de trailer
   */
  async updateByEntry(trailerEntryId, invoiceData) {
    const invoice = await PurchaseInvoice.findOne({ where: { trailerEntryId } });

    if (!invoice) {
      throw new Error('Purchase invoice not found');
    }

    const allowedFields = ['invoiceNumber', 'amountMXN', 'amountUSD', 'status', 'notes'];
    const updateData = {};
    allowedFields.forEach(field => {
      if (invoiceData[field] !== undefined) updateData[field] = invoiceData[field];
    });

    await invoice.update(updateData);

    return await PurchaseInvoice.findByPk(invoice.id, {
      include: [{ model: Usuario, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }]
    });
  }
};

module.exports = purchaseInvoiceService;
