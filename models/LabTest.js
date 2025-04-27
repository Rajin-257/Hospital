const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const Doctor = require('./Doctor');
const Staff = require('./Staff');
const LabTestType = require('./LabTestType');

const LabTest = sequelize.define('LabTest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  testName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  testCode: {
    type: DataTypes.STRING,
    allowNull: false
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
  technicianId: {
    type: DataTypes.INTEGER,
    references: {
      model: Staff,
      key: 'id'
    },
    allowNull: true
  },
  testTypeId: {
    type: DataTypes.INTEGER,
    references: {
      model: LabTestType,
      key: 'id'
    },
    allowNull: true
  },
  doctorCommission: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  requestDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  results: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('requested', 'scheduled', 'completed', 'cancelled'),
    defaultValue: 'requested'
  },
  invoice_status: {
    type: DataTypes.ENUM('pending', 'invoiced'),
    defaultValue: 'pending'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

LabTest.belongsTo(Patient, { foreignKey: 'patientId' });
LabTest.belongsTo(Doctor, { foreignKey: 'doctorId' });
LabTest.belongsTo(Staff, { foreignKey: 'technicianId' });
LabTest.belongsTo(LabTestType, { foreignKey: 'testTypeId' });

module.exports = LabTest;