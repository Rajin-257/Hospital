const { getTenantSetting } = require('../utils/tenantModels');

// Load tenant-specific settings middleware
async function loadTenantSettings(req, res, next) {
    try {
        // Skip for paths that don't need settings
        const skipPaths = ['/public', '/favicon.ico', '/error', '/login'];
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Only load settings if we have a tenant database connection
        if (req.tenant && req.tenant.sequelize) {
            try {
                const Setting = getTenantSetting();
                const settings = await Setting.findOne();
                if (settings) {
                    res.locals.settings = settings;
                } else {
                    res.locals.settings = null;
                }
            } catch (settingsError) {
                console.error('Error loading tenant settings:', settingsError.message);
                res.locals.settings = null;
            }
        } else {
            // For non-tenant requests or before tenant is established
            res.locals.settings = null;
        }

        next();
    } catch (error) {
        console.error('Tenant settings middleware error:', error);
        res.locals.settings = null;
        next();
    }
}

module.exports = {
    loadTenantSettings
}; 