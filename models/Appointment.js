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
  patientId: {
    type: DataTypes.INTEGER,
    references: {
      model: Patient,
      key: 'id'
    }
  },
  doctorId: {
    type: DataTypes.INTEGER,
    references: {
      model: Doctor,
      key: 'id'
    }
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
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no-show'),
    defaultValue: 'scheduled'
  },
  invoice_status: {
    type: DataTypes.ENUM('pending', 'invoiced'),
    defaultValue: 'pending'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

Appointment.belongsTo(Patient, { foreignKey: 'patientId' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId' });

module.exports = Appointment;