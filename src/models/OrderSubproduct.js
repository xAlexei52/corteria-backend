// src/models/OrderSubproduct.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderSubproduct = sequelize.define('OrderSubproduct', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'kg'
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_unit'
    },
    totalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'total_cost'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'product_id',
      comment: 'ID del producto si está registrado en el sistema'
    },
    manufacturingOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'manufacturing_order_id'
    }
  }, {
    tableName: 'order_subproducts',
    timestamps: true,
    underscored: true
  });

  OrderSubproduct.associate = function(models) {
    OrderSubproduct.belongsTo(models.ManufacturingOrder, {
      foreignKey: 'manufacturing_order_id',
      as: 'manufacturingOrder'
    });
    
    OrderSubproduct.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return OrderSubproduct;
};