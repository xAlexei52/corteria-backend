const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      comment: 'Current debt balance'
    },
    totalPurchases: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      field: 'total_purchases',
      comment: 'Total amount of all purchases'
    },
    lastPurchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_purchase_date'
    }
  }, {
    tableName: 'customers',
    timestamps: true,
    underscored: true
  });

  Customer.associate = function(models) {
    Customer.hasMany(models.CustomerDocument, {
      foreignKey: 'customer_id',
      as: 'documents'
    });

    Customer.hasMany(models.Sale, {
      foreignKey: 'customer_id',
      as: 'sales'
    });

    Customer.hasMany(models.Payment, {
      foreignKey: 'customer_id',
      as: 'payments'
    });
  };

  return Customer;
};