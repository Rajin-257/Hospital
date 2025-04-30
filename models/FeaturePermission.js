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
    // Default billing features
    const defaultPermissions = [
      {
        moduleName: 'Billing',
        featureName: 'Schedule Appointment',
        isVisible: true,
        roles: ['admin', 'receptionist']
      },
      {
        moduleName: 'Billing',
        featureName: 'Cabin Allocation',
        isVisible: true,
        roles: ['admin', 'receptionist']
      },
      {
        moduleName: 'Billing',
        featureName: 'Test Requisition',
        isVisible: true,
        roles: ['admin', 'receptionist']
      },
      // Default report features
      {
        moduleName: 'Reports',
        featureName: 'Billing Reports',
        isVisible: true,
        roles: ['admin', 'receptionist']
      },
      {
        moduleName: 'Reports',
        featureName: 'Patient Reports',
        isVisible: true,
        roles: ['admin', 'receptionist']
      },
      {
        moduleName: 'Reports',
        featureName: 'Appointment Reports',
        isVisible: true,
        roles: ['admin', 'receptionist']
      },
      {
        moduleName: 'Reports',
        featureName: 'Test Reports',
        isVisible: true,
        roles: ['admin', 'receptionist']
      }
    ];

    // For each default permission, create if it doesn't exist
    for (const perm of defaultPermissions) {
      const [permission, created] = await FeaturePermission.findOrCreate({
        where: {
          moduleName: perm.moduleName,
          featureName: perm.featureName
        },
        defaults: {
          isVisible: perm.isVisible,
          roles: perm.roles
        }
      });

      if (created) {
        console.log(`Created default permission for ${perm.moduleName} - ${perm.featureName}`);
      }
    }

    console.log('Default permissions initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing default permissions:', error);
    return false;
  }
};

module.exports = FeaturePermission; 