// src/models/ProductionStage.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductionStage = sequelize.define('ProductionStage', {
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
    // Nombre de la etapa (limpieza, marinado, corte, etc.)
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Orden secuencial de la etapa
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Kilos iniciales al comenzar esta etapa
    initialKilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'initial_kilos'
    },
    // Kilos finales después de esta etapa
    finalKilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'final_kilos'
    },
    // Rendimiento de la etapa (porcentaje)
    yield: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    // Costo acumulado hasta el inicio de esta etapa
    initialCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'initial_cost'
    },
    // Costo adicional en esta etapa
    additionalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'additional_cost'
    },
    // Costo total acumulado después de esta etapa
    finalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'final_cost'
    },
    // Costo por kilo al final de esta etapa
    costPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_kilo'
    },
    // Descripción detallada de la etapa
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Estado de la etapa
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      defaultValue: 'pending'
    },
    // Fecha de inicio
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'start_date'
    },
    // Fecha de finalización
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date'
    }
  }, {
    tableName: 'production_stages',
    timestamps: true,
    underscored: true
  });

  ProductionStage.associate = function(models) {
    ProductionStage.belongsTo(models.ManufacturingOrder, {
      foreignKey: 'manufacturing_order_id',
      as: 'manufacturingOrder'
    });

    // Usamos foreignKey con cadena para evitar dependencia circular
    if (models.ProductionInput) {
      ProductionStage.hasMany(models.ProductionInput, {
        foreignKey: 'production_stage_id',
        as: 'inputs'
      });
    }
  };

  return ProductionStage;
};