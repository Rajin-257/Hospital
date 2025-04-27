const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bwkvtzzviot6zsuyrafd', 'u5hkm2xu1wcpkrik', 'pGBC5qW4HuUZlyPzywE0', {
  host: 'bwkvtzzviot6zsuyrafd-mysql.services.clever-cloud.com',
  dialect: 'mysql',
  logging: false
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
