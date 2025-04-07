const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AuthController = require('../../src/controllers/AuthController');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('bcrypt');
jest.mock('../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

const { pool } = require('../../src/config/db');

describe('Auth Controller Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request and response
    mockReq = {
      body: {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'tech'
      }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Setup bcrypt mock
    bcrypt.genSalt.mockResolvedValue('mocksalt');
    bcrypt.hash.mockResolvedValue('hashedpassword');
    bcrypt.compare.mockResolvedValue(true);
    
    // Setup jwt mock
    jwt.sign.mockReturnValue('mocktoken');
    jwt.verify.mockReturnValue({ id: 1, username: 'testuser', role: 'tech' });
  });

  describe('login', () => {
    test('should include role in JWT token and response', async () => {
      // Mock user query result
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        email: 'test@example.com',
        role: 'tech'
      };
      
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM users')) {
          return { rows: [mockUser] };
        }
        return { rows: [] };
      });
      
      await AuthController.login(mockReq, mockRes);
      
      // Verify JWT sign was called with role in payload
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role
        }),
        expect.any(String),
        { expiresIn: '24h' }
      );
      
      // Verify response includes user with role
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            role: mockUser.role
          }),
          token: 'mocktoken'
        })
      );
    });
    
    test('should reject login with invalid credentials', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      
      await AuthController.login(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
    
    test('should validate password', async () => {
      // Mock user query result
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          password: 'hashedpassword',
          email: 'test@example.com',
          role: 'tech'
        }]
      });
      
      // Password comparison fails
      bcrypt.compare.mockResolvedValueOnce(false);
      
      await AuthController.login(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('register', () => {
    test('should validate role during registration', async () => {
      mockReq.body.role = 'invalid_role';
      
      // Assume user does not exist
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      await AuthController.register(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: expect.stringContaining('Invalid role'),
          validRoles: ['admin', 'tech', 'purchasing'],
          providedRole: 'invalid_role'
        })
      );
    });
    
    test('should create user with valid role', async () => {
      // Assume user does not exist
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock successful user creation
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'tech'
        }]
      });
      
      await AuthController.register(mockReq, mockRes);
      
      // Should create token with role
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'tech'
        }),
        expect.any(String),
        { expiresIn: '24h' }
      );
      
      // Should return user with role
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            role: 'tech'
          })
        })
      );
    });
    
    test('should set default role when not provided', async () => {
      // Remove role from request
      delete mockReq.body.role;
      
      // Assume user does not exist
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock successful user creation with default role
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'tech' // Default role
        }]
      });
      
      await AuthController.register(mockReq, mockRes);
      
      // Check that role is tech (default)
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'tech'
        }),
        expect.any(String),
        { expiresIn: '24h' }
      );
    });
  });

  describe('verifyToken', () => {
    test('should return user with role information', async () => {
      // Setup headers with token
      mockReq.headers = {
        authorization: 'Bearer mocktoken'
      };
      
      // Mock user query result
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'tech'
        }]
      });
      
      await AuthController.verifyToken(mockReq, mockRes);
      
      // Should return user with role
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'tech'
        })
      );
    });
    
    test('should reject invalid token', async () => {
      // Setup headers with token
      mockReq.headers = {
        authorization: 'Bearer mocktoken'
      };
      
      // Mock JWT verification failure
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      await AuthController.verifyToken(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
}); 