const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Get token from header

  if (!token) {
    return res.status(401).send('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    req.user = decoded; 

    // Check user role (you might need to fetch the role from the database)
    if (req.user.role === 'admin') {
      // Admin has full access
      next();
    } else if (req.user.role === 'manager') {
      // Manager has limited access
      if (req.method === 'DELETE') { 
        return res.status(403).send('Forbidden');
      }
      next();
    } else {
      // User has read-only access
      if (req.method !== 'GET') { 
        return res.status(403).send('Forbidden');
      }
      next();
    }
  } catch (error) {
    // ...
  }
};

module.exports = authMiddleware;