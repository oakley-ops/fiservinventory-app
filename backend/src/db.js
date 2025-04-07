require('dotenv').config();
const { Pool } = require('pg');

// Set DATABASE_URL for test environment if not already set
if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:1234@localhost:5432/fiservinventory_test';
}

// Log database configuration
console.log(`Database configuration: {    
  hasConnectionString: ${Boolean(process.env.DATABASE_URL)},
  nodeEnv: ${process.env.NODE_ENV},
  ssl: ${process.env.DB_SSL || 'disabled'},
  max: ${process.env.DB_POOL_MAX || 20},
  idleTimeoutMillis: ${process.env.DB_IDLE_TIMEOUT || 30000},  
  connectionTimeoutMillis: ${process.env.DB_CONNECTION_TIMEOUT || 2000}
}`);

// Exit if DATABASE_URL is not set - except in test environment
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Database configuration with optimized pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'enabled' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10)
});

// For test environment, we'll create a mock pool
const testPool = process.env.NODE_ENV === 'test' ? (() => {
  // Create a mock pool for testing
  const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  return {
    query: mockQuery,
    end: jest.fn().mockResolvedValue(true),
    on: jest.fn()
  };
})() : null;

// Export the pool, or the test pool if in test mode
module.exports = process.env.NODE_ENV === 'test' ? testPool : pool; 