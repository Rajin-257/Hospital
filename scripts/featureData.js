const FeaturePermission = require('../models/FeaturePermission');
const Setting = require('../models/Setting');

const featurePermissions = [
    {
        moduleName: 'Navigation',
        featureName: 'Billing',
        isVisible: true,
        roles: ['admin', 'receptionist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Pay Bill',
        isVisible: true,
        roles: ['admin', 'receptionist',]
    },
    {
        moduleName: 'Navigation',
        featureName: 'Patients',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist', 'nurse', 'laboratorist']
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
        roles: ['admin', 'doctor', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Cabins',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Tests',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist', 'laboratorist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Reports',
        isVisible: true,
        roles: ['admin', 'doctor', 'receptionist']
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
        moduleName: 'Navigation',
        featureName: 'Marketing',
        isVisible: true,
        roles: ['admin', 'marketing']
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
        roles: ['admin', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Billing',
        featureName: 'Test Requisition',
        isVisible: true,
        roles: ['admin', 'receptionist', 'doctor', 'laboratorist']
    },
    {
        moduleName: 'Billing',
        featureName: 'Doctor Referral',
        isVisible: true,
        roles: ['admin', 'receptionist', 'marketing']
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
        roles: ['admin', 'receptionist', 'doctor', 'nurse']
    },
    {
        moduleName: 'Reports',
        featureName: 'Appointment Reports',
        isVisible: true,
        roles: ['admin', 'receptionist', 'doctor', 'nurse']
    },
    {
        moduleName: 'Reports',
        featureName: 'Test Reports',
        isVisible: true,
        roles: ['admin', 'receptionist', 'doctor']
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
    },
    // Marketing Module Permissions
    {
        moduleName: 'Marketing',
        featureName: 'Doctor Commissions',
        isVisible: true,
        roles: ['admin', 'marketing']
    },
    {
        moduleName: 'Marketing',
        featureName: 'Referral Dashboard',
        isVisible: true,
        roles: ['admin', 'marketing']
    },
    {
        moduleName: 'Marketing',
        featureName: 'Commission Reports',
        isVisible: true,
        roles: ['admin', 'marketing']
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