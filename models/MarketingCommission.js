const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const Billing = require('./Billing');
const Patient = require('./Patient');

const MarketingCommission = sequelize.define('MarketingCommission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  commissionPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid'),
    defaultValue: 'pending'
  },
  paidDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  commissionDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Relationships
MarketingCommission.belongsTo(User, {
  foreignKey: 'marketingManagerId',
  as: 'MarketingManager'
});
MarketingCommission.belongsTo(Billing);
MarketingCommission.belongsTo(Patient);

module.exports = MarketingCommission; 