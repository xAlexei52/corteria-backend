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
    boxesEstimated: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'boxes_estimated'
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
    city: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'manufacturing_orders',
    timestamps: true,
    underscored: true
  });

  ManufacturingOrder.associate = (models) => {
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
  };

  return ManufacturingOrder;
};