// src/models/OrdenFabricacion.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrdenFabricacion = sequelize.define('OrdenFabricacion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    numero_orden: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    entrada_trailer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    fecha_inicio_proceso: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fecha_fin_proceso: {
      type: DataTypes.DATE,
      allowNull: true
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'en_proceso', 'finalizado', 'cancelado'),
      defaultValue: 'pendiente'
    },
    almacen_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    creado_por: {
      type: DataTypes.UUID,
      allowNull: false
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'ordenes_fabricacion',
    timestamps: true,
    underscored: true
  });

  // Definir las asociaciones
  OrdenFabricacion.associate = (models) => {
    // Relación con la entrada de trailer
    OrdenFabricacion.belongsTo(models.EntradaTrailer, {
      foreignKey: 'entrada_trailer_id',
      as: 'entradaTrailer'
    });

    // Relación con el almacén
    OrdenFabricacion.belongsTo(models.Almacen, {
      foreignKey: 'almacen_id',
      as: 'almacen'
    });

    // Relación con el usuario que creó la orden
    OrdenFabricacion.belongsTo(models.Usuario, {
      foreignKey: 'creado_por',
      as: 'creador'
    });

    // Relación con los detalles de la orden
    OrdenFabricacion.hasMany(models.OrdenFabricacionDetalle, {
      foreignKey: 'orden_fabricacion_id',
      as: 'detalles'
    });
  };

  return OrdenFabricacion;
};