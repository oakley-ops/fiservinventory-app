const { Pool } = require('pg');
const { logger } = require('./middleware/logger');

// Database configuration with optimized pooling
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fiservinventory',
  password: process.env.DB_PASSWORD || '1234',
  port: process.env.DB_PORT || 5432,
  // Connection pool configuration
  max: process.env.DB_POOL_MAX || 20, // Maximum number of clients
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : false
});

// Pool error handling
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err.message,
    stack: err.stack
  });
});

// Pool connect handling
pool.on('connect', (client) => {
  logger.info('New client connected to the pool', {
    processID: client.processID,
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// Pool acquire handling
pool.on('acquire', (client) => {
  logger.debug('Client checked out from pool', {
    processID: client.processID,
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// Pool remove handling
pool.on('remove', (client) => {
  logger.info('Client removed from pool', {
    processID: client.processID,
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// Helper function to get a client with timeout
const getClientWithTimeout = async (timeout = 2000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, timeout);
  });

  try {
    const client = await Promise.race([pool.connect(), timeoutPromise]);
    return client;
  } catch (error) {
    logger.error('Error getting database client', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Helper function to execute a query with retry logic
const executeWithRetry = async (queryText, params, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    const client = await getClientWithTimeout();
    
    try {
      const result = await client.query(queryText, params);
      client.release();
      return result;
    } catch (error) {
      client.release();
      lastError = error;
      
      // Only retry on connection-related errors
      if (!error.code.startsWith('08') && !error.code.startsWith('57')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
  
  throw lastError;
};

// Helper function to execute a transaction
const executeTransaction = async (queries) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Health check function
const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount
      }
    };
  } catch (error) {
    logger.error('Database health check failed', {
      error: error.message
    });
    
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  pool,
  getClientWithTimeout,
  executeWithRetry,
  executeTransaction,
  checkDatabaseHealth
}; 