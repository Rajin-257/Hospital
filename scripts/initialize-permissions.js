require('dotenv').config();
const { connectDB } = require('../config/db');
const FeaturePermission = require('../models/FeaturePermission');
const Setting = require('../models/Setting');
const featureData = require('./featureData');

// Function to import feature permissions
async function importFeaturePermissions() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    console.log('Clearing existing feature permissions...');
    await FeaturePermission.destroy({ where: {} });
    
    console.log('Importing feature permissions...');
    for (const permission of featureData.featurePermissions) {
      await FeaturePermission.create({
        moduleName: permission.moduleName,
        featureName: permission.featureName,
        isVisible: permission.isVisible,
        roles: permission.roles
      });
    }
    
    console.log('Updating settings to mark feature permissions as imported...');
    let settings = await Setting.findOne();
    if (settings) {
      await settings.update({
        import_feature_data: true
      });
    }
    
    console.log('Feature permissions imported successfully');
  } catch (error) {
    console.error('Error importing feature permissions:', error);
  }
}

// Run the import
importFeaturePermissions(); 