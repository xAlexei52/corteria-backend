// src/models/OrdenFabricacionDetalle.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrdenFabricacionDetalle = sequelize.define('OrdenFabricacionDetalle', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orden_fabricacion_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    cantidad_kilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    cantidad_cajas: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'en_proceso', 'finalizado'),
      defaultValue: 'pendiente'
    }
  }, {
    tableName: 'ordenes_fabricacion_detalles',
    timestamps: true,
    underscored: true
  });

  // Definir las asociaciones
  OrdenFabricacionDetalle.associate = (models) => {
    // Relación con la orden de fabricación
    OrdenFabricacionDetalle.belongsTo(models.OrdenFabricacion, {
      foreignKey: 'orden_fabricacion_id',
      as: 'ordenFabricacion'
    });

    // Relación con el producto
    OrdenFabricacionDetalle.belongsTo(models.Producto, {
      foreignKey: 'producto_id',
      as: 'producto'
    });
  };

  return OrdenFabricacionDetalle;
};