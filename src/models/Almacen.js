const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Almacen = sequelize.define('Almacen', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('general', 'secundario'),
      defaultValue: 'secundario'
    },
    ubicacion: {
      type: DataTypes.STRING,
      allowNull: false
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false
    },
    responsable_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'almacenes',
    timestamps: true,
    underscored: true
  });

  // Definir las asociaciones
  Almacen.associate = (models) => {
    // Relación con entradas de trailer
    Almacen.hasMany(models.EntradaTrailer, {
      foreignKey: 'almacen_id',
      as: 'entradasTrailer'
    });

    // Relación con inventario
    Almacen.hasMany(models.Inventario, {
      foreignKey: 'almacen_id',
      as: 'inventarios'
    });

    // Relación con el usuario responsable
    Almacen.belongsTo(models.Usuario, {
      foreignKey: 'responsable_id',
      as: 'responsable'
    });
  };

  return Almacen;
};