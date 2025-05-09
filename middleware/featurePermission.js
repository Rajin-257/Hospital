const FeaturePermission = require('../models/FeaturePermission');
const { Op } = require('sequelize');

/**
 * Middleware to fetch feature permissions for all modules
 * and attach them to the request object for use throughout the request lifecycle
 */
exports.getFeaturePermissions = async (req, res, next) => {
  try {
    // Skip if user is not authenticated
    if (!req.user) {
      req.featurePermissions = {};
      res.locals.featurePermissions = {};
      res.locals.isFeatureVisible = () => false;
      return next();
    }

    // Fetch all permissions
    const permissions = await FeaturePermission.findAll({
      order: [['moduleName', 'ASC'], ['featureName', 'ASC']]
    });
    
    // Create a map of feature permissions
    const permissionsMap = {};
    permissions.forEach(permission => {
      permissionsMap[permission.featureName] = {
        id: permission.id,
        moduleName: permission.moduleName,
        isVisible: permission.isVisible,
        roles: permission.roles
      };
    });
    
    // Group permissions by module for UI display purposes
    const modulePermissions = {};
    permissions.forEach(permission => {
      if (!modulePermissions[permission.moduleName]) {
        modulePermissions[permission.moduleName] = [];
      }
      modulePermissions[permission.moduleName].push({
        id: permission.id,
        featureName: permission.featureName,
        isVisible: permission.isVisible,
        roles: permission.roles
      });
    });
    
    // Attach permissions to the request object
    req.featurePermissions = permissionsMap;
    req.modulePermissions = modulePermissions;
    
    // Add isFeatureVisible helper to res.locals for use in views
    res.locals.isFeatureVisible = (featureName, userRole = req.user.role) => {
      return exports.isFeatureVisible(permissionsMap, featureName, userRole);
    };
    
    // Add isAnyFeatureVisible helper to res.locals for use in views
    // Useful for showing/hiding UI elements based on multiple possible permissions
    res.locals.isAnyFeatureVisible = (featureNames, userRole = req.user.role) => {
      return exports.isAnyFeatureVisible(permissionsMap, featureNames, userRole);
    };
    
    // Add featurePermissions to res.locals for use in views
    res.locals.featurePermissions = permissionsMap;
    res.locals.modulePermissions = modulePermissions;
    
    // Add visible features for the current user
    res.locals.visibleFeatures = {};
    Object.entries(permissionsMap).forEach(([featureName, permission]) => {
      res.locals.visibleFeatures[featureName] = exports.isFeatureVisible(
        permissionsMap, 
        featureName, 
        req.user.role
      );
    });
    
    next();
  } catch (error) {
    console.error('Error fetching feature permissions:', error);
    // Continue without permissions if there's an error
    req.featurePermissions = {};
    req.modulePermissions = {};
    res.locals.featurePermissions = {};
    res.locals.modulePermissions = {};
    res.locals.visibleFeatures = {};
    res.locals.isFeatureVisible = () => false; // Default to false for safety
    res.locals.isAnyFeatureVisible = () => false; // Default to false for safety
    next();
  }
};

/**
 * Check if a feature is visible to a specific user role
 * @param {Object} permissionsMap - Map of feature permissions
 * @param {String} featureName - Name of the feature to check
 * @param {String} userRole - Role of the user
 * @returns {Boolean} - Whether the feature is visible to the user
 */
exports.isFeatureVisible = (permissionsMap, featureName, userRole) => {
  // If no user role is provided, default to not visible
  if (!userRole) return false;
  
  // Softadmin can see everything, regardless of permission settings
  if (userRole === 'softadmin') return true;
  
  // If no permissions map is available, default to not visible
  if (!permissionsMap) return false;
  
  // Get the permission for the feature
  const permission = permissionsMap[featureName];
  
  // If permission doesn't exist, default to not visible
  if (!permission) return false;
  
  // Check if the feature is visible and the user role is allowed
  return permission.isVisible && permission.roles.includes(userRole);
};

/**
 * Check if any of the specified features are visible to a user role
 * @param {Object} permissionsMap - Map of feature permissions
 * @param {Array} featureNames - Array of feature names to check
 * @param {String} userRole - Role of the user
 * @returns {Boolean} - Whether any of the features are visible to the user
 */
exports.isAnyFeatureVisible = (permissionsMap, featureNames, userRole) => {
  // If no feature names provided, return false
  if (!featureNames || !Array.isArray(featureNames) || featureNames.length === 0) {
    return false;
  }
  
  // Check if any of the features are visible
  return featureNames.some(featureName => 
    exports.isFeatureVisible(permissionsMap, featureName, userRole)
  );
};

/**
 * Middleware to check if the user can access a feature
 * @param {String} featureName - Name of the feature to check
 * @returns {Function} - Express middleware function
 */
exports.checkFeatureAccess = (featureName) => {
  return (req, res, next) => {
    // If no user, deny access
    if (!req.user) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You need to be logged in to access this feature.'
      });
    }
    
    // Softadmin always has access to all features
    if (req.user.role === 'softadmin') {
      return next();
    }
    
    // For all other roles, check if the feature is visible
    if (!req.featurePermissions) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this feature.'
      });
    }
    
    // Check if the feature is visible to the user
    const canAccess = exports.isFeatureVisible(
      req.featurePermissions,
      featureName,
      req.user.role
    );
    
    if (!canAccess) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: `You do not have permission to access ${featureName}.`
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if the user has access to any of the specified features
 * Useful for routes that could be accessed with different permissions
 * @param {Array} featureNames - Array of feature names to check
 * @returns {Function} - Express middleware function
 */
exports.checkAnyFeatureAccess = (featureNames) => {
  return (req, res, next) => {
    // If no user, deny access
    if (!req.user) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You need to be logged in to access this feature.'
      });
    }
    
    // Softadmin always has access to all features
    if (req.user.role === 'softadmin') {
      return next();
    }
    
    // For all other roles, check if at least one feature is accessible
    if (!req.featurePermissions) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this feature.'
      });
    }
    
    // Check if any feature is visible to the user
    const canAccessAny = exports.isAnyFeatureVisible(
      req.featurePermissions,
      featureNames,
      req.user.role
    );
    
    if (!canAccessAny) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access any of the required features.'
      });
    }
    
    next();
  };
};

/**
 * Get permissions by module name
 * @param {String} moduleName - Module name to filter by
 * @returns {Promise<Array>} - Array of permissions for the specified module
 */
exports.getPermissionsByModule = async (moduleName) => {
  try {
    const permissions = await FeaturePermission.findAll({
      where: { moduleName },
      order: [['featureName', 'ASC']]
    });
    
    return permissions;
  } catch (error) {
    console.error(`Error fetching permissions for module ${moduleName}:`, error);
    return [];
  }
};

/**
 * Search permissions by name
 * @param {String} searchTerm - Search term
 * @returns {Promise<Array>} - Array of permissions matching the search term
 */
exports.searchPermissions = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }
    
    const permissions = await FeaturePermission.findAll({
      where: {
        [Op.or]: [
          { moduleName: { [Op.like]: `%${searchTerm}%` } },
          { featureName: { [Op.like]: `%${searchTerm}%` } }
        ]
      },
      order: [['moduleName', 'ASC'], ['featureName', 'ASC']]
    });
    
    return permissions;
  } catch (error) {
    console.error(`Error searching permissions for "${searchTerm}":`, error);
    return [];
  }
};

module.exports = exports;