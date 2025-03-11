// src/models/ProjectExpense.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectExpense = sequelize.define('ProjectExpense', {
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
    tableName: 'project_expenses',
    timestamps: true,
    underscored: true
  });

  ProjectExpense.associate = function(models) {
    ProjectExpense.belongsTo(models.Project, {
      foreignKey: 'project_id',
      as: 'project'
    });

    ProjectExpense.belongsTo(models.Usuario, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return ProjectExpense;
};