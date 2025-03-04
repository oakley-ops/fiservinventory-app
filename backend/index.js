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
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

// Enable trust proxy before any middleware
app.set('trust proxy', true);

const port = process.env.PORT || 3001;

// Request logging
app.use(morgan('combined'));

// Enable CORS before routes
app.use(cors({
  origin: [
    'https://fiserv-inventory-frontend.netlify.app',
    'https://fteinventory.netlify.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Use the controller with io instance
app.post('/api/v1/parts/usage', (req, res) => partsUsageController.recordUsage(req, res));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: err.code,
      detail: err.detail
    }
  });

  // Send detailed error in development, generic in production
  if (process.env.NODE_ENV === 'development') {
    res.status(err.status || 500).json({ 
      error: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail || 'No additional details available'
    });
  } else {
    res.status(err.status || 500).json({ 
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Local URL: http://localhost:${port}`);
  console.log('Environment:', process.env.NODE_ENV);
});
