// src/models/TrailerEntryProduct.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrailerEntryProduct = sequelize.define('TrailerEntryProduct', {
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
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id'
    },
    boxes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    kilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    availableKilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'available_kilos'
    },
    availableBoxes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'available_boxes'
    },
    processingStatus: {
      type: DataTypes.ENUM('not_needed', 'pending', 'partial', 'completed'),
      defaultValue: 'pending',
      field: 'processing_status'
    }
  }, {
    tableName: 'trailer_entry_products',
    timestamps: true,
    underscored: true
  });

  TrailerEntryProduct.associate = (models) => {
    TrailerEntryProduct.belongsTo(models.TrailerEntry, {
      foreignKey: 'trailer_entry_id',
      as: 'trailerEntry'
    });

    TrailerEntryProduct.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return TrailerEntryProduct;
};
