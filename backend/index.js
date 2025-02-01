require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const asyncHandler = require('express-async-handler');
const MachineController = require('./src/controllers/MachineController');
const PartsUsageController = require('./src/controllers/PartsUsageController');
const AuthController = require('./src/controllers/AuthController');
const { authMiddleware, adminMiddleware } = require('./src/middleware/auth');

const app = express();
const port = process.env.PORT || 3001;

// Debug logging for all requests
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query
  });
  next();
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add route logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Add response type middleware
app.use((req, res, next) => {
  const oldJson = res.json;
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json');
    return oldJson.call(this, data);
  };
  next();
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed.'));
    }
  }
});

// Initialize machine controller
const machineController = new MachineController();
const partsUsageController = new PartsUsageController();
const authController = new AuthController();

// Create initial admin user
authController.createInitialAdmin();

// Auth routes - these should be before any middleware
app.post('/api/v1/auth/login', (req, res) => authController.login(req, res));
app.post('/api/v1/auth/guest-login', (req, res) => authController.guestLogin(req, res));
app.post('/api/v1/auth/register', authMiddleware, adminMiddleware, (req, res) => authController.register(req, res));
app.post('/api/v1/auth/change-password', authMiddleware, (req, res) => authController.changePassword(req, res));

// Protected routes that require authentication
app.use('/api/v1/machines', authMiddleware);
app.use('/api/v1/parts-usage', authMiddleware);

// Machine routes
app.get('/api/v1/machines', asyncHandler(async (req, res) => {
  console.log('GET /api/v1/machines called');
  await machineController.getAllMachines(req, res);
}));

app.get('/api/v1/machines/:id', asyncHandler(async (req, res) => {
  console.log('GET /api/v1/machines/:id called with id:', req.params.id);
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: 'Missing machine ID' });
    }
    await machineController.getMachine(req, res);
  } catch (error) {
    console.error('Error in GET /api/v1/machines/:id:', error);
    res.status(500).json({
      error: 'Failed to fetch machine',
      details: error.message
    });
  }
}));

app.put('/api/v1/machines/:id', asyncHandler(async (req, res) => {
  console.log('PUT /api/v1/machines/:id called with id:', req.params.id, 'body:', req.body);
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: 'Missing machine ID' });
    }
    await machineController.updateMachine(req, res);
  } catch (error) {
    console.error('Error in PUT /api/v1/machines/:id:', error);
    res.status(500).json({
      error: 'Failed to update machine',
      details: error.message
    });
  }
}));

app.post('/api/v1/machines', asyncHandler(async (req, res) => {
  console.log('POST /api/v1/machines called with body:', req.body);
  await machineController.createMachine(req, res);
}));

app.delete('/api/v1/machines/:id', asyncHandler(async (req, res) => {
  console.log('DELETE /api/v1/machines/:id called with id:', req.params.id);
  await machineController.deleteMachine(req, res);
}));

