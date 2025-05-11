const FeaturePermission = require('../models/FeaturePermission');
const Setting = require('../models/Setting');

/**
 * Complete list of feature permissions for the application
 * Organized by module with default visibility and role assignments
 */
const featurePermissions = [
    //==============================================================
    // Navigation Module Permissions (Sidebar/Menu Access)
    //==============================================================
    {
        moduleName: 'Navigation',
        featureName: 'Dashboard',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse', 'laboratorist', 'marketing']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Billing',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Pay Bill',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Patients',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse', 'laboratorist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Doctors',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Appointments',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Cabins',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Tests',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'laboratorist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Reports',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Staff',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Settings',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'Navigation',
        featureName: 'Marketing',
        isVisible: true,
        roles: ['softadmin', 'admin', 'marketing']
    },

    //==============================================================
    // Patient Module Permissions
    //==============================================================
    {
        moduleName: 'Patients',
        featureName: 'Patients',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse', 'laboratorist']
    },
    {
        moduleName: 'Patients',
        featureName: 'Patient Registration',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Patients',
        featureName: 'Patient Management',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Patients',
        featureName: 'Patient Dashboard',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse']
    },

    //==============================================================
    // Doctor Module Permissions
    //==============================================================
    {
        moduleName: 'Doctors',
        featureName: 'Doctors',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Doctors',
        featureName: 'Doctor Management',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },

    //==============================================================
    // Appointment Module Permissions
    //==============================================================
    {
        moduleName: 'Appointments',
        featureName: 'Appointments',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Appointments',
        featureName: 'Schedule Appointment',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },

    //==============================================================
    // Billing Module Permissions
    //==============================================================
    {
        moduleName: 'Billing',
        featureName: 'Billing Management',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Billing',
        featureName: 'Schedule Appointment',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Billing',
        featureName: 'Cabin Allocation',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Billing',
        featureName: 'Test Requisition',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist', 'doctor', 'laboratorist']
    },
    {
        moduleName: 'Billing',
        featureName: 'Doctor Referral',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist', 'marketing']
    },

    //==============================================================
    // Test Module Permissions
    //==============================================================
    {
        moduleName: 'Tests',
        featureName: 'Tests',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'laboratorist']
    },
    {
        moduleName: 'Tests',
        featureName: 'Test Management',
        isVisible: true,
        roles: ['softadmin', 'admin', 'laboratorist']
    },
    {
        moduleName: 'Tests',
        featureName: 'Test Requisition',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'laboratorist']
    },

    //==============================================================
    // Cabin Module Permissions
    //==============================================================
    {
        moduleName: 'Cabins',
        featureName: 'Cabins',
        isVisible: true,
        roles: ['softadmin', 'admin', 'doctor', 'receptionist', 'nurse']
    },
    {
        moduleName: 'Cabins',
        featureName: 'Cabin Management',
        isVisible: true,
        roles: ['softadmin', 'admin','receptionist']
    },
    {
        moduleName: 'Cabins',
        featureName: 'Cabin Allocation',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist', 'nurse']
    },

    //==============================================================
    // Report Module Permissions
    //==============================================================
    {
        moduleName: 'Reports',
        featureName: 'Billing Reports',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist']
    },
    {
        moduleName: 'Reports',
        featureName: 'Patient Reports',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist', 'doctor', 'nurse']
    },
    {
        moduleName: 'Reports',
        featureName: 'Appointment Reports',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist', 'doctor', 'nurse']
    },
    {
        moduleName: 'Reports',
        featureName: 'Test Reports',
        isVisible: true,
        roles: ['softadmin', 'admin', 'receptionist', 'doctor']
    },

    //==============================================================
    // HRM Module Permissions
    //==============================================================
    {
        moduleName: 'HRM',
        featureName: 'Add Staff',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'HRM',
        featureName: 'View Staff',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'HRM',
        featureName: 'Edit Staff',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'HRM',
        featureName: 'Delete Staff',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'HRM',
        featureName: 'User Management',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },

    //==============================================================
    // Marketing Module Permissions
    //==============================================================
    {
        moduleName: 'Marketing',
        featureName: 'Doctor Commissions',
        isVisible: true,
        roles: ['softadmin', 'admin', 'marketing']
    },
    {
        moduleName: 'Marketing',
        featureName: 'Doctor Commission Management',
        isVisible: true,
        roles: ['softadmin', 'admin', 'marketing']
    },
    {
        moduleName: 'Marketing',
        featureName: 'Referral Dashboard',
        isVisible: true,
        roles: ['softadmin', 'admin', 'marketing']
    },
    {
        moduleName: 'Marketing',
        featureName: 'Commission Reports',
        isVisible: true,
        roles: ['softadmin', 'admin', 'marketing']
    },

    //==============================================================
    // Settings Module Permissions
    //==============================================================
    {
        moduleName: 'Settings',
        featureName: 'System Settings',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'Settings',
        featureName: 'General Settings',
        isVisible: true,
        roles: ['softadmin', 'admin']
    },
    {
        moduleName: 'Settings',
        featureName: 'Permission Management',
        isVisible: true,
        roles: ['softadmin']
    },
    {
        moduleName: 'Settings',
        featureName: 'Role Management',
        isVisible: true,
        roles: ['softadmin']
    }
];

/**
 * Imports all feature permissions into the database
 * Uses findOrCreate to avoid duplicates
 * Updates the import_feature_data flag in settings
 * @returns {Promise<boolean>} Success status
 */
const importFeaturePermissions = async () => {
    try {
        console.log('Importing feature permissions...');
        
        // Clear existing permissions
        await FeaturePermission.destroy({ where: {} });
        
        // Import permissions
        for (const permission of featurePermissions) {
            await FeaturePermission.create({
                moduleName: permission.moduleName,
                featureName: permission.featureName,
                isVisible: permission.isVisible,
                roles: permission.roles
            });
        }
        
        // Update settings
        let settings = await Setting.findOne();
        if (settings) {
            await settings.update({
                import_feature_data: true
            });
        }
        
        console.log('Feature permissions imported successfully');
        return { success: true, message: 'Feature permissions imported successfully' };
    } catch (error) {
        console.error('Error importing feature permissions:', error);
        return { success: false, message: 'Error importing feature permissions' };
    }
};

module.exports = {
    featurePermissions,
    importFeaturePermissions
};