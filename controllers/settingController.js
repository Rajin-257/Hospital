const FeaturePermission = require('../models/FeaturePermission');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { getTenantTest, getTenantSetting } = require('../utils/tenantModels');
const { getSequelize } = require('../config/db');


// Get settings page
exports.getSettings = async (req, res) => {
  try {
    const Setting = getTenantSetting();
    const settings = await Setting.findOne();
    const featurePermissions = await FeaturePermission.findAll();
    
    // Group permissions by module
    const modules = {};
    featurePermissions.forEach(permission => {
      if (!modules[permission.moduleName]) {
        modules[permission.moduleName] = [];
      }
      modules[permission.moduleName].push(permission);
    });
    
    res.render('settings', {
      title: 'Settings',
      settings: settings || {},
      modules,
      user: req.user,
      message: req.query.message || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.render('settings', {
      title: 'Settings',
      error: 'Error loading settings',
      settings: {},
      modules: {},
      user: req.user,
      message: null
    });
  }
};

// Create or update settings
exports.updateSettings = async (req, res) => {
  try {
    const { medical_name, address, phone, email } = req.body;
    
    const Setting = getTenantSetting();
    
    // Check if settings already exist
    let settings = await Setting.findOne();
    
    let favicon_path = settings ? settings.favicon_path : null;
    
    // Handle favicon upload if a file was provided
    if (req.file) {
      // If there was a previous favicon, delete it
      if (favicon_path) {
        const oldFilePath = path.join(__dirname, '..', 'public', favicon_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      // Set the new favicon path
      favicon_path = '/uploads/favicons/' + req.file.filename;
    }
    
    if (settings) {
      // Update existing settings
      settings = await settings.update({
        medical_name,
        address,
        phone,
        email,
        favicon_path
      });
    } else {
      // Create new settings
      settings = await Setting.create({
        medical_name,
        address,
        phone,
        email,
        favicon_path
      });
    }
    
    res.redirect('/settings?message=Settings updated successfully');
  } catch (error) {
    console.error('Error updating settings:', error);
    res.redirect('/settings?error=Failed to update settings');
  }
};

// Get feature permissions
exports.getFeaturePermissions = async (req, res) => {
  try {
    const { moduleName } = req.params;
    
    const whereClause = moduleName ? { moduleName } : {};
    
    const permissions = await FeaturePermission.findAll({
      where: whereClause,
      order: [['moduleName', 'ASC'], ['featureName', 'ASC']]
    });
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching feature permissions:', error);
    res.status(500).json({ message: 'Error fetching feature permissions' });
  }
};

// Update feature permission
exports.updateFeaturePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible, roles } = req.body;
    
    const permission = await FeaturePermission.findByPk(id);
    
    if (!permission) {
      return res.status(404).json({ message: 'Feature permission not found' });
    }
    
    await permission.update({
      isVisible: isVisible === 'true' || isVisible === true,
      roles: roles || ['softadmin'],
      updatedBy: req.user.id
    });
    
    res.json(permission);
  } catch (error) {
    console.error('Error updating feature permission:', error);
    res.status(500).json({ message: 'Error updating feature permission' });
  }
};

// Batch update feature permissions
exports.batchUpdatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions data' });
    }
    
    // Process each permission update
    for (const perm of permissions) {
      const permission = await FeaturePermission.findByPk(perm.id);
      if (permission) {
        await permission.update({
          isVisible: perm.isVisible,
          roles: perm.roles,
          updatedBy: req.user.id
        });
      }
    }
    
    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Error updating feature permissions:', error);
    res.status(500).json({ message: 'Error updating feature permissions' });
  }
};

// Import feature permissions
exports.importFeaturePermissions = async (req, res) => {
    try {
        const { importFeaturePermissions } = require('../scripts/featureData');
        
        const result = await importFeaturePermissions();
        
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(500).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Error importing feature permissions:', error);
        res.status(500).json({ success: false, message: 'Error importing feature permissions' });
    }
};

// Import test data
exports.importTestData = async (req, res) => {
    try {
        // Get tenant-safe models
        const Test = getTenantTest();
        const Setting = getTenantSetting();
        
        // Import hierarchical test data from the testData file
        const { importHierarchicalDataToTenant, importTestsToTenant } = require('../scripts/testData');
        
        const sequelize = getSequelize();
        const dbName = sequelize.config ? sequelize.config.database : 'unknown';
        
        console.log(`Starting test data import for tenant: ${dbName}`);
        
        // Choose import type based on request body
        const importType = req.body.importType || 'hierarchical';
        
        let result;
        if (importType === 'hierarchical') {
            // Import full hierarchical data (departments, categories, groups, tests)
            result = await importHierarchicalDataToTenant(sequelize);
        } else {
            // Import only tests (backward compatibility)
            result = await importTestsToTenant(sequelize);
        }
        
        res.json({
            success: true,
            message: result.message,
            data: result.counts || { count: result.count },
            tenant: dbName
        });
        
    } catch (error) {
        console.error('Error importing test data:', error);
        res.status(500).json({ 
            success: false, 
            message: `Error importing test data: ${error.message}`,
            error: error.stack
        });
    }
}; 