const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Store for request-specific database connections
const asyncLocalStorage = require('async_hooks').AsyncLocalStorage;
const als = new asyncLocalStorage();

// Default sequelize instance (for fallback)
let defaultSequelize = new Sequelize(
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
    await defaultSequelize.authenticate();
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Set tenant database connection for current request context
const setTenantDatabase = (tenantSequelize) => {
  const store = als.getStore();
  if (store && tenantSequelize) {
    store.tenantSequelize = tenantSequelize;
    console.log('Set tenant database for request:', tenantSequelize.config.database);
  }
};

// Get database connection for current request
const getSequelize = () => {
  const store = als.getStore();
  if (store && store.tenantSequelize) {
    return store.tenantSequelize;
  }
  return defaultSequelize;
};

// Run function in tenant context
const runInTenantContext = (fn) => {
  return als.run({ tenantSequelize: null }, fn);
};

// Export dynamic sequelize getter that works per request
const sequelize = new Proxy({}, {
  get: function(target, prop) {
    const currentSequelize = getSequelize();
    return currentSequelize[prop];
  },
  set: function(target, prop, value) {
    const currentSequelize = getSequelize();
    currentSequelize[prop] = value;
    return true;
  }
});

module.exports = { 
  sequelize, 
  connectDB, 
  setTenantDatabase, 
  getSequelize,
  runInTenantContext,
  defaultSequelize 
};