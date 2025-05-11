const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'hospital_management',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    
    // Sync database
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');
    
    setTimeout(async () => {
      try {
        // Import the User model
        const User = require('../models/User');
        
        // Check if admin user exists
        const adminExists = await User.findOne({ where: { username: 'softadmin' } });
        
        if (!adminExists) {
          // Create default admin user
          await User.create({
            username: 'softadmin',
            email: 'softadmin@hospital.com',
            password: '123', // Will be hashed by the model hooks
            role: 'softadmin',
            isActive: true
          });
          console.log('Default admin user created');
        }
      } catch (error) {
        console.error('Error creating default user:', error);
      }
    }, 500); // Small delay to ensure models are loaded
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };