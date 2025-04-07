const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../app');
const pool = require('../../db');

// Test JWT tokens
let adminToken;
let techToken;
let purchasingToken;

// Mock API responses
jest.mock('../../db', () => {
  const mockQuery = jest.fn();
  
  // Default success response for parts endpoint
  mockQuery.mockImplementation((text, params) => {
    if (text.includes('SELECT * FROM parts')) {
      return Promise.resolve({ rows: [{ id: 1, name: 'Test Part', quantity: 10 }] });
    }
    if (text.includes('INSERT INTO parts')) {
      return Promise.resolve({ rows: [{ id: 1 }] });
    }
    if (text.includes('SELECT * FROM purchase_orders')) {
      return Promise.resolve({ rows: [{ id: 1, status: 'pending', supplier: 'Test Supplier' }] });
    }
    if (text.includes('INSERT INTO purchase_orders')) {
      return Promise.resolve({ rows: [{ id: 1 }] });
    }
    if (text.includes('SELECT * FROM users')) {
      return Promise.resolve({ rows: [{ id: 1, username: 'admin_test', role: 'admin' }] });
    }
    if (text.includes('INSERT INTO users')) {
      return Promise.resolve({ rows: [{ id: 1 }] });
    }
    if (text.includes('SELECT * FROM transactions')) {
      return Promise.resolve({ rows: [{ id: 1, part_id: 1, quantity: 5, type: 'add' }] });
    }
    
    return Promise.resolve({ rows: [] });
  });
  
  return {
    query: mockQuery,
    connect: jest.fn().mockResolvedValue({}),
    end: jest.fn().mockResolvedValue({}),
  };
});

describe('Role-Based Access Control Integration Tests', () => {
  beforeAll(() => {
    // Create JWTs for different user roles
    adminToken = jwt.sign(
      { userId: 1, username: 'admin_test', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    techToken = jwt.sign(
      { userId: 2, username: 'tech_test', role: 'tech' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    purchasingToken = jwt.sign(
      { userId: 3, username: 'purchasing_test', role: 'purchasing' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  // Parts Management Endpoints
  describe('Parts Management', () => {
    test('Admin can access all parts endpoints', async () => {
      await request(app)
        .get('/api/parts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .post('/api/parts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Part', quantity: 10 })
        .expect(201);
    });

    test('Tech can view but not modify parts', async () => {
      await request(app)
        .get('/api/parts')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(200);

      await request(app)
        .post('/api/parts')
        .set('Authorization', `Bearer ${techToken}`)
        .send({ name: 'Test Part', quantity: 10 })
        .expect(403);
    });

    test('Purchasing cannot access parts', async () => {
      await request(app)
        .get('/api/parts')
        .set('Authorization', `Bearer ${purchasingToken}`)
        .expect(403);
    });
  });

  // Purchase Orders Endpoints
  describe('Purchase Orders', () => {
    test('Admin can access all purchase order endpoints', async () => {
      await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ supplier: 'Test Supplier', items: [] })
        .expect(201);
    });

    test('Purchasing can manage purchase orders', async () => {
      await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${purchasingToken}`)
        .expect(200);

      await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${purchasingToken}`)
        .send({ supplier: 'Test Supplier', items: [] })
        .expect(201);
    });

    test('Tech cannot access purchase orders', async () => {
      await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(403);
    });
  });

  // User Management Endpoints
  describe('User Management', () => {
    test('Admin can create users', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'newuser', password: 'password', role: 'tech' })
        .expect(201);
    });

    test('Tech cannot create users', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${techToken}`)
        .send({ username: 'newuser', password: 'password', role: 'tech' })
        .expect(403);
    });

    test('Purchasing cannot create users', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${purchasingToken}`)
        .send({ username: 'newuser', password: 'password', role: 'tech' })
        .expect(403);
    });
  });

  // Transaction History Endpoints
  describe('Transaction History', () => {
    test('Admin can view transactions', async () => {
      await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    test('Purchasing can view transactions', async () => {
      await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${purchasingToken}`)
        .expect(200);
    });

    test('Tech cannot view transactions', async () => {
      await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(403);
    });
  });

  // Error Handling
  describe('Error Handling', () => {
    test('should handle invalid tokens', async () => {
      await request(app)
        .get('/api/parts')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('should handle expired tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 1, username: 'admin', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      );

      await request(app)
        .get('/api/parts')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    test('should handle missing authorization header', async () => {
      await request(app)
        .get('/api/parts')
        .expect(401);
    });
  });
}); 