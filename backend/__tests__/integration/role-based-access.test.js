const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the database to avoid actual DB connections
jest.mock('../../db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }
}));

// Import the pool to configure mocks
const { pool } = require('../../db');

// Import the app after mocking
const app = require('../../src/app');

describe('Role-Based Access Control Integration Tests', () => {
  // Test tokens for different roles
  const tokens = {
    admin: jwt.sign(
      { id: 1, username: 'admin_user', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    ),
    tech: jwt.sign(
      { id: 2, username: 'tech_user', role: 'tech' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    ),
    purchasing: jwt.sign(
      { id: 3, username: 'purchasing_user', role: 'purchasing' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up database mocks for different endpoints
    pool.query.mockImplementation((query) => {
      // For user verification in auth middleware
      if (query.includes('SELECT id, username, role FROM users')) {
        const userId = parseInt(query.match(/id = (\d+)/)[1], 10);
        
        if (userId === 1) {
          return { rows: [{ id: 1, username: 'admin_user', role: 'admin' }] };
        } else if (userId === 2) {
          return { rows: [{ id: 2, username: 'tech_user', role: 'tech' }] };
        } else if (userId === 3) {
          return { rows: [{ id: 3, username: 'purchasing_user', role: 'purchasing' }] };
        }
      }
      
      // For parts endpoints
      if (query.includes('SELECT * FROM parts')) {
        return { rows: [{ part_id: 1, name: 'Test Part', quantity: 10 }] };
      }
      
      // For purchase orders endpoints
      if (query.includes('SELECT * FROM purchase_orders')) {
        return { rows: [{ po_id: 1, po_number: 'PO-123', status: 'pending' }] };
      }
      
      // For machines endpoints
      if (query.includes('SELECT * FROM machines')) {
        return { rows: [{ machine_id: 1, name: 'Test Machine', model: 'Test Model' }] };
      }
      
      // For suppliers endpoints
      if (query.includes('SELECT * FROM suppliers')) {
        return { rows: [{ supplier_id: 1, name: 'Test Supplier', contact_name: 'Contact Person' }] };
      }
      
      // For users endpoints
      if (query.includes('SELECT * FROM users')) {
        return { rows: [{ id: 1, username: 'admin_user', role: 'admin' }] };
      }
      
      // Default empty response
      return { rows: [] };
    });
  });
  
  describe('Parts API Access Control', () => {
    test('admin role should have full access to parts endpoints', async () => {
      // GET /api/parts - List parts
      const getResponse = await request(app)
        .get('/api/parts')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/parts - Create part
      const postResponse = await request(app)
        .post('/api/parts')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ name: 'New Part', quantity: 5 });
      expect(postResponse.status).not.toBe(403); // Not forbidden
      
      // DELETE /api/parts/1 - Delete part
      const deleteResponse = await request(app)
        .delete('/api/parts/1')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(deleteResponse.status).not.toBe(403); // Not forbidden
    });
    
    test('tech role should have limited access to parts endpoints', async () => {
      // GET /api/parts - List parts (allowed)
      const getResponse = await request(app)
        .get('/api/parts')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/parts - Create part (not allowed)
      const postResponse = await request(app)
        .post('/api/parts')
        .set('Authorization', `Bearer ${tokens.tech}`)
        .send({ name: 'New Part', quantity: 5 });
      expect(postResponse.status).toBe(403); // Forbidden
      
      // DELETE /api/parts/1 - Delete part (not allowed)
      const deleteResponse = await request(app)
        .delete('/api/parts/1')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(deleteResponse.status).toBe(403); // Forbidden
    });
  });
  
  describe('Purchase Orders API Access Control', () => {
    test('admin role should have full access to purchase order endpoints', async () => {
      // GET /api/purchase-orders - List POs
      const getResponse = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/purchase-orders - Create PO
      const postResponse = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ supplier_id: 1, items: [] });
      expect(postResponse.status).not.toBe(403); // Not forbidden
    });
    
    test('purchasing role should have access to purchase order endpoints', async () => {
      // GET /api/purchase-orders - List POs (allowed)
      const getResponse = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${tokens.purchasing}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/purchase-orders - Create PO (allowed)
      const postResponse = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${tokens.purchasing}`)
        .send({ supplier_id: 1, items: [] });
      expect(postResponse.status).not.toBe(403); // Not forbidden
    });
    
    test('tech role should not have access to purchase order endpoints', async () => {
      // GET /api/purchase-orders - List POs (not allowed)
      const getResponse = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(getResponse.status).toBe(403); // Forbidden
      
      // POST /api/purchase-orders - Create PO (not allowed)
      const postResponse = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${tokens.tech}`)
        .send({ supplier_id: 1, items: [] });
      expect(postResponse.status).toBe(403); // Forbidden
    });
  });
  
  describe('Transactions API Access Control', () => {
    test('admin role should have access to transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(response.status).not.toBe(403); // Not forbidden
    });
    
    test('purchasing role should have access to transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${tokens.purchasing}`);
      expect(response.status).not.toBe(403); // Not forbidden
    });
    
    test('tech role should not have access to transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(response.status).toBe(403); // Forbidden
    });
  });
  
  describe('Parts Checkout Access Control', () => {
    test('admin role should have access to parts checkout', async () => {
      const response = await request(app)
        .post('/api/parts/checkout')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ part_id: 1, quantity: 1, notes: 'Test checkout' });
      expect(response.status).not.toBe(403); // Not forbidden
    });
    
    test('tech role should have access to parts checkout', async () => {
      const response = await request(app)
        .post('/api/parts/checkout')
        .set('Authorization', `Bearer ${tokens.tech}`)
        .send({ part_id: 1, quantity: 1, notes: 'Test checkout' });
      expect(response.status).not.toBe(403); // Not forbidden
    });
    
    test('purchasing role should not have access to parts checkout', async () => {
      const response = await request(app)
        .post('/api/parts/checkout')
        .set('Authorization', `Bearer ${tokens.purchasing}`)
        .send({ part_id: 1, quantity: 1, notes: 'Test checkout' });
      expect(response.status).toBe(403); // Forbidden
    });
  });

  describe('Machines API Access Control', () => {
    test('admin role should have full access to machine endpoints', async () => {
      // GET /api/machines - List machines
      const getResponse = await request(app)
        .get('/api/machines')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/machines - Create machine
      const postResponse = await request(app)
        .post('/api/machines')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ name: 'New Machine', model: 'New Model' });
      expect(postResponse.status).not.toBe(403); // Not forbidden
      
      // PUT /api/machines/1 - Update machine
      const putResponse = await request(app)
        .put('/api/machines/1')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ name: 'Updated Machine' });
      expect(putResponse.status).not.toBe(403); // Not forbidden
      
      // DELETE /api/machines/1 - Delete machine
      const deleteResponse = await request(app)
        .delete('/api/machines/1')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(deleteResponse.status).not.toBe(403); // Not forbidden
    });
    
    test('tech role should have view-only access to machine endpoints', async () => {
      // GET /api/machines - List machines (allowed)
      const getResponse = await request(app)
        .get('/api/machines')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/machines - Create machine (not allowed)
      const postResponse = await request(app)
        .post('/api/machines')
        .set('Authorization', `Bearer ${tokens.tech}`)
        .send({ name: 'New Machine', model: 'New Model' });
      expect(postResponse.status).toBe(403); // Forbidden
      
      // DELETE /api/machines/1 - Delete machine (not allowed)
      const deleteResponse = await request(app)
        .delete('/api/machines/1')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(deleteResponse.status).toBe(403); // Forbidden
    });
  });
  
  describe('Suppliers API Access Control', () => {
    test('admin role should have full access to supplier endpoints', async () => {
      // GET /api/suppliers - List suppliers
      const getResponse = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/suppliers - Create supplier
      const postResponse = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ name: 'New Supplier', contact_name: 'Contact Person' });
      expect(postResponse.status).not.toBe(403); // Not forbidden
      
      // PUT /api/suppliers/1 - Update supplier
      const putResponse = await request(app)
        .put('/api/suppliers/1')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ name: 'Updated Supplier' });
      expect(putResponse.status).not.toBe(403); // Not forbidden
      
      // DELETE /api/suppliers/1 - Delete supplier
      const deleteResponse = await request(app)
        .delete('/api/suppliers/1')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(deleteResponse.status).not.toBe(403); // Not forbidden
    });
    
    test('purchasing role should have access to supplier endpoints', async () => {
      // GET /api/suppliers - List suppliers (allowed)
      const getResponse = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${tokens.purchasing}`);
      expect(getResponse.status).toBe(200);
      
      // POST /api/suppliers - Create supplier (allowed)
      const postResponse = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${tokens.purchasing}`)
        .send({ name: 'New Supplier', contact_name: 'Contact Person' });
      expect(postResponse.status).not.toBe(403); // Not forbidden
    });
    
    test('tech role should not have access to supplier management endpoints', async () => {
      // POST /api/suppliers - Create supplier (not allowed)
      const postResponse = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${tokens.tech}`)
        .send({ name: 'New Supplier', contact_name: 'Contact Person' });
      expect(postResponse.status).toBe(403); // Forbidden
      
      // DELETE /api/suppliers/1 - Delete supplier (not allowed)
      const deleteResponse = await request(app)
        .delete('/api/suppliers/1')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(deleteResponse.status).toBe(403); // Forbidden
    });
  });
  
  describe('Reports API Access Control', () => {
    test('admin role should have access to report endpoints', async () => {
      // GET /api/reports/low-stock - Low stock report
      const response = await request(app)
        .get('/api/reports/low-stock')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(response.status).not.toBe(403); // Not forbidden
    });
    
    test('purchasing role should have access to report endpoints', async () => {
      // GET /api/reports/low-stock - Low stock report
      const response = await request(app)
        .get('/api/reports/low-stock')
        .set('Authorization', `Bearer ${tokens.purchasing}`);
      expect(response.status).not.toBe(403); // Not forbidden
    });
    
    test('tech role should not have access to report endpoints', async () => {
      // GET /api/reports/low-stock - Low stock report
      const response = await request(app)
        .get('/api/reports/low-stock')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(response.status).toBe(403); // Forbidden
    });
  });
  
  describe('User Management API Access Control', () => {
    test('admin role should have full access to user management endpoints', async () => {
      // GET /api/users/all - List all users
      const getAllResponse = await request(app)
        .get('/api/users/all')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(getAllResponse.status).not.toBe(403); // Not forbidden
      
      // POST /api/users/register - Register a new user
      const registerResponse = await request(app)
        .post('/api/users/register')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ username: 'new_user', password: 'password123', role: 'tech' });
      expect(registerResponse.status).not.toBe(403); // Not forbidden
      
      // PUT /api/users/1 - Update user
      const updateResponse = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ role: 'tech' });
      expect(updateResponse.status).not.toBe(403); // Not forbidden
      
      // DELETE /api/users/1 - Delete user
      const deleteResponse = await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(deleteResponse.status).not.toBe(403); // Not forbidden
    });
    
    test('non-admin roles should not have access to user management endpoints', async () => {
      // GET /api/users/all - List all users
      const techGetAllResponse = await request(app)
        .get('/api/users/all')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(techGetAllResponse.status).toBe(403); // Forbidden
      
      const purchasingGetAllResponse = await request(app)
        .get('/api/users/all')
        .set('Authorization', `Bearer ${tokens.purchasing}`);
      expect(purchasingGetAllResponse.status).toBe(403); // Forbidden
      
      // POST /api/users/register - Register a new user
      const techRegisterResponse = await request(app)
        .post('/api/users/register')
        .set('Authorization', `Bearer ${tokens.tech}`)
        .send({ username: 'new_user', password: 'password123', role: 'tech' });
      expect(techRegisterResponse.status).toBe(403); // Forbidden
    });
    
    test('all authenticated users should have access to their own profile', async () => {
      // GET /api/users/profile - Get own profile
      const adminProfileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(adminProfileResponse.status).not.toBe(403); // Not forbidden
      
      const techProfileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokens.tech}`);
      expect(techProfileResponse.status).not.toBe(403); // Not forbidden
      
      const purchasingProfileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokens.purchasing}`);
      expect(purchasingProfileResponse.status).not.toBe(403); // Not forbidden
    });
  });
}); 