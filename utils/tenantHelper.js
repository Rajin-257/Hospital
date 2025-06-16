const { getSequelize } = require('../config/db');

/**
 * Tenant Database Helper
 * Ensures all database operations use the correct tenant database
 */

// Get tenant-aware sequelize instance
function getTenantSequelize() {
    const sequelize = getSequelize();
    const dbName = sequelize.config ? sequelize.config.database : 'unknown';
    
    // Add debug logging to track which database is being used
    if (dbName.includes('hospx_db_') || dbName.includes('tenant_')) {
        console.log(`✅ Using TENANT database: ${dbName}`);
    } else {
        console.warn(`⚠️  Using DEFAULT database: ${dbName}`);
    }
    
    return sequelize;
}

// Create tenant-aware transaction
async function createTenantTransaction() {
    const sequelize = getTenantSequelize();
    return await sequelize.transaction();
}

// Execute query with tenant database
async function executeWithTenant(operation) {
    try {
        const sequelize = getTenantSequelize();
        return await operation(sequelize);
    } catch (error) {
        console.error('Tenant operation failed:', error);
        throw error;
    }
}

// Validate tenant context
function validateTenantContext() {
    const sequelize = getSequelize();
    const dbName = sequelize.config ? sequelize.config.database : null;
    
    if (!dbName || (!dbName.includes('hospx_db_') && !dbName.includes('tenant_'))) {
        console.error(`🚨 CRITICAL: Using non-tenant database: ${dbName}`);
        throw new Error('Tenant context not established - using default database');
    }
    
    return true;
}

// Debug current database
function debugCurrentDatabase() {
    const sequelize = getSequelize();
    const dbName = sequelize.config ? sequelize.config.database : 'unknown';
    
    console.log('🔍 Current Database Debug:');
    console.log(`   Database: ${dbName}`);
    console.log(`   Is Tenant: ${dbName.includes('hospx_db_') || dbName.includes('tenant_')}`);
    console.log(`   Sequelize: ${!!sequelize}`);
    
    return {
        database: dbName,
        isTenant: dbName.includes('hospx_db_') || dbName.includes('tenant_'),
        sequelize: !!sequelize
    };
}

module.exports = {
    getTenantSequelize,
    createTenantTransaction,
    executeWithTenant,
    validateTenantContext,
    debugCurrentDatabase
}; 