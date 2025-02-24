const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Insumo = sequelize.define('Insumo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unidad_medida: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    stock_actual: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    stock_minimo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    ubicacion: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    proveedor: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'insumos',
    timestamps: true,
    underscored: true
  });

  // Definir las asociaciones
  Insumo.associate = (models) => {
    Insumo.hasMany(models.GastoProcesamiento, {
      foreignKey: 'insumo_id',
      as: 'gastosProcesamiento'
    });
  };

  return Insumo;
};