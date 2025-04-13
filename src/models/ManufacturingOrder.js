// src/models/ManufacturingOrder.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ManufacturingOrder = sequelize.define('ManufacturingOrder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'order_number'
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date'
    },
    kilosToProcess: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'kilos_to_process'
    },
    // Nuevo campo para el rendimiento esperado (100% = no cambio)
    expectedYield: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 100.00,
      field: 'expected_yield'
    },
    // Nuevo campo para el rendimiento real después del procesamiento
    actualYield: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'actual_yield'
    },
    // Nuevo campo para los kilos realmente obtenidos después del procesamiento
    kilosObtained: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'kilos_obtained'
    },
    boxesEstimated: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'boxes_estimated'
    },
    // Nuevo campo para las cajas reales obtenidas
    boxesObtained: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'boxes_obtained'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    totalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'total_cost'
    },
    costPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_kilo'
    },
    // Nuevo campo para el costo de la materia prima
    rawMaterialCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'raw_material_cost'
    },
    // Nuevo campo para el costo de los insumos
    supplyCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'supply_cost'
    },
    // Nuevo campo para el costo de empaque
    packagingCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'packaging_cost'
    },
    // Nuevo campo para el costo de mano de obra
    laborCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'labor_cost'
    },
    // Nuevo campo para otros costos
    otherCosts: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'other_costs'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Campos para asociaciones
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
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by'
    },
    destinationWarehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'destination_warehouse_id'
    }
  }, {
    tableName: 'manufacturing_orders',
    timestamps: true,
    underscored: true
  });

  ManufacturingOrder.associate = function(models) {
    ManufacturingOrder.belongsTo(models.TrailerEntry, {
      foreignKey: 'trailer_entry_id',
      as: 'trailerEntry'
    });

    ManufacturingOrder.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    ManufacturingOrder.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    ManufacturingOrder.belongsTo(models.Warehouse, {
      foreignKey: 'destination_warehouse_id',
      as: 'destinationWarehouse'
    });

    ManufacturingOrder.hasMany(models.OrderExpense, {
      foreignKey: 'manufacturing_order_id',
      as: 'expenses'
    });

    // Agregar relación con productos derivados/subproductos
    ManufacturingOrder.hasMany(models.ProcessedProduct, {
      foreignKey: 'manufacturing_order_id',
      as: 'processedProducts'
    });
  };

  return ManufacturingOrder;
};