const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const Test = require('./Test');
const Doctor = require('./Doctor');
const Billing = require('./Billing');

const TestRequest = sequelize.define('TestRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requestDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  priority: {
    type: DataTypes.ENUM('Normal', 'Urgent'),
    defaultValue: 'Normal'
  },
  status: {
    type: DataTypes.ENUM('Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled'),
    defaultValue: 'Pending'
  },
  result:{
    type: DataTypes.TEXT,
    allowNull: true
  },
  resultNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  billingStatus: {
    type: DataTypes.ENUM('billed', 'not_billed'),
    defaultValue: 'not_billed'
  },
  deliveryOption: {
    type: DataTypes.ENUM('Not Collected','Collect', 'Email', 'Home Delivery'),
    defaultValue: 'Not Collected'
  },
  deliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  commission: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  billing_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Billings',
      key: 'id'
    }
  }
});

// Relationships  
TestRequest.belongsTo(Patient);
TestRequest.belongsTo(Test);
TestRequest.belongsTo(Doctor);
TestRequest.belongsTo(Billing, { foreignKey: 'billing_id' });

module.exports = TestRequest;