// src/models/OrderExpense.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderExpense = sequelize.define('OrderExpense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('supply', 'fixed', 'other'),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Campo para asociación
    manufacturingOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'manufacturing_order_id'
    }
  }, {
    tableName: 'order_expenses',
    timestamps: true,
    underscored: true
  });

  OrderExpense.associate = function(models) {
    OrderExpense.belongsTo(models.ManufacturingOrder, {
      foreignKey: 'manufacturing_order_id',
      as: 'manufacturingOrder'
    });
  };

  return OrderExpense;
};