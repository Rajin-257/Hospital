const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Doctor = require('./Doctor');
const Test = require('./Test');
const TestRequest = require('./TestRequest');
const Billing = require('./Billing');

const DoctorCommission = sequelize.define('DoctorCommission', {
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
DoctorCommission.belongsTo(Doctor);
DoctorCommission.belongsTo(Test);
DoctorCommission.belongsTo(TestRequest);
DoctorCommission.belongsTo(Billing);

module.exports = DoctorCommission; 