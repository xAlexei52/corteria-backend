// src/models/RecetaEmpaque.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecetaEmpaque = sequelize.define('RecetaEmpaque', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    receta_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    material_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    cantidad_por_unidad: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    tableName: 'receta_empaques',
    timestamps: true,
    underscored: true
  });

  RecetaEmpaque.associate = (models) => {
    RecetaEmpaque.belongsTo(models.Receta, {
      foreignKey: 'receta_id',
      as: 'receta'
    });

    RecetaEmpaque.belongsTo(models.MaterialEmpaque, {
      foreignKey: 'material_id',
      as: 'material'
    });
  };

  return RecetaEmpaque;
};