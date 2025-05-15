// src/models/Sale.js (actualizado)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sale = sequelize.define('Sale', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    saleNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'sale_number'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'partially_paid', 'cancelled'),
      defaultValue: 'pending'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'total_amount'
    },
    paidAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      field: 'paid_amount'
    },
    pendingAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'pending_amount'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'city_id'
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'customer_id'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by'
    }
  }, {
    tableName: 'sales',
    timestamps: true,
    underscored: true
  });

  Sale.associate = function(models) {
    Sale.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });

    Sale.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer'
    });

    Sale.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    Sale.hasMany(models.SaleDetail, {
      foreignKey: 'sale_id',
      as: 'details'
    });

    Sale.hasMany(models.Payment, {
      foreignKey: 'sale_id',
      as: 'payments'
    });
  };

  return Sale;
};