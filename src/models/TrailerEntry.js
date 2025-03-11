// src/models/TrailerEntry.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrailerEntry = sequelize.define('TrailerEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    supplier: {
      type: DataTypes.STRING,
      allowNull: false
    },
    boxes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    kilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'product_id'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    hasOrder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_order'
    }
  }, {
    tableName: 'trailer_entries',
    timestamps: true,
    underscored: true
  });

  // Definir asociaciones en el método associate
  TrailerEntry.associate = (models) => {
    TrailerEntry.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
    
    TrailerEntry.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return TrailerEntry;
};