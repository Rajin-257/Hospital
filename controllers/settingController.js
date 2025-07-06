const FeaturePermission = require('../models/FeaturePermission');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { getTenantTest, getTenantSetting, getTenantPrintTemplate } = require('../utils/tenantModels');
const { getSequelize } = require('../config/db');
const multer = require('multer');

// Configure multer for print template image uploads
const printTemplateStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'print-templates');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomNumber = Math.floor(Math.random() * 1000000);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${timestamp}-${randomNumber}${extension}`);
  }
});

const printTemplateUpload = multer({
  storage: printTemplateStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, and SVG images are allowed.'));
    }
  }
});

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

// Print Template CRUD Operations

// Get all print templates
exports.getPrintTemplates = async (req, res) => {
  try {
    const PrintTemplate = getTenantPrintTemplate();
    const templates = await PrintTemplate.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching print templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching print templates'
    });
  }
};

// Get single print template
exports.getPrintTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const PrintTemplate = getTenantPrintTemplate();
    
    const template = await PrintTemplate.findByPk(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Print template not found'
      });
    }
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching print template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching print template'
    });
  }
};

// Create print template
exports.createPrintTemplate = async (req, res) => {
  try {
    // Use multer middleware to handle file uploads
    printTemplateUpload.fields([
      { name: 'headerImage', maxCount: 1 },
      { name: 'footerImage', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      const { name, status, header_width, header_height, footer_width, footer_height } = req.body;
      
      const PrintTemplate = getTenantPrintTemplate();
      
      // Prepare template data
      const templateData = {
        name,
        status: status || 'inactive',
        header_width: header_width ? parseInt(header_width) : null,
        header_height: header_height ? parseInt(header_height) : null,
        footer_width: footer_width ? parseInt(footer_width) : null,
        footer_height: footer_height ? parseInt(footer_height) : null
      };
      
      // Handle header image
      if (req.files && req.files.headerImage) {
        templateData.header_img = '/uploads/print-templates/' + req.files.headerImage[0].filename;
      }
      
      // Handle footer image
      if (req.files && req.files.footerImage) {
        templateData.footer_image = '/uploads/print-templates/' + req.files.footerImage[0].filename;
      }
      
      const template = await PrintTemplate.create(templateData);
      
      res.json({
        success: true,
        message: 'Print template created successfully',
        template
      });
    });
  } catch (error) {
    console.error('Error creating print template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating print template'
    });
  }
};

// Update print template
exports.updatePrintTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use multer middleware to handle file uploads
    printTemplateUpload.fields([
      { name: 'headerImage', maxCount: 1 },
      { name: 'footerImage', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      const PrintTemplate = getTenantPrintTemplate();
      
      const template = await PrintTemplate.findByPk(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Print template not found'
        });
      }
      
      const { name, status, header_width, header_height, footer_width, footer_height } = req.body;
      
      // Prepare update data
      const updateData = {
        name,
        status: status || 'inactive',
        header_width: header_width ? parseInt(header_width) : null,
        header_height: header_height ? parseInt(header_height) : null,
        footer_width: footer_width ? parseInt(footer_width) : null,
        footer_height: footer_height ? parseInt(footer_height) : null
      };
      
      // Handle header image
      if (req.files && req.files.headerImage) {
        // Delete old header image if exists
        if (template.header_img) {
          const oldHeaderPath = path.join(__dirname, '..', 'public', template.header_img);
          if (fs.existsSync(oldHeaderPath)) {
            fs.unlinkSync(oldHeaderPath);
          }
        }
        updateData.header_img = '/uploads/print-templates/' + req.files.headerImage[0].filename;
      }
      
      // Handle footer image
      if (req.files && req.files.footerImage) {
        // Delete old footer image if exists
        if (template.footer_image) {
          const oldFooterPath = path.join(__dirname, '..', 'public', template.footer_image);
          if (fs.existsSync(oldFooterPath)) {
            fs.unlinkSync(oldFooterPath);
          }
        }
        updateData.footer_image = '/uploads/print-templates/' + req.files.footerImage[0].filename;
      }
      
      await template.update(updateData);
      
      res.json({
        success: true,
        message: 'Print template updated successfully',
        template
      });
    });
  } catch (error) {
    console.error('Error updating print template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating print template'
    });
  }
};

// Delete print template
exports.deletePrintTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const PrintTemplate = getTenantPrintTemplate();
    
    const template = await PrintTemplate.findByPk(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Print template not found'
      });
    }
    
    // Delete associated images
    if (template.header_img) {
      const headerPath = path.join(__dirname, '..', 'public', template.header_img);
      if (fs.existsSync(headerPath)) {
        fs.unlinkSync(headerPath);
      }
    }
    
    if (template.footer_image) {
      const footerPath = path.join(__dirname, '..', 'public', template.footer_image);
      if (fs.existsSync(footerPath)) {
        fs.unlinkSync(footerPath);
      }
    }
    
    await template.destroy();
    
    res.json({
      success: true,
      message: 'Print template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting print template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting print template'
    });
  }
};

// Export multer upload middleware for use in routes
exports.printTemplateUpload = printTemplateUpload; 