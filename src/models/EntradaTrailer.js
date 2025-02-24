const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EntradaTrailer = sequelize.define('EntradaTrailer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fecha_entrada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    numero_trailer: {
      type: DataTypes.STRING,
      allowNull: false
    },
    proveedor: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    almacen_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    registrado_por: {
      type: DataTypes.UUID,
      allowNull: false
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'procesando', 'completado'),
      defaultValue: 'pendiente'
    }
  }, {
    tableName: 'entradas_trailer',
    timestamps: true,
    underscored: true
  });

  // Definir las asociaciones
  EntradaTrailer.associate = (models) => {
    // Relación con productos de la entrada
    EntradaTrailer.hasMany(models.EntradaTrailerProducto, {
      foreignKey: 'entrada_trailer_id',
      as: 'productos'
    });

    // Relación con usuario que registró
    EntradaTrailer.belongsTo(models.Usuario, {
      foreignKey: 'registrado_por',
      as: 'registrador'
    });

    // Relación con almacén
    EntradaTrailer.belongsTo(models.Almacen, {
      foreignKey: 'almacen_id',
      as: 'almacen'
    });
  };

  return EntradaTrailer;
};