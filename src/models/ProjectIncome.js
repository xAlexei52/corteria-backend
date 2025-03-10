// src/models/ProjectIncome.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectIncome = sequelize.define('ProjectIncome', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by'
    }
  }, {
    tableName: 'project_incomes',
    timestamps: true,
    underscored: true
  });

  ProjectIncome.associate = function(models) {
    ProjectIncome.belongsTo(models.Project, {
      foreignKey: 'project_id',
      as: 'project'
    });

    ProjectIncome.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return ProjectIncome;
};