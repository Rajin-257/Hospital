require('dotenv').config({ path: '../.env' });
const { connectDB } = require('../config/db');
const FeaturePermission = require('../models/FeaturePermission');

// Function to initialize or reset all permissions
async function initializeOrResetPermissions() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    console.log('Removing existing feature permissions...');
    await FeaturePermission.destroy({ where: {} });
    
    console.log('Initializing default feature permissions...');
    await FeaturePermission.initializeDefaults();
    
    console.log('Feature permissions initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing permissions:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeOrResetPermissions(); 