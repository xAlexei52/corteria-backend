// src/models/Warehouse.js (actualizado)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Warehouse = sequelize.define('Warehouse', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'city_id'
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isMain: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_main'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'warehouses',
    timestamps: true,
    underscored: true
  });

  Warehouse.associate = function(models) {
    Warehouse.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });
  };

  return Warehouse;
};