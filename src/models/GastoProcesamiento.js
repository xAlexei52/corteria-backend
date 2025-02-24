const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GastoProcesamiento = sequelize.define('GastoProcesamiento', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orden_fabricacion_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    tipo_gasto: {
      type: DataTypes.ENUM('materia_prima', 'insumo_marinado', 'material_empaque', 'mano_obra', 'energeticos', 'gastos_fijos'),
      allowNull: false
    },
    insumo_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    material_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    cantidad: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unidad_medida: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    costo_por_kilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    fecha_gasto: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    registrado_por: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'gastos_procesamiento',
    timestamps: true,
    underscored: true
  });

  GastoProcesamiento.associate = (models) => {
    // Relación con orden de fabricación
    GastoProcesamiento.belongsTo(models.OrdenFabricacion, {
      foreignKey: 'orden_fabricacion_id',
      as: 'ordenFabricacion'
    });

    // Relación con insumo
    GastoProcesamiento.belongsTo(models.Insumo, {
      foreignKey: 'insumo_id',
      as: 'insumo'
    });

    // Relación con material de empaque
    GastoProcesamiento.belongsTo(models.MaterialEmpaque, {
      foreignKey: 'material_id',
      as: 'material'
    });

    // Relación con usuario que registró
    GastoProcesamiento.belongsTo(models.Usuario, {
      foreignKey: 'registrado_por',
      as: 'registrador'
    });
  };

  return GastoProcesamiento;
};