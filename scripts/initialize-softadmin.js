const User = require('../models/User');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * This script will:
 * 1. Create a new softadmin user if it doesn't exist - this is the super admin role
 *    with full access to all features including permission management
 * 2. Keep existing admin users as they are - admin role now has limited permissions
 *    that can be controlled by the softadmin
 */
async function initializeSoftAdmin() {
  try {
    console.log('Starting softadmin initialization...');
    console.log('NOTE: The softadmin role is the super admin with full access to all features.');
    console.log('      The admin role is now controlled by permissions set by the softadmin.');
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Create a softadmin user if it doesn't exist
      const softAdminExists = await User.findOne({
        where: { role: 'softadmin' },
        transaction
      });
      
      if (!softAdminExists) {
        console.log('Creating softadmin user...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('softadmin123', salt);
        
        await User.create({
          username: 'softadmin',
          password: hashedPassword,
          email: 'softadmin@hospital.com',
          role: 'softadmin',
          isActive: true
        }, { transaction });
        
        console.log('Softadmin user created successfully!');
        console.log('Username: softadmin');
        console.log('Password: softadmin123');
      } else {
        console.log('Softadmin user already exists.');
      }
      
      // Commit the transaction
      await transaction.commit();
      console.log('Softadmin initialization completed successfully!');
      
    } catch (error) {
      // If there's an error, rollback the transaction
      await transaction.rollback();
      console.error('Error initializing softadmin:', error);
    }
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

// Run the initialization function
initializeSoftAdmin()
  .then(() => {
    console.log('Initialization script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Initialization script failed:', error);
    process.exit(1);
  }); 