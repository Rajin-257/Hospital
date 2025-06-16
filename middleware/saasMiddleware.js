const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const { setTenantDatabase, runInTenantContext } = require('../config/db');

// Utility function to extract the real domain from request
function extractRealDomain(req) {
    // Priority order for domain extraction
    const domainSources = [
        req.get('X-Real-Host'),           // Real host from reverse proxy
        req.get('X-Original-Host'),       // Original host before proxy
        req.get('X-Forwarded-Host'),      // Forwarded host from proxy
        req.get('host')                   // Standard host header
    ];
    
    let currentDomain = null;
    
    // Find the first valid domain
    for (const domain of domainSources) {
        if (domain && domain !== '*.hospx.app' && !domain.startsWith('*.')) {
            currentDomain = domain.split(':')[0]; // Remove port if present
            break;
        }
    }
    
    // If we still have a wildcard domain, try to extract from referrer
    if (!currentDomain || currentDomain === '*.hospx.app' || currentDomain.startsWith('*.')) {
        const referer = req.get('Referer');
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                if (refererUrl.hostname.endsWith('.hospx.app') && !refererUrl.hostname.startsWith('*.')) {
                    currentDomain = refererUrl.hostname;
                }
            } catch (e) {
                // Ignore invalid referrer URLs
            }
        }
    }
    
    // Fallback to request hostname if available
    if (!currentDomain || currentDomain === '*.hospx.app' || currentDomain.startsWith('*.')) {
        if (req.hostname && req.hostname !== '*.hospx.app' && !req.hostname.startsWith('*.')) {
            currentDomain = req.hostname;
        }
    }
    
    return currentDomain;
}

// SaaS database connection (hospx-saas database)
const saasDbConfig = {
    host: process.env.SAAS_DB_HOST || 'localhost',
    user: process.env.SAAS_DB_USER || 'root',
    password: process.env.SAAS_DB_PASSWORD || '',
    database: process.env.SAAS_DB_NAME || 'hospx_saas',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    connectionLimit: 10
};

let saasConnection;
let tenantConnections = new Map(); // Cache tenant connections

// Initialize SaaS database connection
async function initializeSaasConnection() {
    try {
        saasConnection = await mysql.createConnection(saasDbConfig);
    } catch (error) {
        console.error('SaaS database connection error:', error);
        throw error;
    }
}

// Clean up idle tenant connections
async function cleanupIdleConnections() {
    const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    
    for (const [databaseName, connection] of tenantConnections.entries()) {
        if (connection.lastUsed && (now - connection.lastUsed) > IDLE_TIMEOUT) {
            try {
                await connection.sequelize.close();
                tenantConnections.delete(databaseName);
            } catch (error) {
                console.error(`Error cleaning up connection for ${databaseName}:`, error);
            }
        }
    }
}

// Schedule cleanup every 15 minutes
setInterval(cleanupIdleConnections, 15 * 60 * 1000);

