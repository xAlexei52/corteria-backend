// src/models/City.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const City = sequelize.define('City', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'cities',
    timestamps: true,
    underscored: true
  });

  City.associate = function(models) {
    // Asociaciones con otros modelos
    City.hasMany(models.Usuario, {
      foreignKey: 'city_id',
      as: 'users'
    });

    City.hasMany(models.Warehouse, {
      foreignKey: 'city_id',
      as: 'warehouses'
    });

    City.hasMany(models.TrailerEntry, {
      foreignKey: 'city_id',
      as: 'trailerEntries'
    });

    City.hasMany(models.ManufacturingOrder, {
      foreignKey: 'city_id',
      as: 'manufacturingOrders'
    });

    City.hasMany(models.Sale, {
      foreignKey: 'city_id',
      as: 'sales'
    });

    City.hasMany(models.Customer, {
      foreignKey: 'city_id',
      as: 'customers'
    });

    City.hasMany(models.FixedExpense, {
      foreignKey: 'city_id',
      as: 'fixedExpenses'
    });
  };

  return City;
};