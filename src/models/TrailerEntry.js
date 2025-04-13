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
    // Nuevo campo para los kilos disponibles (inicialmente igual a kilos)
    availableKilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'available_kilos',
      defaultValue: sequelize.literal('kilos')
    },
    // Nuevo campo para el costo total de la entrada
    totalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'total_cost'
    },
    // Nuevo campo para el costo por kilo
    costPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_kilo'
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Nuevo campo para indicar si el producto va directo a almacén
    directToWarehouse: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'direct_to_warehouse'
    },
    // Nuevo campo para almacén de destino (si va directo)
    destinationWarehouseId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'destination_warehouse_id'
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
    },
    // Nuevo campo para llevar un registro de si el producto
    // ya fue movido al almacén (en caso de directToWarehouse=true)
    movedToWarehouse: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'moved_to_warehouse'
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

    // Nueva asociación para el almacén de destino
    TrailerEntry.belongsTo(models.Warehouse, {
      foreignKey: 'destination_warehouse_id',
      as: 'destinationWarehouse'
    });

    // Relación con las órdenes de manufactura
    TrailerEntry.hasMany(models.ManufacturingOrder, {
      foreignKey: 'trailer_entry_id',
      as: 'manufacturingOrders'
    });
  };

  return TrailerEntry;
};