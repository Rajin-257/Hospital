const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const Doctor = require('./Doctor');

const MedicalRecord = sequelize.define('MedicalRecord', {
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
  visitDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  prescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  followUpDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
});

MedicalRecord.belongsTo(Patient, { foreignKey: 'patientId' });
MedicalRecord.belongsTo(Doctor, { foreignKey: 'doctorId' });

module.exports = MedicalRecord;