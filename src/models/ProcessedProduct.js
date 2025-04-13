// src/models/ProcessedProduct.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProcessedProduct = sequelize.define('ProcessedProduct', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Orden de manufactura de origen
    manufacturingOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'manufacturing_order_id'
    },
    // Producto resultante
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id'
    },
    // Cantidad en kilos obtenida
    kilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    // Cantidad en cajas
    boxes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Coste por kilo del producto procesado
    costPerKilo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'cost_per_kilo'
    },
    // Coste total del producto procesado
    totalCost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'total_cost'
    },
    // Porcentaje que representa del total de la orden
    yieldPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'yield_percentage'
    },
    // Almacén de destino
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'warehouse_id'
    },
    // Descripción o notas adicionales
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Si ya fue agregado al inventario
    addedToInventory: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'added_to_inventory'
    }
  }, {
    tableName: 'processed_products',
    timestamps: true,
    underscored: true
  });

  ProcessedProduct.associate = function(models) {
    ProcessedProduct.belongsTo(models.ManufacturingOrder, {
      foreignKey: 'manufacturing_order_id',
      as: 'manufacturingOrder'
    });

    ProcessedProduct.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    ProcessedProduct.belongsTo(models.Warehouse, {
      foreignKey: 'warehouse_id',
      as: 'warehouse'
    });
  };

  return ProcessedProduct;
};