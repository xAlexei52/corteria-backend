const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CostoBase = sequelize.define('CostoBase', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    concepto: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('mano_obra', 'energeticos', 'gastos_fijos'),
      allowNull: false
    },
    costo_por_kilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    fecha_vigencia: {
      type: DataTypes.DATE,
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'costos_base',
    timestamps: true,
    underscored: true
  });

  return CostoBase;
};