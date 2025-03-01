// src/models/Recipe.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Estimated processing time in minutes',
      field: 'processing_time'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'recipes',
    timestamps: true,
    underscored: true
  });

  Recipe.associate = function(models) {
    Recipe.hasMany(models.RecipeSupply, {
      foreignKey: 'recipe_id',
      as: 'supplies'
    });
    
    Recipe.hasMany(models.Product, {
      foreignKey: 'recipe_id',
      as: 'products'
    });
  }
  return Recipe;
};