/**
 * SaaS Configuration for Hospital Management System
 * 
 * This file contains the configuration for integrating the Hospital Management System
 * with the SaaS domain and database management system.
 * 
 * Required Environment Variables:
 * 
 * SAAS_DB_HOST - Host for the SaaS master database (default: localhost)
 * SAAS_DB_USER - Username for the SaaS master database (default: root)
 * SAAS_DB_PASSWORD - Password for the SaaS master database (default: empty)
 * SAAS_DB_NAME - Name of the SaaS master database (default: hospx_saas)
 * 
 * DB_HOST - Host for tenant databases (default: localhost)
 * DB_USER - Username for tenant databases (default: root)
 * DB_PASSWORD - Password for tenant databases (default: empty)
 * 
 * REGISTRATION_URL - URL for domain registration (default: https://hospx.app/register)
 */

const saasConfig = {
    // SaaS Master Database Configuration
    saasDatabase: {
        host: process.env.SAAS_DB_HOST || 'localhost',
        user: process.env.SAAS_DB_USER || 'root',
        password: process.env.SAAS_DB_PASSWORD || '',
        database: process.env.SAAS_DB_NAME || 'hospx_saas'
    },
    
    // Tenant Database Configuration
    tenantDatabase: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        dialect: process.env.DB_DIALECT || 'mysql'
    },
    
    // Registration Configuration
    registration: {
        url: process.env.REGISTRATION_URL || 'https://hospx.app/register',
        supportEmail: 'support@hospx.app'
    },
    
    // Domain Validation Settings
    validation: {
        skipPaths: ['/public', '/favicon.ico', '/error', '/health'],
        cacheTTL: 300, // 5 minutes cache for domain validation
        enableCache: false // Disable cache for now, can be enabled later
    },
    
    // Error Messages
    messages: {
        domainNotFound: 'Please register your hospital to access this system.',
        domainExpired: 'Your domain subscription has expired. Please renew your subscription.',
        databaseNotFound: 'No active database found for this domain. Please contact support.',
        databaseExpired: 'Your database subscription has expired. Please renew your subscription.',
        connectionError: 'Unable to connect to your database. Please contact support.',
        systemError: 'System error occurred. Please try again later.'
    }
};

module.exports = saasConfig; 