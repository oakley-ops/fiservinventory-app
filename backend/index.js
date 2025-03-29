require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('express-async-handler');
const morgan = require('morgan');
const partsRouter = require('./src/routes/parts');
const machinesRouter = require('./src/routes/machines');
const dashboardRouter = require('./src/routes/dashboard');
const authRouter = require('./src/routes/auth');
const testRouter = require('./src/routes/test');
const vendorRoutes = require('./src/routes/vendorRoutes');
const purchaseOrderRoutes = require('./src/routes/purchaseOrderRoutes');
const emailRoutes = require('./src/routes/emailRoutes');
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./src/database/db');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000
});

// Enable trust proxy before any middleware
app.set('trust proxy', true);

const port = process.env.PORT || 4000;

// Request logging
app.use(morgan('dev'));

// Apply CORS middleware before other route handlers
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(csv)$/)) {
      return cb(new Error('Only CSV files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Pass io instance to controllers
const PartsUsageController = require('./src/controllers/PartsUsageController');
const partsUsageController = new PartsUsageController(io);

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/parts', partsRouter);
app.use('/api/v1/machines', machinesRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/test', testRouter);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/email', emailRoutes);

// Use the controller with io instance
app.post('/api/v1/parts/usage', (req, res) => partsUsageController.recordUsage(req, res));

// Direct test route for email
app.post('/api/test-email', (req, res) => {
  console.log('Received email test request:', req.body);
  try {
    const emailService = require('./src/services/emailService');
    // Send a simple test email
    if (req.body.recipient) {
      emailService.sendEmail(
        'Test Email from Fiserv Inventory System', 
        '<h3>Test Email</h3><p>This is a test email from the Fiserv Inventory System.</p>', 
        req.body.recipient
      )
        .then(info => {
          console.log('Test email sent successfully:', info);
          res.status(200).json({ success: true, message: 'Test email sent successfully', info });
        })
        .catch(error => {
          console.error('Failed to send test email:', error);
          res.status(500).json({ error: 'Failed to send test email', details: error.message });
        });
    } else {
      res.status(400).json({ error: 'Missing recipient' });
    }
  } catch (error) {
    console.error('Error in test email route:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Handle static files and React app routing
if (process.env.NODE_ENV === 'production') {
  // Production: Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
} else {
  // Development: API-only, frontend served separately
  app.get('*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });
}

// Setup socket.io event listeners
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make socket.io available globally
global.io = io;

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Test URL: http://localhost:${port}/api/v1/test/email`);
  console.log(`Socket.io URL: http://localhost:${port}/socket.io`);
  console.log('Environment:', process.env.NODE_ENV);
});