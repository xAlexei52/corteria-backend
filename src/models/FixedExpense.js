// src/models/FixedExpense.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FixedExpense = sequelize.define('FixedExpense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    period: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
      defaultValue: 'monthly'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'fixed_expenses',
    timestamps: true,
    underscored: true
  });

  return FixedExpense;
};