const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'test' ? '*' : process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
  // Don't retry connection in test mode
  reconnection: process.env.NODE_ENV !== 'test',
  reconnectionAttempts: process.env.NODE_ENV === 'test' ? 0 : 5,
  timeout: process.env.NODE_ENV === 'test' ? 500 : 10000,
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// In test mode, suppress Socket.IO connection errors
if (process.env.NODE_ENV === 'test') {
  io.engine.on('connection_error', (err) => {
    console.log('Socket.IO connection error suppressed in test mode');
  });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // Increase payload limit for PDF handling
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Skip logging in test environment
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Import routes
const partsRouter = require('./routes/parts');
const usersRouter = require('./routes/users');
const testRouter = require('./routes/test');
const vendorRoutes = require('./routes/vendorRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const emailRoutes = require('./routes/emailRoutes');

// Routes
app.use('/api/v1/parts', partsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/test', testRouter);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/email', emailRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Handle production
if (process.env.NODE_ENV === 'production') {
  // Static folder
  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  // Handle SPA
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend/build', 'index.html'));
  });
}

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} else {
  // In test mode, start on a different port
  const TEST_PORT = process.env.TEST_PORT || 5001;
  server.listen(TEST_PORT, () => {
    console.log(`Test server is running on port ${TEST_PORT}`);
  });
}

module.exports = { app, server, io }; 