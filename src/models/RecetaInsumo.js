// src/models/RecetaInsumo.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecetaInsumo = sequelize.define('RecetaInsumo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    receta_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    insumo_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    cantidad_por_kilo: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false
    }
  }, {
    tableName: 'receta_insumos',
    timestamps: true,
    underscored: true
  });

  RecetaInsumo.associate = (models) => {
    RecetaInsumo.belongsTo(models.Receta, {
      foreignKey: 'receta_id',
      as: 'receta'
    });

    RecetaInsumo.belongsTo(models.Insumo, {
      foreignKey: 'insumo_id',
      as: 'insumo'
    });
  };

  return RecetaInsumo;
};