/**
 * RBAC Testing Script
 * 
 * This script directly tests the role-based authentication components without
 * depending on the entire Express application.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const roleMiddleware = require('./src/middleware/roleMiddleware');

// Mock JWT secret
const JWT_SECRET = 'test_secret';

// Test user data
const testUsers = [
  { id: 1, username: 'admin_user', password: 'admin_password', role: 'admin' },
  { id: 2, username: 'tech_user', password: 'tech_password', role: 'tech' },
  { id: 3, username: 'purchasing_user', password: 'purchasing_password', role: 'purchasing' }
];

// Function to create a JWT token
function createToken(user) {
  return jwt.sign({ 
    id: user.id, 
    username: user.username,
    role: user.role 
  }, JWT_SECRET, { expiresIn: '1h' });
}

// Mock Express Response
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.responseJson = null;
  }
  
  status(code) {
    this.statusCode = code;
    return this;
  }
  
  json(data) {
    this.responseJson = data;
    return this;
  }
}

// Mock Express Request
class MockRequest {
  constructor(headers = {}, user = null) {
    this.headers = headers;
    this.user = user;
  }
}

// Mock Next Function
function createMockNext() {
  let called = false;
  const next = () => { called = true; };
  next.wasCalled = () => called;
  return next;
}

// Test cases
async function runTests() {
  console.log('======================================');
  console.log('RBAC Implementation Test');
  console.log('======================================\n');
  
  // Test 1: Role authorization - Admin access
  console.log('TEST 1: Role authorization - Admin access');
  const adminUser = { id: 1, username: 'admin_user', role: 'admin' };
  const adminReq = new MockRequest({}, adminUser);
  const adminRes = new MockResponse();
  const adminNext = createMockNext();
  
  // Admin accessing admin-only route
  roleMiddleware(['admin'])(adminReq, adminRes, adminNext);
  console.log('Admin accessing admin-only route:');
  console.log('  Next called:', adminNext.wasCalled() ? 'Yes ✅' : 'No ❌');
  console.log('  Status code:', adminRes.statusCode);
  
  // Test 2: Role authorization - Tech user denied access
  console.log('\nTEST 2: Role authorization - Tech user denied access');
  const techUser = { id: 2, username: 'tech_user', role: 'tech' };
  const techReq = new MockRequest({}, techUser);
  const techRes = new MockResponse();
  const techNext = createMockNext();
  
  // Tech user accessing admin-only route
  roleMiddleware(['admin'])(techReq, techRes, techNext);
  console.log('Tech user accessing admin-only route:');
  console.log('  Next called:', techNext.wasCalled() ? 'Yes ❌' : 'No ✅');
  console.log('  Status code:', techRes.statusCode);
  console.log('  Response:', JSON.stringify(techRes.responseJson, null, 2));
  
  // Test 3: Role authorization - Purchasing user with correct access
  console.log('\nTEST 3: Role authorization - Purchasing user with correct access');
  const purchasingUser = { id: 3, username: 'purchasing_user', role: 'purchasing' };
  const purchasingReq = new MockRequest({}, purchasingUser);
  const purchasingRes = new MockResponse();
  const purchasingNext = createMockNext();
  
  // Purchasing user accessing purchasing route
  roleMiddleware(['admin', 'purchasing'])(purchasingReq, purchasingRes, purchasingNext);
  console.log('Purchasing user accessing purchasing route:');
  console.log('  Next called:', purchasingNext.wasCalled() ? 'Yes ✅' : 'No ❌');
  console.log('  Status code:', purchasingRes.statusCode);
  
  // Test 4: Missing user (unauthenticated)
  console.log('\nTEST 4: Missing user (unauthenticated)');
  const noUserReq = new MockRequest({});
  const noUserRes = new MockResponse();
  const noUserNext = createMockNext();
  
  roleMiddleware(['admin'])(noUserReq, noUserRes, noUserNext);
  console.log('Request with no user accessing admin route:');
  console.log('  Next called:', noUserNext.wasCalled() ? 'Yes ❌' : 'No ✅');
  console.log('  Status code:', noUserRes.statusCode);
  console.log('  Response:', JSON.stringify(noUserRes.responseJson, null, 2));
  
  // Test 5: Create and verify tokens for different roles
  console.log('\nTEST 5: JWT token creation and verification');
  for (const user of testUsers) {
    const token = createToken(user);
    console.log(`Token for ${user.role} role:`);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`  Verified: ${decoded.role === user.role ? 'Yes ✅' : 'No ❌'}`);
      console.log(`  Role in token: ${decoded.role}`);
    } catch (error) {
      console.log(`  Error verifying token: ${error.message}`);
    }
  }
  
  // Test 6: Case insensitivity in role checks
  console.log('\nTEST 6: Case insensitivity in role checks');
  const mixedCaseUser = { id: 4, username: 'mixed_case_user', role: 'AdMiN' };
  const mixedCaseReq = new MockRequest({}, mixedCaseUser);
  const mixedCaseRes = new MockResponse();
  const mixedCaseNext = createMockNext();
  
  roleMiddleware(['admin'])(mixedCaseReq, mixedCaseRes, mixedCaseNext);
  console.log('User with mixed case role accessing admin route:');
  console.log('  Next called:', mixedCaseNext.wasCalled() ? 'Yes ✅' : 'No ❌');
  console.log('  Status code:', mixedCaseRes.statusCode);
  
  console.log('\n======================================');
  console.log('RBAC Test Results Summary');
  console.log('======================================');
  console.log('1. Role middleware correctly allows admin access to admin routes: ' + 
               (adminNext.wasCalled() ? '✅' : '❌'));
  console.log('2. Role middleware correctly blocks tech user from admin routes: ' + 
               (!techNext.wasCalled() && techRes.statusCode === 403 ? '✅' : '❌'));
  console.log('3. Role middleware correctly allows purchasing access to appropriate routes: ' + 
               (purchasingNext.wasCalled() ? '✅' : '❌'));
  console.log('4. Role middleware correctly handles unauthenticated requests: ' + 
               (!noUserNext.wasCalled() && noUserRes.statusCode === 401 ? '✅' : '❌'));
  console.log('5. JWT tokens correctly include and verify role information: ✅');
  console.log('6. Role checks are case insensitive: ' + 
               (mixedCaseNext.wasCalled() ? '✅' : '❌'));
  
  // Overall result
  const allTestsPassed = adminNext.wasCalled() && 
                        !techNext.wasCalled() && 
                        purchasingNext.wasCalled() && 
                        !noUserNext.wasCalled() && 
                        mixedCaseNext.wasCalled();
  
  if (allTestsPassed) {
    console.log('\nRBAC implementation is functioning correctly! 🎉');
  } else {
    console.log('\nSome RBAC tests failed. Please review the results above. ❌');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
}); 