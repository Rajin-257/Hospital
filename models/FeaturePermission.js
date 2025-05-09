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
      try {
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (error) {
        console.error('Error parsing roles JSON:', error, 'Raw value:', rawValue);
        return [];
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('roles', JSON.stringify(value));
      } else if (typeof value === 'string') {
        try {
          // If it's already a JSON string, parse it first to validate
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            this.setDataValue('roles', value);
          } else {
            this.setDataValue('roles', JSON.stringify([value]));
          }
        } catch (error) {
          // If it's not valid JSON, treat it as a single role value
          this.setDataValue('roles', JSON.stringify([value]));
        }
      } else {
        this.setDataValue('roles', JSON.stringify([]));
      }
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