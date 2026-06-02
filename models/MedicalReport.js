const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Billing = require('./Billing');

const MedicalReport = sequelize.define('MedicalReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reportDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  issueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  height: {
    type: DataTypes.STRING,
    allowNull: true
  },
  weight: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Held UP'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  showSign: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  examinationData: {
    type: DataTypes.JSON,
    allowNull: false
  },
  xrayImage: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

MedicalReport.belongsTo(Billing);
Billing.hasOne(MedicalReport);

module.exports = MedicalReport;
