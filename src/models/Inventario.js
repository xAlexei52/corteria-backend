const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inventario = sequelize.define('Inventario', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    almacen_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    cantidad_kilos: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false
    },
    cantidad_cajas: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    codigo_lote: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fecha_caducidad: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ubicacion_almacen: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'inventario',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['producto_id', 'almacen_id', 'codigo_lote'],
        name: 'inventario_producto_almacen_lote_unique'
      }
    ]
  });

  // Definir las asociaciones
  Inventario.associate = (models) => {
    // Relación con producto
    Inventario.belongsTo(models.Producto, {
      foreignKey: 'producto_id',
      as: 'producto'
    });

    // Relación con almacén
    Inventario.belongsTo(models.Almacen, {
      foreignKey: 'almacen_id',
      as: 'almacen'
    });
  };

  return Inventario;
};