// Validate domain and get tenant database connection
async function validateDomainAndConnect(req, res, next) {
    // Run each request in its own context to avoid race conditions
    return runInTenantContext(async () => {
        try {
        // Skip validation for certain paths
        const skipPaths = ['/public', '/favicon.ico', '/error'];
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Get the current domain
        // Handle wildcard certificates and proxy configurations
        let currentDomain = extractRealDomain(req);
        

        // Initialize SaaS connection if not exists
        if (!saasConnection) {
            await initializeSaasConnection();
        }

        // Check if domain exists in domains table (without status check)
        const [domainResult] = await saasConnection.execute(
            'SELECT * FROM domains WHERE domain_name = ?',
            [currentDomain]
        );

        if (domainResult.length === 0) {
            // Domain not found, redirect to registration
            const registrationUrl = 'https://hospx.app/register';
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                // If it's an AJAX request
                return res.status(403).json({
                    success: false,
                    message: 'Please register your hospital first',
                    redirectUrl: registrationUrl
                });
            } else {
                // Regular request - render error page with redirect
                return res.status(403).render('saas-error', {
                    title: 'Domain Not Registered',
                    message: 'Please register your hospital to access this system.',
                    registrationUrl: registrationUrl,
                    currentDomain: currentDomain
                });
            }
        }

        const domain = domainResult[0];

        // Get database information from databases table - check status and expiry here
        const [databaseResult] = await saasConnection.execute(
            'SELECT * FROM `databases` WHERE domain_id = ?',
            [domain.id]
        );

        if (databaseResult.length === 0) {
            const errorMessage = 'No database found for this domain. Please contact support.';
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage
                });
            } else {
                return res.status(500).render('saas-error', {
                    title: 'Database Error',
                    message: errorMessage,
                    registrationUrl: 'https://hospx.app/register',
                    currentDomain: currentDomain
                });
            }
        }

        const database = databaseResult[0];

        // Check database status
        if (database.status !== 'active') {
            const errorMessage = 'Your database subscription is not active. Please contact support or renew your subscription.';
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: errorMessage,
                    redirectUrl: 'https://hospx.app/register'
                });
            } else {
                return res.status(403).render('saas-error', {
                    title: 'Database Subscription Inactive',
                    message: errorMessage,
                    registrationUrl: 'https://hospx.app/register',
                    currentDomain: currentDomain
                });
            }
        }

        // Check database expiry
        const currentDate = new Date();
        const dbExpiryDate = new Date(database.expiry_date);
        
        // Set time to start of day for proper date comparison
        currentDate.setHours(0, 0, 0, 0);
        dbExpiryDate.setHours(0, 0, 0, 0);
        
        if (dbExpiryDate < currentDate) {
            const errorMessage = `Your database subscription has expired on ${dbExpiryDate.toDateString()}. Please renew your subscription.`;
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: errorMessage,
                    redirectUrl: 'https://hospx.app/register'
                });
            } else {
                return res.status(403).render('saas-error', {
                    title: 'Database Subscription Expired',
                    message: errorMessage,
                    registrationUrl: 'https://hospx.app/register',
                    currentDomain: currentDomain
                });
            }
        }

        // Get or create tenant database connection
        const databaseName = database.database_name;
        let tenantSequelize;

        // Check if we already have a connection for this database
        if (tenantConnections.has(databaseName)) {
            const connectionData = tenantConnections.get(databaseName);
            tenantSequelize = connectionData.sequelize;
            connectionData.lastUsed = Date.now(); // Update last used time
        } else {
            // Create new tenant database connection with connection pooling
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
                }
            };

            try {
                tenantSequelize = new Sequelize(tenantDbConfig.database, tenantDbConfig.user, tenantDbConfig.password, {
                    host: tenantDbConfig.host,
                    dialect: tenantDbConfig.dialect,
                    logging: tenantDbConfig.logging,
                    pool: tenantDbConfig.pool
                });

                await tenantSequelize.authenticate();

                // Cache the connection for reuse with timestamp
                tenantConnections.set(databaseName, {
                    sequelize: tenantSequelize,
                    lastUsed: Date.now()
                });
            } catch (dbError) {
                console.error('Tenant database connection error:', dbError);
                const errorMessage = 'Unable to connect to your database. Please contact support.';
                
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(500).json({
                        success: false,
                        message: errorMessage
                    });
                } else {
                    return res.status(500).render('saas-error', {
                        title: 'Database Connection Error',
                        message: errorMessage,
                        registrationUrl: 'https://hospx.app/register',
                        currentDomain: currentDomain
                    });
                }
            }
        }

        // Set the tenant database as the active database for this request
        setTenantDatabase(tenantSequelize);

        // Update last accessed time
        await saasConnection.execute(
            'UPDATE domains SET last_accessed = NOW() WHERE id = ?',
            [domain.id]
        );

        await saasConnection.execute(
            'UPDATE `databases` SET last_accessed = NOW() WHERE id = ?',
            [database.id]
        );

        // Attach tenant info to request
        req.tenant = {
            domain: domain,
            database: database,
            sequelize: tenantSequelize
        };

        next();

        } catch (error) {
            console.error('SaaS middleware error:', error);
            const errorMessage = 'System error occurred. Please try again later.';
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage
                });
            } else {
                return res.status(500).render('saas-error', {
                    title: 'System Error',
                    message: errorMessage,
                    registrationUrl: 'https://hospx.app/register',
                    currentDomain: req.get('host')
                });
            }
        }
    });
}

// Get tenant database connection
function getTenantConnection(req) {
    return req.tenant ? req.tenant.sequelize : null;
}

// Close tenant connection when needed
async function closeTenantConnection(req) {
    if (req.tenant && req.tenant.sequelize) {
        try {
            await req.tenant.sequelize.close();
        } catch (error) {
            console.error('Error closing tenant connection:', error);
        }
    }
}

// Close all tenant connections
async function closeAllTenantConnections() {
    console.log('Closing all tenant connections...');
    for (const [databaseName, connectionData] of tenantConnections.entries()) {
        try {
            await connectionData.sequelize.close();
            console.log(`Closed connection for database: ${databaseName}`);
        } catch (error) {
            console.error(`Error closing connection for ${databaseName}:`, error);
        }
    }
    tenantConnections.clear();
    
    // Close SaaS connection
    if (saasConnection) {
        try {
            await saasConnection.end();
            console.log('Closed SaaS database connection');
        } catch (error) {
            console.error('Error closing SaaS connection:', error);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connections...');
    await closeAllTenantConnections();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connections...');
    await closeAllTenantConnections();
    process.exit(0);
});

module.exports = {
    validateDomainAndConnect,
    getTenantConnection,
    closeTenantConnection,
    initializeSaasConnection,
    closeAllTenantConnections
}; 