// src/models/Product.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
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
    pricePerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price_per_kilo'
    },
    recipe_id: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'recipe_id'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
    // Removemos recipeId de aquí, ya que la columna ya existe
  }, {
    tableName: 'products',
    timestamps: true,
    underscored: true
  });

  // Definir asociaciones
  Product.associate = function(models) {
    if (models.Recipe) {
      Product.belongsTo(models.Recipe, {
        foreignKey: 'recipe_id',
        as: 'recipe'
      });
    }
  };

  return Product;
};