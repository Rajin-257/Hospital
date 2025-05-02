const FeaturePermission = require('../models/FeaturePermission');

/**
 * Middleware to fetch feature permissions for a given module
 * and attach them to the request object
 */
exports.getFeaturePermissions = async (req, res, next) => {
  try {
    // Fetch all permissions
    const permissions = await FeaturePermission.findAll({
      order: [['moduleName', 'ASC'], ['featureName', 'ASC']]
    });
    
    // Create a map of feature permissions
    const permissionsMap = {};
    permissions.forEach(permission => {
      permissionsMap[permission.featureName] = {
        isVisible: permission.isVisible,
        roles: permission.roles
      };
    });
    
    // Attach permissions to the request object
    req.featurePermissions = permissionsMap;
    
    // Add isFeatureVisible helper to res.locals for use in views
    res.locals.isFeatureVisible = (permissionsMap, featureName, userRole) => {
      // If no user role is provided, default to visible
      if (!userRole) return true;
      
      // Admin can see everything
      if (userRole === 'admin') return true;
      
      // If no permissions map is available, default to visible
      if (!permissionsMap) return true;
      
      // Get the permission for the feature
      const permission = permissionsMap[featureName];
      
      // If permission doesn't exist, default to visible
      if (!permission) return true;
      
      // Check if the feature is visible and the user role is allowed
      return permission.isVisible && permission.roles.includes(userRole);
    };
    
    // Add featurePermissions to res.locals for use in views
    res.locals.featurePermissions = permissionsMap;
    
    next();
  } catch (error) {
    console.error('Error fetching feature permissions:', error);
    // Continue without permissions if there's an error
    req.featurePermissions = {};
    res.locals.featurePermissions = {};
    res.locals.isFeatureVisible = () => true;
    next();
  }
};

/**
 * Check if a feature is visible to the current user
 */
exports.isFeatureVisible = (permissionsMap, featureName, userRole) => {
  // If no user role is provided, default to visible
  if (!userRole) return true;
  
  // Admin can see everything, regardless of permission settings
  if (userRole === 'admin') return true;
  
  // If no permissions map is available, default to visible
  if (!permissionsMap) return true;
  
  // Get the permission for the feature
  const permission = permissionsMap[featureName];
  
  // If permission doesn't exist, default to visible
  if (!permission) return true;
  
  // Check if the feature is visible and the user role is allowed
  return permission.isVisible && permission.roles.includes(userRole);
};

/**
 * Middleware to check if the user can access a feature
 */
exports.checkFeatureAccess = (featureName) => {
  return (req, res, next) => {
    // If no user, deny access
    if (!req.user) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this feature'
      });
    }
    
    // Admin always has access to all features
    if (req.user.role === 'admin') {
      return next();
    }
    
    // For non-admin roles, check if the feature is visible
    if (!req.featurePermissions) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this feature'
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
        message: 'You do not have permission to access this feature'
      });
    }
    
    next();
  };
}; 