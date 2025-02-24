const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RendimientoProceso = sequelize.define('RendimientoProceso', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orden_fabricacion_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    etapa: {
      type: DataTypes.ENUM('limpieza', 'marinado', 'empacado'),
      allowNull: false
    },
    cantidad_entrada: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    cantidad_salida: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    rendimiento_porcentaje: {
      type: DataTypes.VIRTUAL,
      get() {
        return (this.cantidad_salida / this.cantidad_entrada) * 100;
      }
    }
  }, {
    tableName: 'rendimientos_proceso',
    timestamps: true,
    underscored: true
  });

  RendimientoProceso.associate = (models) => {
    RendimientoProceso.belongsTo(models.OrdenFabricacion, {
      foreignKey: 'orden_fabricacion_id',
      as: 'ordenFabricacion'
    });
  };

  return RendimientoProceso;
};