const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MaterialEmpaque = sequelize.define('MaterialEmpaque', {
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
    descripcion: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('caja', 'bolsa', 'termoformado', 'etiqueta'),
      allowNull: false
    },
    unidad_medida: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    costo_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'materiales_empaque',
    timestamps: true,
    underscored: true
  });

  return MaterialEmpaque;
};