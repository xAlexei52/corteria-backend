// Modificación para src/models/Product.js
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
    costPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_per_kilo',
      comment: 'Costo por kilo para producción'
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