const express = require('express');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');
const partRoutes = require('./routes/parts'); 
const cors = require('cors');
const machineRoutes = require('./routes/machines');
const transactionRoutes = require('./routes/transactions');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger'); 
const { createServer } = require("http");
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/machines', machineRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/parts', partRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const io = new Server(httpServer, { 
  cors: {
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST"]
  }
});

// WebSocket connection handling
io.on("connection", (socket) => {
    console.log('A user connected');
  
    // Example: Emit a low stock notification
    const emitLowStockNotification = (part) => {
      if (part.quantity <= 10) { // Example threshold
        socket.emit('notification', {
          message: `Part "${part.name}" is low in stock!`,
          type: 'warning',
        });
      }
    };
  
    // Listen for events from the frontend (if needed)
    socket.on('something', (data) => {
      // ... handle the event
    });
  
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
    console.error(error);
    res.status(500).send('Error deleting part');
  }
});

httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });