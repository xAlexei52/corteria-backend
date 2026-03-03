// src/models/SaleDetail.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SaleDetail = sequelize.define('SaleDetail', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price'
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    boxes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'warehouse_id',
      comment: 'Referencia de ubicación (opcional cuando se usa trailerEntryId o manufacturingOrderId)'
    },
    trailerEntryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'trailer_entry_id',
      comment: 'Fuente: venta directa desde entrada de trailer (descuenta availableKilos)'
    },
    manufacturingOrderId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'manufacturing_order_id',
      comment: 'Fuente: venta de producto manufacturado (descuenta availableOutputKilos)'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id'
    },
    saleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sale_id'
    },
    romaneo: {
      type: DataTypes.TEXT,  // Para almacenar JSON como texto
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('romaneo');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('romaneo', value ? JSON.stringify(value) : null);
      }
    }
  }, {
    tableName: 'sale_details',
    timestamps: true,
    underscored: true
  });

  SaleDetail.associate = function(models) {
    SaleDetail.belongsTo(models.Sale, {
      foreignKey: 'sale_id',
      as: 'sale'
    });

    SaleDetail.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    SaleDetail.belongsTo(models.Warehouse, {
      foreignKey: 'warehouse_id',
      as: 'warehouse'
    });

    SaleDetail.belongsTo(models.TrailerEntry, {
      foreignKey: 'trailer_entry_id',
      as: 'trailerEntry'
    });

    SaleDetail.belongsTo(models.ManufacturingOrder, {
      foreignKey: 'manufacturing_order_id',
      as: 'manufacturingOrder'
    });
  };

  return SaleDetail;
};