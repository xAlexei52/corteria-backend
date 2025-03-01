// src/models/Supply.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Supply = sequelize.define('Supply', {
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
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Unit of measure (kg, g, l, ml, piece, etc.)'
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'cost_per_unit'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'supplies',
    timestamps: true,
    underscored: true
  });

  return Supply;
};