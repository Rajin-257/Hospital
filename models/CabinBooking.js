const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const Cabin = require('./Cabin');

const CabinBooking = sequelize.define('CabinBooking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  admissionDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  dischargeDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expectedStay: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  dailyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'discharged', 'cancelled'),
    defaultValue: 'active'
  },
  billingStatus: {
    type: DataTypes.ENUM('billed', 'not_billed'),
    defaultValue: 'not_billed'
  },
  remarks: {
    type: DataTypes.TEXT
  }
});

// Relationships
CabinBooking.belongsTo(Patient);
CabinBooking.belongsTo(Cabin);

module.exports = CabinBooking; 