// CSV Upload endpoint
app.post('/api/v1/parts/upload', upload.single('file'), asyncHandler(async (req, res) => {
  console.log('Upload request received');
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  console.log('File received:', req.file);

  const results = [];
  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  // Parse CSV file
  try {
    const parseCSV = new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(parser)
        .on('data', (data) => {
          console.log('Parsed row:', data);
          results.push(data);
        })
        .on('end', () => resolve(results))
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        });
    });

    const parsedData = await parseCSV;
    console.log('Parsed data:', parsedData);

    // Begin transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of parsedData) {
        const query = `
          INSERT INTO parts (
            name, description, manufacturer_part_number, fiserv_part_number,
            quantity, minimum_quantity, machine_id, supplier, unit_cost, location
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        const values = [
          row.name,
          row.description,
          row.manufacturer_part_number,
          row.fiserv_part_number,
          parseInt(row.quantity) || 0,
          parseInt(row.minimum_quantity) || 0,
          parseInt(row.machine_id) || null,
          row.supplier,
          parseFloat(row.unit_cost) || 0,
          row.location
        ];

        console.log('Inserting row:', values);
        await client.query(query, values);
      }

      await client.query('COMMIT');
      console.log('Transaction committed');
      
      res.json({ 
        message: 'CSV uploaded successfully', 
        partsAdded: parsedData.length 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error:', error);
      throw error;
    } finally {
      client.release();
      // Clean up uploaded file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ 
      message: 'Error processing CSV file',
      error: error.message 
    });
  }
}));

// Parts search route
app.get('/api/v1/parts/search', asyncHandler(async (req, res) => {
  const searchTerm = req.query.q || '';
  const result = await db.query(
    'SELECT * FROM parts WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY name',
    [`%${searchTerm}%`]
  );
  res.json(result.rows);
}));

// Parts usage and assignment routes
app.post('/api/v1/parts-usage', asyncHandler(async (req, res) => {
  const { partId, machineId, quantity, action } = req.body;
  const userId = req.user ? req.user.userId : null;
  const timestamp = new Date();

  // Start a transaction
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Record the usage
    await client.query(
      'INSERT INTO parts_usage (part_id, machine_id, quantity, action, user_id, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [partId, machineId, quantity, action, userId, timestamp]
    );

    // Update the part quantity
    if (action === 'remove') {
      await client.query(
        'UPDATE parts SET quantity = quantity - $1 WHERE part_id = $2',
        [quantity, partId]
      );
    } else if (action === 'add') {
      await client.query(
        'UPDATE parts SET quantity = quantity + $1 WHERE part_id = $2',
        [quantity, partId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Parts usage recorded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Assign part to machine route
app.post('/api/v1/assign-part', asyncHandler(async (req, res) => {
  const { partId, machineId, quantity } = req.body;
  const userId = req.user ? req.user.userId : null;
  const timestamp = new Date();

  // Start a transaction
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check if part exists and has enough quantity
    const partResult = await client.query(
      'SELECT quantity FROM parts WHERE part_id = $1',
      [partId]
    );

    if (partResult.rows.length === 0) {
      throw new Error('Part not found');
    }

    if (partResult.rows[0].quantity < quantity) {
      throw new Error('Insufficient quantity available');
    }

    // Record the assignment
    await client.query(
      'INSERT INTO parts_usage (part_id, machine_id, quantity, action, user_id, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [partId, machineId, quantity, 'assign', userId, timestamp]
    );

    // Update the part quantity
    await client.query(
      'UPDATE parts SET quantity = quantity - $1 WHERE part_id = $2',
      [quantity, partId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Part assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'Part not found' || error.message === 'Insufficient quantity available') {
      res.status(400).json({ error: error.message });
    } else {
      throw error;
    }
  } finally {
    client.release();
  }
}));

// Parts Usage routes
app.get('/api/v1/parts-usage', asyncHandler(async (req, res) => {
  console.log('GET /api/v1/parts-usage called');
  await partsUsageController.getUsageHistory(req, res);
}));

app.get('/api/v1/parts-usage/export', asyncHandler(async (req, res) => {
  console.log('GET /api/v1/parts-usage/export called');
  await partsUsageController.exportToExcel(req, res);
}));

// Parts routes
app.get('/api/v1/parts', asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM parts ORDER BY name');
  res.json(result.rows);
}));

app.get('/api/v1/parts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await db.query('SELECT * FROM parts WHERE part_id = $1', [id]);
  
  if (result.rows.length === 0) {
    res.status(404).json({ message: 'Part not found' });
    return;
  }
  
  res.json(result.rows[0]);
}));

app.get('/api/v1/reports/low-stock', asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 10;
  const result = await db.query(
    'SELECT * FROM parts WHERE quantity < $1 ORDER BY quantity ASC',
    [threshold]
  );
  res.json(result.rows);
}));

app.post('/api/v1/parts', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    console.log('Received part data:', req.body);
    
    const {
      name,
      description,
      manufacturer_part_number,
      fiserv_part_number,
      quantity,
      minimum_quantity,
      machine_id,
      supplier,
      unit_cost,
      location,
      image_url
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Ensure numeric fields are numbers or null
    const numericQuantity = quantity ? parseInt(quantity) : 0;
    const numericMinQuantity = minimum_quantity ? parseInt(minimum_quantity) : 0;
    const numericMachineId = machine_id ? parseInt(machine_id) : null;
    const numericUnitCost = unit_cost ? parseFloat(unit_cost) : 0;

    console.log('Processed values:', {
      numericQuantity,
      numericMinQuantity,
      numericMachineId,
      numericUnitCost
    });

    const result = await db.query(
      `INSERT INTO parts (
        name, description, manufacturer_part_number, fiserv_part_number,
        quantity, minimum_quantity, machine_id, supplier, unit_cost,
        location, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name,
        description || '',
        manufacturer_part_number || '',
        fiserv_part_number || '',
        numericQuantity,
        numericMinQuantity,
        numericMachineId,
        supplier || '',
        numericUnitCost,
        location || '',
        image_url || null
      ]
    );

    console.log('Insert successful, returning:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding part:', error);
    res.status(500).json({
      error: 'Failed to add part',
      details: error.message,
      hint: error.hint,
      code: error.code
    });
  }
}));

