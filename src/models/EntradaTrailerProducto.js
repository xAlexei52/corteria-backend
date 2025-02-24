const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EntradaTrailerProducto = sequelize.define('EntradaTrailerProducto', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    entrada_trailer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    cantidad_kilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    cantidad_cajas: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'entradas_trailer_productos',
    timestamps: true,
    underscored: true
  });

  // Definir las asociaciones
  EntradaTrailerProducto.associate = (models) => {
    // Relación con entrada de trailer
    EntradaTrailerProducto.belongsTo(models.EntradaTrailer, {
      foreignKey: 'entrada_trailer_id',
      as: 'entradaTrailer'
    });

    // Relación con producto
    EntradaTrailerProducto.belongsTo(models.Producto, {
      foreignKey: 'producto_id',
      as: 'producto'
    });
  };

  return EntradaTrailerProducto;
};