/**
 * Role-based authorization middleware
 * Checks if the authenticated user has one of the allowed roles
 */

/**
 * Middleware to authorize access based on user roles
 * @param {Array<string>} allowedRoles - Array of roles that have access to the route
 * @returns {Function} Express middleware function
 */
const roleAuthorization = (allowedRoles) => {
  return (req, res, next) => {
    // If no user is attached to the request, deny access
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }

    // Get user role from request (set by authentication middleware)
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    // Check if user's role is in the allowed roles list (case insensitive)
    const hasPermission = allowedRoles.some(role => 
      role.toLowerCase() === userRole
    );

    if (hasPermission) {
      return next(); // User is authorized
    } else {
      // User is authenticated but not authorized for this resource
      return res.status(403).json({ 
        error: 'Forbidden. You do not have permission to access this resource.' 
      });
    }
  };
};

module.exports = roleAuthorization; 