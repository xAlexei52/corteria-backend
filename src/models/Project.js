// src/models/Project.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date'
    },
    estimatedEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'estimated_end_date'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
      defaultValue: 'active'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by'
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    underscored: true
  });

  Project.associate = function(models) {
    Project.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    Project.hasMany(models.ProjectExpense, {
      foreignKey: 'project_id',
      as: 'expenses'
    });

    Project.hasMany(models.ProjectIncome, {
      foreignKey: 'project_id',
      as: 'incomes'
    });
  };

  return Project;
};