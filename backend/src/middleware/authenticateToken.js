/**
 * This is a compatibility module that re-exports the authMiddleware
 * for code that uses the older name 'authenticateToken'
 */

const authMiddleware = require('./authMiddleware');

// Export the authMiddleware function
module.exports = { authenticateToken: authMiddleware }; 