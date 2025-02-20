const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

// Create Redis client if Redis URL is provided
const redisClient = process.env.REDIS_URL
  ? createClient({ url: process.env.REDIS_URL })
  : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.connect().catch(console.error);
}

// Store provider based on environment
const store = redisClient
  ? new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    })
  : undefined; // Falls back to memory store

// Rate limiting for login attempts
const authLimiter = rateLimit({
  store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development'
});

// General rate limiting for other routes
const generalLimiter = rateLimit({
  store,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development'
});

// File upload limiter
const uploadLimiter = rateLimit({
  store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Upload limit reached. Please try again later.',
    retryAfter: '1 hour'
  },
  skip: (req) => process.env.NODE_ENV === 'development'
});

module.exports = {
  authLimiter,
  generalLimiter,
  uploadLimiter
}; 