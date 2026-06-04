const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: false
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  height: {
    type: DataTypes.STRING,
    allowNull: true
  },
  weight: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nidPassportNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bloodGroup: {
    type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
});

Patient.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

module.exports = Patient;