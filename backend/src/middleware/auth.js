const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader);
    
    if (!authHeader) {
      console.log('No auth header provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid token format:', authHeader);
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token:', token.substring(0, 20) + '...');
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', { userId: decoded.userId, role: decoded.role });
    
    req.user = decoded;

    // Define allowed paths for guests
    const guestAllowedPaths = [
      '/api/v1/parts',
      '/api/v1/machines',
      '/api/v1/parts-usage',
      '/api/v1/assign-part'
    ];

    // Allow access if:
    // 1. It's a GET request (read-only)
    // 2. User is not a guest
    // 3. User is a guest but the path is in the allowed list
    if (
      req.method === 'GET' || 
      req.user.role !== 'guest' ||
      (req.user.role === 'guest' && guestAllowedPaths.some(path => req.path.startsWith(path)))
    ) {
      console.log('Access granted for:', req.method, req.path);
      next();
    } else {
      console.log('Access denied for guest:', req.method, req.path);
      res.status(403).json({ error: 'Access denied for guest users' });
    }
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    console.log('Admin access denied for role:', req.user.role);
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log('Admin access granted for:', req.method, req.path);
  next();
};

const writeAccessMiddleware = (req, res, next) => {
  if (req.user.role === 'guest') {
    console.log('Write access denied for guest:', req.method, req.path);
    return res.status(403).json({ error: 'Write access denied for guest users' });
  }
  console.log('Write access granted for role:', req.user.role);
  next();
};

module.exports = { authMiddleware, adminMiddleware, writeAccessMiddleware };
