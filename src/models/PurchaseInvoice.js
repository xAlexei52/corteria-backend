// src/models/PurchaseInvoice.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PurchaseInvoice = sequelize.define('PurchaseInvoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    trailerEntryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'trailer_entry_id'
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'invoice_number',
      comment: 'Número de factura del proveedor'
    },
    amountMXN: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'amount_mxn',
      comment: 'Monto de la factura en pesos'
    },
    amountUSD: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'amount_usd',
      comment: 'Monto de la factura en dólares'
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'partial'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Estado de pago de la factura'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'purchase_invoices',
    timestamps: true,
    underscored: true
  });

  PurchaseInvoice.associate = (models) => {
    PurchaseInvoice.belongsTo(models.TrailerEntry, {
      foreignKey: 'trailer_entry_id',
      as: 'trailerEntry'
    });

    PurchaseInvoice.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return PurchaseInvoice;
};
