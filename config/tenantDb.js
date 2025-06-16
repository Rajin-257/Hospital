const { Sequelize } = require('sequelize');
const { getTenantConnection } = require('../middleware/saasMiddleware');

// Create tenant-specific database connection
function createTenantConnection(req) {
    const tenantSequelize = getTenantConnection(req);
    
    if (!tenantSequelize) {
        throw new Error('No tenant database connection available');
    }
    
    return tenantSequelize;
}

// Get tenant database from request
function getTenantDatabase(req) {
    if (req.tenant && req.tenant.sequelize) {
        return req.tenant.sequelize;
    }
    throw new Error('Tenant database not available');
}

// Initialize tenant-specific models
async function initializeTenantModels(req) {
    try {
        const tenantDb = getTenantDatabase(req);
        
        // Import and initialize all models with tenant database
        const models = {};
        
        // You can add your existing models here and initialize them with tenantDb
        // Example:
        // const Patient = require('../models/Patient');
        // models.Patient = Patient(tenantDb);
        
        return models;
    } catch (error) {
        console.error('Error initializing tenant models:', error);
        throw error;
    }
}

module.exports = {
    createTenantConnection,
    getTenantDatabase,
    initializeTenantModels
}; 