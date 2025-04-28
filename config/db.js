const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize('b2x5bh1vndmfrkvgyf7s', 'uqmrd1c2tbwih12w', '0QIKxuxpymAvBCO8S1Ng', {
  host: 'b2x5bh1vndmfrkvgyf7s-mysql.services.clever-cloud.com',
  dialect: 'mysql',
  logging: false
});

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
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        
        if (!adminExists) {
          // Create default admin user
          await User.create({
            username: 'admin',
            email: 'admin@hospital.com',
            password: '$2a$12$m4lbAjaY35D0D6SbQ5hb3.IK9yze5OFACt26VoSkmWeSNZ7HBkLTi', // Will be hashed by the model hooks
            role: 'admin',
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
