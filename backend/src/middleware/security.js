const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const productionMiddleware = (app) => {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  // Create access log stream
  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
  );

  // Basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.yourdomain.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
  
  // Prevent parameter pollution
  app.use(hpp());
  
  // Prevent XSS attacks
  app.use(xss());
  
  // Logging
  if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined', { stream: accessLogStream }));
  } else {
    app.use(morgan('dev'));
  }
  
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    });
  });
};

module.exports = productionMiddleware;
