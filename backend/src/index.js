const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const partRoutes = require('./routes/parts');
const machineRoutes = require('./routes/machines');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const { createServer } = require("http");
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

// Initialize controllers
console.log('Initializing controllers...');
const AuthController = require('./controllers/AuthController');
const authController = new AuthController();

// Database configuration
const dbConfig = require('../config/database')[process.env.NODE_ENV || 'development'];
const pool = new Pool(dbConfig);

// Test database connection
pool.connect()
  .then(() => {
    console.log('Successfully connected to the database');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });


// Debug middleware to log CORS headers
app.use((req, res, next) => {
  console.log('Incoming request from origin:', req.headers.origin);
  next();
});

// CORS configuration - must be first

const allowedOrigins = [
  'https://fteinventory.netlify.app',
  'http://localhost:3000',  // Frontend development port
  'http://localhost:3001'   // Backend development port
];

app.use(cors({
  origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
          const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
          return callback(new Error(msg), false);
      }
      return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// app.use(cors({
//   origin: 'https://fteinventory.netlify.app',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// Single express.json middleware
app.use(express.json());



// Debug logging middleware
app.use((req, res, next) => {
  console.log('\n=== Incoming Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Original URL:', req.originalUrl);
  console.log('Base URL:', req.baseUrl);
  console.log('Path:', req.path);
  console.log('Query params:', req.query);
  
  // Safely log the body
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    console.log('Body:', sanitizedBody);
  }
  
  next();
});

// API routes
console.log('Setting up routes...');

// Initialize auth routes
console.log('Setting up auth routes...');
const createAuthRouter = require('./routes/auth');
const authRouter = createAuthRouter(authController);

app.use('/api/v1/auth', authRouter);
console.log('Auth routes registered at /api/v1/auth');

app.use('/api/parts', partRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not Found' } });
});

// Update the WebSocket configuration
const io = new Server(httpServer, { 
  cors: {
    origin: 'https://fteinventory.netlify.app',
    methods: ['GET', 'POST'],
    credentials: true
  }
});


io.on("connection", (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// CREATE a new part

app.post(
  '/api/v1/parts',
  body('name').notEmpty().withMessage('Name is required'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  // Add more validations as needed
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      quantity,
      manufacturer_part_number,
      fiserv_part_number,
      machine_id,
      supplier,
      image,
    } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO parts (name, description, quantity, manufacturer_part_number, fiserv_part_number, machine_id, supplier, image) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          name,
          description,
          quantity,
          manufacturer_part_number,
          fiserv_part_number,
          machine_id,
          supplier,
          image,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('\n=== Error ===');
      console.error('Timestamp:', new Date().toISOString());
      console.error('Error:', error);
      console.error('Request URL:', req.url);
      console.error('Request method:', req.method);
      console.error('Request body:', req.body);
      console.error('=============\n');

      console.error(error);
      res.status(500).send('Error creating part');
    }
  }
);

// UPDATE a part
app.put(
  '/api/v1/parts/:id',
  body('quantity').isInt().withMessage('Quantity must be an integer'), 
  // Add more validations as needed
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const partId = parseInt(req.params.id);
    const {
      name,
      description,
      quantity,
      manufacturer_part_number,
      fiserv_part_number,
      machine_id,
      supplier,
      image,
    } = req.body;

    try {
      const result = await pool.query(
        `UPDATE parts 
         SET name = $1, description = $2, quantity = $3, manufacturer_part_number = $4, fiserv_part_number = $5, machine_id = $6, supplier = $7, image = $8 
         WHERE part_id = $9 RETURNING *`,
        [
          name,
          description,
          quantity,
          manufacturer_part_number,
          fiserv_part_number,
          machine_id,
          supplier,
          image,
          partId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).send('Part not found');
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('\n=== Error ===');
      console.error('Timestamp:', new Date().toISOString());
      console.error('Error:', error);
      console.error('Request URL:', req.url);
      console.error('Request method:', req.method);
      console.error('Request body:', req.body);
      console.error('=============\n');

      console.error(error);
      res.status(500).send('Error updating part');
    }
  }
);

// DELETE a part
app.delete('/api/v1/parts/:id', async (req, res) => {
  const partId = parseInt(req.params.id);

  try {
    const result = await pool.query(
      'DELETE FROM parts WHERE part_id = $1 RETURNING *',
      [partId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Part not found');
    }

    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    console.error('\n=== Error ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', error);
    console.error('Request URL:', req.url);
    console.error('Request method:', req.method);
    console.error('Request body:', req.body);
    console.error('=============\n');

    console.error(error);
    res.status(500).send('Error deleting part');
  }
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

// Start server
httpServer.listen(port, '0.0.0.0', () => {
  console.log('\n=== Server Started ===');
  console.log(`Server is running on port ${port}`);
  console.log(`Local URL: http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('===================\n');
});

module.exports = app;