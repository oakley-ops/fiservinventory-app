/**
 * This is a compatibility module that re-exports the authMiddleware
 * for code that imports from '../middleware/auth'
 */

const authMiddleware = require('./authMiddleware');

// Export the authMiddleware function as authenticateToken for compatibility
module.exports = { 
  authenticateToken: authMiddleware
}; 