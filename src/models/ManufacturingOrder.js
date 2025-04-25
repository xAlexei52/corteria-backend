// src/models/ManufacturingOrder.js (modificado)
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
    // Modificado: ahora representa solo los kilos que usa esta orden específica
    usedKilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'used_kilos',
      comment: 'Kilos de la entrada que se procesan en esta orden'
    },
    // Campo original (renombrado para claridad)
    totalOutputKilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'kilos_to_process',
      comment: 'Kilos totales que se esperan producir'
    },
    boxesEstimated: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'boxes_estimated'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Cálculos de costos y rentabilidad
    calculationStatus: {
      type: DataTypes.ENUM('pending', 'calculated'),
      defaultValue: 'pending',
      field: 'calculation_status',
      comment: 'Estado del cálculo de costos y rentabilidad'
    },
    rawMaterialCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'raw_material_cost',
      comment: 'Costo de la materia prima'
    },
    suppliesCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'supplies_cost',
      comment: 'Costo total de insumos'
    },
    laborCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'labor_cost',
      comment: 'Costo de mano de obra'
    },
    packagingCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'packaging_cost',
      comment: 'Costo de empaque'
    },
    fixedCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'fixed_cost',
      comment: 'Costos fijos asignados'
    },
    variableCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'variable_cost',
      comment: 'Costos variables asignados'
    },
    totalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'total_cost',
      comment: 'Costo total de la orden'
    },
    costPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_kilo',
      comment: 'Costo por kilo producido'
    },
    sellingPricePerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'selling_price_per_kilo',
      comment: 'Precio de venta por kilo'
    },
    profitPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'profit_per_kilo',
      comment: 'Utilidad por kilo'
    },
    profitPercentage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'profit_percentage',
      comment: 'Porcentaje de utilidad'
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
    
    // Nueva asociación para subproductos
    ManufacturingOrder.hasMany(models.OrderSubproduct, {
      foreignKey: 'manufacturing_order_id',
      as: 'subproducts'
    });
  };

  return ManufacturingOrder;
};