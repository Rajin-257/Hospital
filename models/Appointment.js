const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const Doctor = require('./Doctor');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  appointmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  appointmentTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
    defaultValue: 'scheduled'
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
Appointment.belongsTo(Patient);
Appointment.belongsTo(Doctor);

module.exports = Appointment;