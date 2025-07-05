const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Store for request-specific database connections
const asyncLocalStorage = require('async_hooks').AsyncLocalStorage;
const als = new asyncLocalStorage();

// Global connection pool for tenant databases
const tenantConnections = new Map();

// Default sequelize instance (for fallback)
let defaultSequelize = new Sequelize(
  process.env.DB_NAME || 'hospital_management',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /ConnectionError/
      ],
      max: 3
    }
  }
);

const connectDB = async () => {
  try {
    await defaultSequelize.authenticate();
    defaultSequelize.sync({ force: true });  //Do sync when you create, update, Delete and alter the table
    console.log('✅ Default database connected successfully');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Set tenant database connection for current request context
const setTenantDatabase = (tenantSequelize) => {
  try {
    const store = als.getStore();
    if (store && tenantSequelize) {
      store.tenantSequelize = tenantSequelize;
      console.log('Set tenant database for request:', tenantSequelize.config.database);
    } else {
      console.warn('⚠️ Could not set tenant database - no store or sequelize instance');
    }
  } catch (error) {
    console.error('❌ Error setting tenant database:', error);
  }
};

// Get database connection for current request with proper fallback
const getSequelize = () => {
  try {
    const store = als.getStore();
    if (store && store.tenantSequelize) {
      // Verify the connection is still alive
      if (store.tenantSequelize.connectionManager && 
          !store.tenantSequelize.connectionManager.pool._closed) {
        return store.tenantSequelize;
      } else {
        console.warn('⚠️ Tenant connection is closed, falling back to default');
      }
    }
  } catch (error) {
    console.warn('⚠️ Error getting tenant sequelize, falling back to default:', error.message);
  }
  
  return defaultSequelize;
};

// Get or create tenant connection with proper caching
const getOrCreateTenantConnection = async (databaseName) => {
  try {
    // Check if we already have a valid connection
    if (tenantConnections.has(databaseName)) {
      const connectionData = tenantConnections.get(databaseName);
      const tenantSequelize = connectionData.sequelize;
      
      // Verify connection is still alive
      if (tenantSequelize.connectionManager && 
          !tenantSequelize.connectionManager.pool._closed) {
        connectionData.lastUsed = Date.now();
        return tenantSequelize;
      } else {
        // Connection is closed, remove from cache
        tenantConnections.delete(databaseName);
      }
    }

    // Create new connection
    const tenantDbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: databaseName,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      retry: {
        match: [
          /ETIMEDOUT/,
          /EHOSTUNREACH/,
          /ECONNRESET/,
          /ECONNREFUSED/,
          /ETIMEDOUT/,
          /ESOCKETTIMEDOUT/,
          /EHOSTUNREACH/,
          /EPIPE/,
          /EAI_AGAIN/,
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/,
          /ConnectionError/
        ],
        max: 3
      }
    };

    const tenantSequelize = new Sequelize(
      tenantDbConfig.database, 
      tenantDbConfig.user, 
      tenantDbConfig.password, 
      {
        host: tenantDbConfig.host,
        dialect: tenantDbConfig.dialect,
        logging: tenantDbConfig.logging,
        pool: tenantDbConfig.pool,
        retry: tenantDbConfig.retry
      }
    );

    // Test the connection
    await tenantSequelize.authenticate();

    // Cache the connection
    tenantConnections.set(databaseName, {
      sequelize: tenantSequelize,
      lastUsed: Date.now()
    });

    console.log(`✅ Created new tenant connection for: ${databaseName}`);
    return tenantSequelize;

  } catch (error) {
    console.error(`❌ Failed to create tenant connection for ${databaseName}:`, error);
    throw error;
  }
};

// Run function in tenant context with proper error handling
const runInTenantContext = (fn) => {
  return als.run({ tenantSequelize: null }, async () => {
    try {
      return await fn();
    } catch (error) {
      console.error('❌ Error in tenant context:', error);
      throw error;
    }
  });
};

// Clean up idle connections
const cleanupIdleConnections = async () => {
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();
  
  for (const [databaseName, connectionData] of tenantConnections.entries()) {
    if (connectionData.lastUsed && (now - connectionData.lastUsed) > IDLE_TIMEOUT) {
      try {
        await connectionData.sequelize.close();
        tenantConnections.delete(databaseName);
        console.log(`🧹 Cleaned up idle connection for: ${databaseName}`);
      } catch (error) {
        console.error(`❌ Error cleaning up connection for ${databaseName}:`, error);
      }
    }
  }
};

// Schedule cleanup every 15 minutes
setInterval(cleanupIdleConnections, 15 * 60 * 1000);

// Graceful shutdown handling
const closeAllConnections = async () => {
  console.log('🔄 Closing all database connections...');
  
  // Close tenant connections
  for (const [databaseName, connectionData] of tenantConnections.entries()) {
    try {
      await connectionData.sequelize.close();
      console.log(`✅ Closed tenant connection: ${databaseName}`);
    } catch (error) {
      console.error(`❌ Error closing tenant connection ${databaseName}:`, error);
    }
  }
  tenantConnections.clear();
  
  // Close default connection
  try {
    await defaultSequelize.close();
    console.log('✅ Closed default database connection');
  } catch (error) {
    console.error('❌ Error closing default connection:', error);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('📪 Received SIGINT, closing database connections...');
  await closeAllConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📪 Received SIGTERM, closing database connections...');
  await closeAllConnections();
  process.exit(0);
});

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
  getOrCreateTenantConnection,
  runInTenantContext,
  defaultSequelize,
  closeAllConnections
};