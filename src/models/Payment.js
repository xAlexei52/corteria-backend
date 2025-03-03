// src/models/Payment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'credit_card', 'bank_transfer', 'check', 'other'),
      allowNull: false,
      field: 'payment_method'
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reference_number'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'customer_id'
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sale_id'
    },
    receivedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'received_by'
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true
  });

  Payment.associate = function(models) {
    Payment.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer'
    });

    Payment.belongsTo(models.Sale, {
      foreignKey: 'sale_id',
      as: 'sale'
    });

    Payment.belongsTo(models.Usuario, {
      foreignKey: 'received_by',
      as: 'receiver'
    });
  };

  return Payment;
};