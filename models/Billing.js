const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');

const Billing = sequelize.define('Billing', {
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
  invoiceNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  invoiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'fixed',
    allowNull: false
  },
  discountedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'partial', 'paid'),
    defaultValue: 'pending'
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'insurance', 'online'),
    allowNull: true
  },
  insuranceDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  services: {
    type: DataTypes.JSON,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

Billing.belongsTo(Patient, { foreignKey: 'patientId' });

module.exports = Billing;