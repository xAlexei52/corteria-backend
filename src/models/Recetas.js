// src/models/Receta.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Receta = sequelize.define('Receta', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'recetas',
    timestamps: true,
    underscored: true
  });

  Receta.associate = (models) => {
    Receta.belongsTo(models.Producto, {
      foreignKey: 'producto_id',
      as: 'producto'
    });

    Receta.hasMany(models.RecetaInsumo, {
      foreignKey: 'receta_id',
      as: 'insumos'
    });

    Receta.hasMany(models.RecetaEmpaque, {
      foreignKey: 'receta_id',
      as: 'empaques'
    });
  };

  return Receta;
};