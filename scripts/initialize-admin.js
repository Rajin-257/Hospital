const User = require('../models/User');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * This script creates a basic admin user
 * The admin will have permissions controlled by the softadmin
 */
async function initializeAdmin() {
  try {
    console.log('Starting admin user initialization...');
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Create an admin user if it doesn't exist
      const adminExists = await User.findOne({
        where: { role: 'admin' },
        transaction
      });
      
      if (!adminExists) {
        console.log('Creating admin user...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        await User.create({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@hospital.com',
          role: 'admin',
          isActive: true
        }, { transaction });
        
        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');
      } else {
        console.log('Admin user already exists.');
      }
      
      // Commit the transaction
      await transaction.commit();
      console.log('Admin initialization completed successfully!');
      
    } catch (error) {
      // If there's an error, rollback the transaction
      await transaction.rollback();
      console.error('Error initializing admin:', error);
    }
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

// Run the initialization function
initializeAdmin()
  .then(() => {
    console.log('Initialization script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Initialization script failed:', error);
    process.exit(1);
  }); 