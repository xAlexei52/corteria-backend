// src/models/SaleDetail.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SaleDetail = sequelize.define('SaleDetail', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price'
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    boxes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'warehouse_id'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id'
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sale_id'
    }
  }, {
    tableName: 'sale_details',
    timestamps: true,
    underscored: true
  });

  SaleDetail.associate = function(models) {
    SaleDetail.belongsTo(models.Sale, {
      foreignKey: 'sale_id',
      as: 'sale'
    });

    SaleDetail.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    SaleDetail.belongsTo(models.Warehouse, {
      foreignKey: 'warehouse_id',
      as: 'warehouse'
    });
  };

  return SaleDetail;
};