const FeaturePermission = require('../models/FeaturePermission');
const Setting = require('../models/Setting');

const featurePermissions = [
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
    },
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
    },
    // HRM Module Permissions
    {
        moduleName: 'HRM',
        featureName: 'Add Staff',
        isVisible: true,
        roles: ['admin']
    },
    {
        moduleName: 'HRM',
        featureName: 'View Staff',
        isVisible: true,
        roles: ['admin']
    },
    {
        moduleName: 'HRM',
        featureName: 'Edit Staff',
        isVisible: true,
        roles: ['admin']
    },
    {
        moduleName: 'HRM',
        featureName: 'Delete Staff',
        isVisible: true,
        roles: ['admin']
    }
];

const importFeaturePermissions = async () => {
    try {
        console.log('Importing feature permissions...');
        
        for (const permission of featurePermissions) {
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

        // Update the import_feature_data flag
        await Setting.update(
            { import_feature_data: true },
            { where: {} }
        );
        
        console.log('Feature permissions imported successfully!');
        return true;
    } catch (error) {
        console.error('Error importing feature permissions:', error);
        return false;
    }
};

module.exports = {
    importFeaturePermissions
}; 