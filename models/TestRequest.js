const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const Test = require('./Test');

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
    type: DataTypes.ENUM('Requested', 'In Progress', 'Completed'),
    defaultValue: 'Requested'
  },
  result: {
    type: DataTypes.TEXT
  },
  billingStatus: {
    type: DataTypes.ENUM('billed', 'not_billed'),
    defaultValue: 'not_billed'
  }
});

// Relationships
TestRequest.belongsTo(Patient);
TestRequest.belongsTo(Test);

module.exports = TestRequest;