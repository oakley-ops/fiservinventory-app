const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  // Get the token from the authorization header
  const authHeader = req.headers.authorization;
  
  // Check if token exists and has correct format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided or invalid format.' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Set user info from token
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    
    // Try to get fresh user data from database
    try {
      const result = await pool.query(
        'SELECT id, username, role FROM users WHERE id = $1', 
        [decoded.id]
      );
      
      // If user exists in database, update user info
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      } else {
        // User not found in database
        return res.status(401).json({ error: 'Invalid token. User not found.' });
      }
    } catch (dbError) {
      // Database error - continue with token info only
      console.error('Database error in auth middleware:', dbError);
      // We already set basic user info from token, so we can continue
    }
    
    next();
  } catch (error) {
    // Handle different jwt errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = authMiddleware;