app.put('/api/v1/parts/:id', adminMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    manufacturer_part_number,
    fiserv_part_number,
    quantity,
    minimum_quantity,
    machine_id,
    supplier,
    unit_cost,
    location,
    image_url
  } = req.body;

  const result = await db.query(
    `UPDATE parts SET
      name = $1, description = $2, manufacturer_part_number = $3,
      fiserv_part_number = $4, quantity = $5, minimum_quantity = $6,
      machine_id = $7, supplier = $8, unit_cost = $9, location = $10,
      image_url = $11
    WHERE part_id = $12
    RETURNING *`,
    [
      name, description, manufacturer_part_number, fiserv_part_number,
      quantity, minimum_quantity, machine_id, supplier, unit_cost,
      location, image_url, id
    ]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ message: 'Part not found' });
    return;
  }

  res.json(result.rows[0]);
}));

app.delete('/api/v1/parts/:id', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Attempting to delete part with ID:', id);

    // First check if the part exists
    const checkResult = await db.query(
      'SELECT * FROM parts WHERE part_id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      console.log('Part not found with ID:', id);
      return res.status(404).json({ error: 'Part not found' });
    }

    // Delete the part
    const result = await db.query(
      'DELETE FROM parts WHERE part_id = $1 RETURNING *',
      [id]
    );

    console.log('Successfully deleted part:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({
      error: 'Failed to delete part',
      details: error.message,
      hint: error.hint,
      code: error.code
    });
  }
}));

app.get('/api/v1/machines/:machineId/parts', asyncHandler(async (req, res) => {
  const { machineId } = req.params;
  const result = await db.query(
    'SELECT * FROM parts WHERE machine_id = $1 ORDER BY name',
    [machineId]
  );
  res.json(result.rows);
}));

app.post('/api/v1/machines/:machineId/parts/:partId', asyncHandler(async (req, res) => {
  const { machineId, partId } = req.params;
  const { quantity } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check if machine exists
    const machineResult = await client.query(
      'SELECT * FROM machines WHERE machine_id = $1',
      [machineId]
    );
    if (machineResult.rows.length === 0) {
      throw new Error('Machine not found');
    }

    // Check if part exists and has enough quantity
    const partResult = await client.query(
      'SELECT * FROM parts WHERE part_id = $1',
      [partId]
    );
    if (partResult.rows.length === 0) {
      throw new Error('Part not found');
    }

    const part = partResult.rows[0];
    if (part.quantity < quantity) {
      throw new Error('Insufficient quantity available');
    }

    // Update part's quantity
    await client.query(
      'UPDATE parts SET quantity = quantity - $1 WHERE part_id = $2',
      [quantity, partId]
    );

    // Check if assignment already exists
    const existingAssignment = await client.query(
      'SELECT * FROM part_assignments WHERE machine_id = $1 AND part_id = $2',
      [machineId, partId]
    );

    if (existingAssignment.rows.length > 0) {
      // Update existing assignment
      await client.query(
        `UPDATE part_assignments 
         SET quantity = quantity + $1, assignment_date = CURRENT_TIMESTAMP 
         WHERE machine_id = $2 AND part_id = $3`,
        [quantity, machineId, partId]
      );
    } else {
      // Create new assignment
      await client.query(
        `INSERT INTO part_assignments (
          machine_id, part_id, quantity, assignment_date
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [machineId, partId, quantity]
      );
    }

    // Record in parts_usage table
    await client.query(
      `INSERT INTO parts_usage (
        part_id, machine_id, quantity, usage_date
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [partId, machineId, quantity]
    );

    await client.query('COMMIT');
    res.json({ message: 'Part assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning part:', error);
    res.status(500).json({ 
      error: 'Error assigning part',
      details: error.message 
    });
  } finally {
    client.release();
  }
}));

app.delete('/api/v1/machines/:machineId/parts/:partId', asyncHandler(async (req, res) => {
  const { machineId, partId } = req.params;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get current assignment
    const assignmentResult = await client.query(
      'SELECT * FROM part_assignments WHERE machine_id = $1 AND part_id = $2',
      [machineId, partId]
    );
    
    if (assignmentResult.rows.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentResult.rows[0];

    // Return quantity to parts inventory
    await client.query(
      'UPDATE parts SET machine_id = NULL, quantity = quantity + $1 WHERE part_id = $2',
      [assignment.quantity, partId]
    );

    // Remove assignment record
    await client.query(
      'DELETE FROM part_assignments WHERE machine_id = $1 AND part_id = $2',
      [machineId, partId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Part removed from machine successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Get part by barcode
app.get('/api/v1/parts/barcode/:barcode', asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  
  try {
    console.log('Looking up part by barcode:', barcode);
    const result = await db.query(
      'SELECT * FROM parts WHERE barcode = $1',
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'No part found with this barcode'
      });
    }

    console.log('Found part:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error looking up part by barcode:', error);
    res.status(500).json({
      message: 'Failed to look up part',
      error: error.message
    });
  }
}));

// Parts Usage Routes
app.post('/api/v1/parts-usage', partsUsageController.recordUsage);
app.get('/api/v1/parts-usage/export', partsUsageController.exportToExcel);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Access the API from other devices using your computer\'s IP address');
});
