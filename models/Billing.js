const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');

const Billing = sequelize.define('Billing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  billNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  billDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  billdelivaridate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discountPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  netPayable: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'insurance'),
    allowNull: false,
    defaultValue: 'cash'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  dueAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('paid', 'due'),
    defaultValue: 'due'
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false
  },
  marketingManagerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  referralNote: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Relationships
Billing.belongsTo(Patient);

module.exports = Billing;