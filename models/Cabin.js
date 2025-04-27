const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');

const Cabin = sequelize.define('Cabin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cabinNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  cabinType: {
    type: DataTypes.ENUM('general', 'private', 'icu'),
    allowNull: false
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pricePerDay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
    defaultValue: 'available'
  },
  invoice_status: {
    type: DataTypes.ENUM('pending', 'invoiced'),
    defaultValue: 'pending'
  },
  patientId: {
    type: DataTypes.INTEGER,
    references: {
      model: Patient,
      key: 'id'
    },
    allowNull: true
  },
  admissionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  dischargeDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

Cabin.belongsTo(Patient, { foreignKey: 'patientId' });

module.exports = Cabin;