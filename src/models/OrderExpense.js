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
    }
  }, {
    tableName: 'order_expenses',
    timestamps: true,
    underscored: true
  });

  OrderExpense.associate = (models) => {
    OrderExpense.belongsTo(models.ManufacturingOrder, {
      foreignKey: 'manufacturing_order_id',
      as: 'manufacturingOrder'
    });
  };

  return OrderExpense;
};