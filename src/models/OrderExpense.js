// src/models/OrderExpense.js (modificado)
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
    // Modificar el tipo para incluir más categorías
    type: {
      type: DataTypes.ENUM('supply', 'fixed', 'variable', 'packaging', 'labor'),
      allowNull: false
    },
    // Nuevos campos
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Cantidad utilizada'
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Unidad de medida (kg, g, l, ml, pieza, etc.)'
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_unit',
      comment: 'Costo por unidad'
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
    },
    supplyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'supply_id',
      comment: 'ID del insumo si es de tipo supply'
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
    
    OrderExpense.belongsTo(models.Supply, {
      foreignKey: 'supply_id',
      as: 'supply'
    });
  };

  return OrderExpense;
};