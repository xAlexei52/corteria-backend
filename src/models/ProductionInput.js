// src/models/ProductionInput.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductionInput = sequelize.define('ProductionInput', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Orden de manufactura a la que pertenece
    manufacturingOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'manufacturing_order_id'
    },
    // Tipo de insumo (supply, packaging, other)
    inputType: {
      type: DataTypes.ENUM('supply', 'packaging', 'other'),
      allowNull: false,
      field: 'input_type'
    },
    // ID del insumo o material (puede ser supply_id o NULL si es otro)
    itemId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'item_id'
    },
    // Nombre del insumo (especialmente útil para 'other')
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Cantidad utilizada
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    // Unidad de medida
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Costo unitario
    unitCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_cost'
    },
    // Costo total
    totalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'total_cost'
    },
    // Etapa de producción en la que se utiliza
    productionStageId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'production_stage_id'
    },
    // Notas adicionales
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'production_inputs',
    timestamps: true,
    underscored: true
  });

  ProductionInput.associate = function(models) {
    ProductionInput.belongsTo(models.ManufacturingOrder, {
      foreignKey: 'manufacturing_order_id',
      as: 'manufacturingOrder'
    });

    // Asociación condicional según el tipo
    if (models.Supply) {
      ProductionInput.belongsTo(models.Supply, {
        foreignKey: 'item_id',
        as: 'supply',
        constraints: false
      });
    }
  };

  return ProductionInput;
};