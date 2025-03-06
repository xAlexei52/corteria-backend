// src/models/RecipeSupply.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecipeSupply = sequelize.define('RecipeSupply', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    recipeId: {
      type: DataTypes.UUID,
      field: 'recipe_id',
      allowNull: true  // Cambiado a true para permitir NULL
    },
    supplyId: {  // Asegúrate de tener estos campos
      type: DataTypes.UUID,
      field: 'supply_id',
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    }
  }, {
    tableName: 'recipe_supplies',
    timestamps: true,
    underscored: true
  });

  // Define las asociaciones
  RecipeSupply.associate = function(models) {
    RecipeSupply.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });

    RecipeSupply.belongsTo(models.Supply, {
      foreignKey: 'supply_id',
      as: 'supply'
    });
  };

  return RecipeSupply;
};