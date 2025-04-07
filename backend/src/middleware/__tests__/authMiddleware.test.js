const jwt = require('jsonwebtoken');
const authMiddleware = require('../authMiddleware');

// Mock the database pool
jest.mock('../../db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Authentication Middleware', () => {
  let req;
  let res;
  let next;
  const mockUser = {
    id: 1,
    username: 'testuser',
    role: 'tech'
  };

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer valid-token'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should return 401 if no token is provided', async () => {
    req.headers.authorization = undefined;
    
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided or invalid format.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token format is invalid', async () => {
    req.headers.authorization = 'InvalidFormat';
    
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided or invalid format.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle invalid token', async () => {
    // Mock jwt.verify to throw an error
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle expired token', async () => {
    // Mock jwt.verify to throw TokenExpiredError
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      throw error;
    });
    
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired. Please login again.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should set user info when database is not available', async () => {
    // Mock jwt.verify to return decoded token
    jest.spyOn(jwt, 'verify').mockReturnValue({
      id: mockUser.id,
      username: mockUser.username,
      role: mockUser.role
    });
    
    // Mock pool.query to throw error (simulating database unavailability)
    const { pool } = require('../../db');
    pool.query.mockRejectedValue(new Error('Database error'));
    
    await authMiddleware(req, res, next);
    
    expect(req.user).toEqual({
      id: mockUser.id,
      username: mockUser.username,
      role: mockUser.role
    });
    expect(next).toHaveBeenCalled();
  });

  it('should set user info from database when available', async () => {
    // Mock jwt.verify to return decoded token
    jest.spyOn(jwt, 'verify').mockReturnValue({
      id: mockUser.id,
      username: mockUser.username,
      role: mockUser.role
    });
    
    // Mock pool.query to return user data
    const { pool } = require('../../db');
    pool.query.mockResolvedValue({
      rows: [mockUser]
    });
    
    await authMiddleware(req, res, next);
    
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if user not found in database', async () => {
    // Mock jwt.verify to return decoded token
    jest.spyOn(jwt, 'verify').mockReturnValue({
      id: mockUser.id,
      username: mockUser.username,
      role: mockUser.role
    });
    
    // Mock pool.query to return empty result
    const { pool } = require('../../db');
    pool.query.mockResolvedValue({
      rows: []
    });
    
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token. User not found.' });
    expect(next).not.toHaveBeenCalled();
  });
}); 