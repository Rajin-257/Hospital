const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const { setTenantDatabase, runInTenantContext, getOrCreateTenantConnection } = require('../config/db');

// Utility function to extract the real domain from request
function extractRealDomain(req) {
    // Priority order for domain extraction
    const domainSources = [
        req.get('X-Real-Host'),           // Real host from reverse proxy
        req.get('X-Original-Host'),       // Original host before proxy
        req.get('X-Forwarded-Host'),      // Forwarded host from proxy
        req.get('host'),                  // Standard host header
        req.hostname                      // Express hostname property
    ];
    
    let currentDomain = null;
    
    // Find the first valid domain
    for (const domain of domainSources) {
        if (domain && 
            domain !== '*.hospx.app' && 
            !domain.startsWith('*.') &&
            domain !== 'localhost' &&
            !domain.startsWith('127.0.0.1') &&
            !domain.startsWith('192.168.')) {
            currentDomain = domain.split(':')[0].toLowerCase(); // Remove port if present and normalize
            break;
        }
    }
    
    // If we still have a wildcard domain or localhost, try to extract from referrer
    if (!currentDomain || 
        currentDomain === '*.hospx.app' || 
        currentDomain.startsWith('*.') ||
        currentDomain === 'localhost') {
        const referer = req.get('Referer');
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                if (refererUrl.hostname.endsWith('.hospx.app') && 
                    !refererUrl.hostname.startsWith('*.') &&
                    refererUrl.hostname !== 'localhost') {
                    currentDomain = refererUrl.hostname.toLowerCase();
                }
            } catch (e) {
                // Ignore invalid referrer URLs
                console.log('Invalid referrer URL:', referer);
            }
        }
    }
    
    // Log the domain extraction for debugging
    console.log('Domain extraction:', {
        headers: {
            'X-Real-Host': req.get('X-Real-Host'),
            'X-Original-Host': req.get('X-Original-Host'),
            'X-Forwarded-Host': req.get('X-Forwarded-Host'),
            'host': req.get('host'),
            'hostname': req.hostname
        },
        extracted: currentDomain,
        referer: req.get('Referer')
    });
    
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

// Initialize SaaS database connection with retry logic
async function initializeSaasConnection() {
    if (saasConnection) {
        try {
            // Test existing connection
            await saasConnection.ping();
            return saasConnection;
        } catch (error) {
            console.log('🔄 SaaS connection lost, recreating...');
            saasConnection = null;
        }
    }

    try {
        saasConnection = await mysql.createConnection(saasDbConfig);
        console.log('✅ SaaS database connected successfully');
        return saasConnection;
    } catch (error) {
        console.error('❌ SaaS database connection error:', error);
        throw error;
    }
}

// Validate domain and get tenant database connection
async function validateDomainAndConnect(req, res, next) {
    // Run each request in its own context to avoid race conditions
    return runInTenantContext(async () => {
        try {
            // Skip validation for certain paths
            const skipPaths = ['/public', '/favicon.ico', '/error', '/css', '/js', '/images'];
            if (skipPaths.some(path => req.path.startsWith(path))) {
                return next();
            }

            // Get the current domain
            let currentDomain = extractRealDomain(req);
            
            // If no domain extracted, we can't proceed
            if (!currentDomain) {
                console.warn('⚠️ No valid domain extracted from request');
                const registrationUrl = 'https://hospx.app/register';
                
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(403).json({
                        success: false,
                        message: 'Invalid domain',
                        redirectUrl: registrationUrl
                    });
                } else {
                    return res.status(403).render('saas-error', {
                        title: 'Invalid Domain',
                        message: 'Unable to determine domain. Please check your URL.',
                        registrationUrl: registrationUrl,
                        currentDomain: 'unknown'
                    });
                }
            }

            // Initialize SaaS connection if not exists or reconnect if needed
            try {
                await initializeSaasConnection();
            } catch (saasError) {
                console.error('❌ Failed to connect to SaaS database:', saasError);
                const errorMessage = 'System database unavailable. Please try again later.';
                
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
                        currentDomain: currentDomain
                    });
                }
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
                    return res.status(403).json({
                        success: false,
                        message: 'Please register your hospital first',
                        redirectUrl: registrationUrl
                    });
                } else {
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

            // Get tenant database connection using improved connection management
            const databaseName = database.database_name;
            let tenantSequelize;

            try {
                tenantSequelize = await getOrCreateTenantConnection(databaseName);
            } catch (dbError) {
                console.error('❌ Tenant database connection error:', dbError);
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

            // Set the tenant database as the active database for this request
            setTenantDatabase(tenantSequelize);

            // Update last accessed time (with error handling)
            try {
                await saasConnection.execute(
                    'UPDATE domains SET last_accessed = NOW() WHERE id = ?',
                    [domain.id]
                );

                await saasConnection.execute(
                    'UPDATE `databases` SET last_accessed = NOW() WHERE id = ?',
                    [database.id]
                );
            } catch (updateError) {
                console.warn('⚠️ Failed to update last accessed time:', updateError.message);
                // Don't fail the request for this non-critical operation
            }

            // Attach tenant info to request
            req.tenant = {
                domain: domain,
                database: database,
                sequelize: tenantSequelize
            };

            console.log(`✅ Tenant context established for ${currentDomain} -> ${databaseName}`);
            next();

        } catch (error) {
            console.error('❌ SaaS middleware error:', error);
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
                    currentDomain: req.get('host') || 'unknown'
                });
            }
        }
    });
}

// Get tenant database connection
function getTenantConnection(req) {
    return req.tenant ? req.tenant.sequelize : null;
}

// Graceful shutdown handling for SaaS connection
const closeSaasConnection = async () => {
    if (saasConnection) {
        try {
            await saasConnection.end();
            saasConnection = null;
            console.log('✅ Closed SaaS database connection');
        } catch (error) {
            console.error('❌ Error closing SaaS connection:', error);
        }
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('📪 Received SIGINT, closing SaaS connection...');
    await closeSaasConnection();
});

process.on('SIGTERM', async () => {
    console.log('📪 Received SIGTERM, closing SaaS connection...');
    await closeSaasConnection();
});

module.exports = {
    validateDomainAndConnect,
    getTenantConnection,
    initializeSaasConnection,
    closeSaasConnection
}; 