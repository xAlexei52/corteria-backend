const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomerDocument = sequelize.define('CustomerDocument', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_name'
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_type'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_path'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'uploaded_by'
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'customer_id'
    }
  }, {
    tableName: 'customer_documents',
    timestamps: true,
    underscored: true
  });

  CustomerDocument.associate = function(models) {
    CustomerDocument.belongsTo(models.Customer, {
      foreignKey: 'customer_id',
      as: 'customer'
    });

    CustomerDocument.belongsTo(models.Usuario, {
      foreignKey: 'uploaded_by',
      as: 'uploader'
    });
  };

  return CustomerDocument;
};