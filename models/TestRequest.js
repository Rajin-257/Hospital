const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const Test = require('./Test');
const Doctor = require('./Doctor');

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
  resultFile: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string of file paths or single path'
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
  }
});

// Relationships
TestRequest.belongsTo(Patient);
TestRequest.belongsTo(Test);
TestRequest.belongsTo(Doctor);

module.exports = TestRequest;