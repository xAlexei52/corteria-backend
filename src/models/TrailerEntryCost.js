// src/models/TrailerEntryCost.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrailerEntryCost = sequelize.define('TrailerEntryCost', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    trailerEntryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'trailer_entry_id'
    },
    concept: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Descripción del costo (Flete, Descarga, Inspección, etc.)'
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.ENUM('MXN', 'USD'),
      allowNull: false,
      defaultValue: 'MXN'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'trailer_entry_costs',
    timestamps: true,
    underscored: true
  });

  TrailerEntryCost.associate = (models) => {
    TrailerEntryCost.belongsTo(models.TrailerEntry, {
      foreignKey: 'trailer_entry_id',
      as: 'trailerEntry'
    });

    TrailerEntryCost.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return TrailerEntryCost;
};
