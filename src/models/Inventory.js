// src/models/Inventory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // El item puede ser un producto o un insumo
    itemType: {
      type: DataTypes.ENUM('product', 'supply'),
      allowNull: false,
      field: 'item_type'
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'item_id'
    }
  }, {
    tableName: 'inventory',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['warehouse_id', 'item_type', 'item_id']
      }
    ]
  });

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.Warehouse, {
      foreignKey: 'warehouse_id',
      as: 'warehouse'
    });
  };

  return Inventory;
};