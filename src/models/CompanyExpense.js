// src/models/CompanyExpense.js (actualizado)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompanyExpense = sequelize.define('CompanyExpense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reference_number',
      comment: 'Número de factura o referencia'
    },
    category: {
      type: DataTypes.ENUM(
        'utilities', // Servicios públicos
        'rent', // Alquiler
        'salaries', // Salarios
        'supplies', // Suministros
        'maintenance', // Mantenimiento
        'taxes', // Impuestos
        'insurance', // Seguros
        'advertising', // Publicidad
        'travel', // Viajes
        'other' // Otros
      ),
      defaultValue: 'other'
    },
    // NUEVO CAMPO AGREGADO
    isBillable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_billable',
      comment: 'Indica si el gasto es deducible/facturable fiscalmente'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Información del archivo adjunto
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_name'
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_type'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_path'
    },
    // Campos de auditoría
    cityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'city_id'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by'
    }
  }, {
    tableName: 'company_expenses',
    timestamps: true,
    underscored: true
  });

  CompanyExpense.associate = function(models) {
    CompanyExpense.belongsTo(models.City, {
      foreignKey: 'city_id',
      as: 'city'
    });

    CompanyExpense.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return CompanyExpense;
};