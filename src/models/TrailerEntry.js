// src/models/TrailerEntry.js (actualizado)
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
    cityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'city_id'
    },
    // Campos existentes
    needsProcessing: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Indica si la entrada requiere procesamiento (true) o va directo a almacén (false)'
    },
    entryCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'entry_cost',
      comment: 'Costo total de la entrada'
    },
    costPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_kilo',
      comment: 'Costo por kilo de la materia prima'
    },
    processingStatus: {
      type: DataTypes.ENUM('not_needed', 'pending', 'partial', 'completed'),
      defaultValue: 'pending',
      field: 'processing_status',
      comment: 'Estado de procesamiento de la entrada'
    },
    availableKilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'available_kilos',
      comment: 'Kilos disponibles para procesar'
    },
    targetWarehouseId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'target_warehouse_id',
      comment: 'Almacén destino si no requiere procesamiento'
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
    }
  }, {
    tableName: 'trailer_entries',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: (entry) => {
        // Calcular costo por kilo si se proporciona el costo total
        if (entry.entryCost && entry.kilos) {
          entry.costPerKilo = parseFloat((entry.entryCost / entry.kilos).toFixed(2));
        }
        
        // Inicializar kilos disponibles igual al total si necesita procesamiento
        if (entry.needsProcessing) {
          entry.availableKilos = entry.kilos;
          entry.processingStatus = 'pending';
        } else {
          entry.processingStatus = 'not_needed';
          entry.availableKilos = 0; // No hay kilos disponibles para procesar
        }
      }
    }
  });

  // Definir asociaciones en el método associate
  TrailerEntry.associate = (models) => {
    TrailerEntry.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });

    TrailerEntry.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
    
    TrailerEntry.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    
    TrailerEntry.belongsTo(models.Warehouse, {
      foreignKey: 'target_warehouse_id',
      as: 'targetWarehouse'
    });
    
    TrailerEntry.hasMany(models.ManufacturingOrder, {
      foreignKey: 'trailer_entry_id',
      as: 'manufacturingOrders'
    });
  };

  return TrailerEntry;
};