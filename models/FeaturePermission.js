const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FeaturePermission = sequelize.define('FeaturePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moduleName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Billing'
  },
  featureName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  roles: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: JSON.stringify(['admin', 'receptionist']),
    get() {
      const rawValue = this.getDataValue('roles');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('roles', JSON.stringify(value));
    }
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'featurepermissions'
});
module.exports = FeaturePermission; 