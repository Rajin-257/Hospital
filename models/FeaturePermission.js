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

// Static method to initialize default permissions
FeaturePermission.initializeDefaults = async function() {
  try {
    const defaultPermissions = [
      {
        moduleName: 'Navigation',
        featureName: 'Billing',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist', 'accountant']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Pay Bill',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist', 'accountant']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Patients',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Doctors',
        isVisible: true,
        roles: ['admin', 'receptionist']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Appointments',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Cabins',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Tests',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Reports',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist', 'accountant']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Staff',
        isVisible: true,
        roles: ['admin']
      },
      {
        moduleName: 'Navigation',
        featureName: 'Settings',
        isVisible: true,
        roles: ['admin']
      }
    ];

    for (const permission of defaultPermissions) {
      await FeaturePermission.findOrCreate({
        where: {
          moduleName: permission.moduleName,
          featureName: permission.featureName
        },
        defaults: {
          isVisible: permission.isVisible,
          roles: permission.roles
        }
      });
    }

    console.log('Default permissions initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing default feature permissions:', error);
    throw error;
  }
};

module.exports = FeaturePermission; 