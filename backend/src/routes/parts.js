const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../../middleware/auth');
const { executeWithRetry } = require('../../db');
const EventEmitter = require('events');

const inventoryEvents = new EventEmitter();
const clients = new Set();

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
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(csv)$/)) {
      return cb(new Error('Only CSV files are allowed!'), false);
    }
    cb(null, true);
  }
});

// SSE endpoint for real-time updates
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = res;
  clients.add(client);

  req.on('close', () => {
    clients.delete(client);
  });
});

// Helper function to notify clients of inventory changes
const notifyInventoryChange = () => {
  const data = JSON.stringify({ type: 'inventory_change', timestamp: new Date().toISOString() });
  clients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
};

// Get all parts with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 25;
    const offset = page * limit;
    const search = req.query.search || '';
    const partNumber = req.query.partNumber || '';
    const location = req.query.location || '';
    const minQuantity = req.query.minQuantity ? parseInt(req.query.minQuantity) : null;
    const maxQuantity = req.query.maxQuantity ? parseInt(req.query.maxQuantity) : null;

    // Build the WHERE clause based on filters
    const whereConditions = ['p.status = $1'];
    const queryParams = ['active'];
    let paramCount = 2;

    if (search) {
      whereConditions.push(`(
        p.name ILIKE $${paramCount} OR
        p.description ILIKE $${paramCount} OR
        p.manufacturer_part_number ILIKE $${paramCount} OR
        p.fiserv_part_number ILIKE $${paramCount} OR
        p.supplier ILIKE $${paramCount} OR
        pl.name ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (partNumber) {
      whereConditions.push(`(
        p.manufacturer_part_number ILIKE $${paramCount} OR
        p.fiserv_part_number ILIKE $${paramCount}
      )`);
      queryParams.push(`%${partNumber}%`);
      paramCount++;
    }

    if (location) {
      whereConditions.push(`pl.name ILIKE $${paramCount}`);
      queryParams.push(`%${location}%`);
      paramCount++;
    }

    if (minQuantity !== null) {
      whereConditions.push(`p.quantity >= $${paramCount}`);
      queryParams.push(minQuantity);
      paramCount++;
    }

    if (maxQuantity !== null) {
      whereConditions.push(`p.quantity <= $${paramCount}`);
      queryParams.push(maxQuantity);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count with filters
    const countQuery = `
      SELECT COUNT(*) as total
      FROM parts p
      LEFT JOIN part_locations pl ON p.location_id = pl.location_id
      ${whereClause}
    `;

    // Get total count
    const countResult = await executeWithRetry(
      countQuery,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    // Add pagination parameters
    queryParams.push(limit, offset);

    // Fetch paginated results
    const query = `
      SELECT 
        p.part_id, 
        p.name, 
        p.description, 
        p.manufacturer_part_number, 
        p.fiserv_part_number, 
        p.quantity::integer, 
        p.minimum_quantity::integer, 
        pl.name as location, 
        CAST(p.unit_cost AS NUMERIC) as unit_cost, 
        CAST(p.unit_cost AS NUMERIC) as cost, 
        p.supplier as manufacturer, 
        p.created_at as last_ordered_date, 
        p.updated_at,
        COALESCE(p.status, 'active') as status,
        p.notes
      FROM parts p
      LEFT JOIN part_locations pl ON p.location_id = pl.location_id
      ${whereClause}
      ORDER BY p.part_id DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    // Get paginated results
    const result = await executeWithRetry(
      query,
      queryParams
    );

    res.json({
      items: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// Get a specific part
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching part:', id);
    
    const result = await executeWithRetry(
      `SELECT 
        p.part_id,
        p.name,
        p.description,
        p.manufacturer_part_number,
        p.fiserv_part_number,
        p.quantity,
        p.minimum_quantity,
        p.supplier,
        p.unit_cost,
        p.created_at,
        pl.name as location,
        p.notes,
        p.status
       FROM parts p
       LEFT JOIN part_locations pl ON p.location_id = pl.location_id
       WHERE p.part_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log('Part not found:', id);
      return res.status(404).json({ error: 'Part not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

// Import parts from CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    // Process CSV file here
    res.json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error importing parts:', error);
    res.status(500).json({ error: 'Failed to import parts' });
  }
});

// Add a new part
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      manufacturer_part_number,
      fiserv_part_number,
      quantity,
      minimum_quantity,
      supplier,
      unit_cost,
      location,
      notes
    } = req.body;
    
    if (!name || !quantity || !minimum_quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Start transaction
    await executeWithRetry('BEGIN');
    
    // Get or create location
    let locationId = null;
    if (location) {
      const locationResult = await executeWithRetry(
        'SELECT location_id FROM part_locations WHERE name = $1',
        [location]
      );
      
      if (locationResult.rows.length > 0) {
        locationId = locationResult.rows[0].location_id;
      } else {
        const newLocationResult = await executeWithRetry(
          'INSERT INTO part_locations (name) VALUES ($1) RETURNING location_id',
          [location]
        );
        locationId = newLocationResult.rows[0].location_id;
      }
    }
    
    const result = await executeWithRetry(
      `INSERT INTO parts (
        name,
        description,
        manufacturer_part_number,
        fiserv_part_number,
        quantity,
        minimum_quantity,
        supplier,
        unit_cost,
        location_id,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name,
        description,
        manufacturer_part_number,
        fiserv_part_number,
        quantity,
        minimum_quantity,
        supplier,
        unit_cost,
        locationId,
        notes,
        'active'
      ]
    );
    
    await executeWithRetry('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await executeWithRetry('ROLLBACK');
    console.error('Error adding part:', error);
    res.status(500).json({ error: 'Failed to add part' });
  }
});

// Update a part
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Updating part ID:', id);
    console.log('Received update data:', req.body);
    
    const {
      name,
      description,
      manufacturer_part_number,
      fiserv_part_number,
      quantity,
      minimum_quantity,
      supplier,
      unit_cost,
      location,
      notes,
      status
    } = req.body;
    
    console.log('Extracted unit_cost:', unit_cost, 'Type:', typeof unit_cost);
    
    if (!name || !quantity || !minimum_quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Start transaction
    await executeWithRetry('BEGIN');
    
    // Get or create location
    let locationId = null;
    if (location) {
      const locationResult = await executeWithRetry(
        'SELECT location_id FROM part_locations WHERE name = $1',
        [location]
      );
      
      if (locationResult.rows.length > 0) {
        locationId = locationResult.rows[0].location_id;
      } else {
        const newLocationResult = await executeWithRetry(
          'INSERT INTO part_locations (name) VALUES ($1) RETURNING location_id',
          [location]
        );
        locationId = newLocationResult.rows[0].location_id;
      }
    }

    // Log the values being used in the update
    const updateValues = [
      name,
      description,
      manufacturer_part_number,
      fiserv_part_number,
      quantity,
      minimum_quantity,
      supplier,
      unit_cost,
      locationId,
      notes,
      status || 'active',
      id
    ];
    console.log('Update query values:', updateValues);
    
    const result = await executeWithRetry(
      `UPDATE parts SET
        name = $1,
        description = $2,
        manufacturer_part_number = $3,
        fiserv_part_number = $4,
        quantity = $5,
        minimum_quantity = $6,
        supplier = $7,
        unit_cost = $8,
        location_id = $9,
        notes = $10,
        status = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE part_id = $12
      RETURNING *`,
      updateValues
    );
    
    if (result.rows.length === 0) {
      await executeWithRetry('ROLLBACK');
      return res.status(404).json({ error: 'Part not found' });
    }
    
    await executeWithRetry('COMMIT');
    console.log('Updated part result:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    await executeWithRetry('ROLLBACK');
    console.error('Error updating part:', error);
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// Delete a part
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeWithRetry(
      'UPDATE parts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2 RETURNING *',
      ['inactive', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

// Get all parts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 25;
    const offset = page * limit;
    const search = req.query.search || '';
    const partNumber = req.query.partNumber || '';
    const location = req.query.location || '';
    const minQuantity = req.query.minQuantity ? parseInt(req.query.minQuantity) : null;
    const maxQuantity = req.query.maxQuantity ? parseInt(req.query.maxQuantity) : null;

    // Build the WHERE clause based on filters
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(
        p.name ILIKE $${paramCount} OR
        p.description ILIKE $${paramCount} OR
        p.manufacturer_part_number ILIKE $${paramCount} OR
        p.fiserv_part_number ILIKE $${paramCount} OR
        p.supplier ILIKE $${paramCount} OR
        pl.name ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (partNumber) {
      whereConditions.push(`(
        p.manufacturer_part_number ILIKE $${paramCount} OR
        p.fiserv_part_number ILIKE $${paramCount}
      )`);
      queryParams.push(`%${partNumber}%`);
      paramCount++;
    }

    if (location) {
      whereConditions.push(`pl.name ILIKE $${paramCount}`);
      queryParams.push(`%${location}%`);
      paramCount++;
    }

    if (minQuantity !== null) {
      whereConditions.push(`p.quantity >= $${paramCount}`);
      queryParams.push(minQuantity);
      paramCount++;
    }

    if (maxQuantity !== null) {
      whereConditions.push(`p.quantity <= $${paramCount}`);
      queryParams.push(maxQuantity);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countResult = await executeWithRetry(
      `SELECT COUNT(DISTINCT p.part_id)
       FROM parts p
       ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await executeWithRetry(
      `SELECT 
        p.part_id as id,
        p.name,
        p.description,
        p.manufacturer_part_number,
        p.fiserv_part_number,
        p.quantity,
        p.minimum_quantity,
        p.supplier as manufacturer,
        p.unit_cost as cost,
        p.created_at as last_ordered_date,
        COALESCE(p.location, '') as location,
        p.notes,
        COALESCE(p.status, 'active') as status
      FROM parts p
      ${whereClause}
      ORDER BY p.part_id DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );

    res.json({
      items: result.rows,
      total
    });
  } catch (err) {
    console.error('Error fetching parts:', err);
    throw err;
  }
});

// Create a new part
router.post('/', async (req, res) => {
  const {
    name,
    description,
    manufacturer_part_number,
    fiserv_part_number,
    quantity,
    minimum_quantity,
    manufacturer,
    unit_cost,
    location,
    notes
  } = req.body;

  try {
    console.log('Creating new part...');
    // Start a transaction
    await executeWithRetry('BEGIN');

    // First, get or create the location
    let locationId = null;
    if (location) {
      console.log('Checking if location exists:', location);
      const locationResult = await executeWithRetry(
        'SELECT location_id FROM part_locations WHERE name = $1',
        [location]
      );
      
      if (locationResult.rows.length > 0) {
        locationId = locationResult.rows[0].location_id;
        console.log('Location exists:', locationId);
      } else {
        console.log('Creating new location:', location);
        const newLocationResult = await executeWithRetry(
          'INSERT INTO part_locations (name) VALUES ($1) RETURNING location_id',
          [location]
        );
        locationId = newLocationResult.rows[0].location_id;
        console.log('Created new location:', locationId);
      }
    }

    // Then create the part
    console.log('Creating new part...');
    const result = await executeWithRetry(
      `INSERT INTO parts (
        name,
        description,
        manufacturer_part_number,
        fiserv_part_number,
        quantity,
        minimum_quantity,
        supplier,
        unit_cost,
        location_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name,
        description || null,
        manufacturer_part_number || null,
        fiserv_part_number,
        quantity,
        minimum_quantity,
        manufacturer || null,
        unit_cost,
        locationId,
        notes || null
      ]
    );

    await executeWithRetry('COMMIT');
    console.log('Created new part:', result.rows[0].part_id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await executeWithRetry('ROLLBACK');
    console.error('Error creating part:', err);
    throw err;
  }
});

// Bulk import parts
router.post('/bulk', async (req, res) => {
  const client = await executeWithRetry('BEGIN');
  try {
    console.log('Starting bulk import...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    if (!Array.isArray(req.body)) {
      console.error('Invalid request body - not an array:', typeof req.body);
      throw new Error('Request body must be an array of parts');
    }

    if (req.body.length === 0) {
      console.error('Empty request body');
      throw new Error('No parts data provided');
    }

    await executeWithRetry('BEGIN');
    const parts = req.body;
    const results = [];
    const errors = [];

    for (const part of parts) {
      try {
        console.log('Processing part:', JSON.stringify(part, null, 2));
        
        // Validate required fields
        if (!part.name || !part.fiserv_part_number) {
          const error = `Missing required fields for part: ${JSON.stringify(part)}`;
          console.error(error);
          errors.push(error);
          continue;
        }

        // Convert numeric fields and ensure they are valid
        let quantity = 0;
        let minimum_quantity = 1;
        let unit_cost = 0;

        try {
          quantity = parseInt(part.quantity);
          if (isNaN(quantity)) quantity = 0;
        } catch (e) {
          console.error('Error parsing quantity:', e);
          quantity = 0;
        }

        try {
          minimum_quantity = parseInt(part.minimum_quantity);
          if (isNaN(minimum_quantity)) minimum_quantity = 1;
        } catch (e) {
          console.error('Error parsing minimum_quantity:', e);
          minimum_quantity = 1;
        }

        try {
          unit_cost = parseFloat(part.cost);
          if (isNaN(unit_cost)) unit_cost = 0;
        } catch (e) {
          console.error('Error parsing unit_cost:', e);
          unit_cost = 0;
        }

        // First check if part exists
        console.log('Checking if part exists:', part.fiserv_part_number);
        const existingPart = await executeWithRetry(
          'SELECT part_id FROM parts WHERE fiserv_part_number = $1',
          [part.fiserv_part_number]
        );

        let result;
        if (existingPart.rows.length > 0) {
          console.log('Updating existing part:', part.fiserv_part_number);
          
          // Get or create location_id if location is provided
          let locationId = null;
          if (part.location) {
            // Check if location already exists
            const locationResult = await executeWithRetry(
              'SELECT location_id FROM part_locations WHERE name = $1',
              [part.location]
            );
            
            if (locationResult.rows.length > 0) {
              locationId = locationResult.rows[0].location_id;
            } else {
              // Create new location
              const newLocationResult = await executeWithRetry(
                'INSERT INTO part_locations (name) VALUES ($1) RETURNING location_id',
                [part.location]
              );
              locationId = newLocationResult.rows[0].location_id;
            }
          }
          
          // Update existing part
          const query = `
            UPDATE parts SET
              name = $1,
              description = COALESCE($2, description),
              supplier = COALESCE($3, supplier),
              manufacturer_part_number = COALESCE($4, manufacturer_part_number),
              quantity = $5,
              minimum_quantity = $6,
              location_id = COALESCE($7, location_id),
              unit_cost = $8,
              updated_at = CURRENT_TIMESTAMP
            WHERE fiserv_part_number = $9
            RETURNING *`;

          const values = [
            part.name,
            part.description || null,
            part.manufacturer || null,
            part.manufacturer_part_number || null,
            quantity,
            minimum_quantity,
            locationId,
            unit_cost,
            part.fiserv_part_number
          ];

          console.log('Executing UPDATE query with values:', JSON.stringify(values, null, 2));
          result = await executeWithRetry(query, values);
        } else {
          console.log('Inserting new part:', part.fiserv_part_number);
          
          // Get or create location_id if location is provided
          let locationId = null;
          if (part.location) {
            // Check if location already exists
            const locationResult = await executeWithRetry(
              'SELECT location_id FROM part_locations WHERE name = $1',
              [part.location]
            );
            
            if (locationResult.rows.length > 0) {
              locationId = locationResult.rows[0].location_id;
            } else {
              // Create new location
              const newLocationResult = await executeWithRetry(
                'INSERT INTO part_locations (name) VALUES ($1) RETURNING location_id',
                [part.location]
              );
              locationId = newLocationResult.rows[0].location_id;
            }
          }
          
          // Insert new part
          const query = `
            INSERT INTO parts (
              name,
              description,
              supplier,
              manufacturer_part_number,
              fiserv_part_number,
              quantity,
              minimum_quantity,
              location_id,
              unit_cost,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *`;

          const values = [
            part.name,
            part.description || null,
            part.manufacturer || null,
            part.manufacturer_part_number || null,
            part.fiserv_part_number,
            quantity,
            minimum_quantity,
            locationId,
            unit_cost
          ];

          console.log('Executing INSERT query with values:', JSON.stringify(values, null, 2));
          result = await executeWithRetry(query, values);
        }

        if (!result.rows[0]) {
          throw new Error(`Failed to ${existingPart.rows.length > 0 ? 'update' : 'insert'} part`);
        }

        console.log('Query result:', JSON.stringify(result.rows[0], null, 2));
        results.push(result.rows[0]);
      } catch (partError) {
        const errorMessage = `Error processing part ${part.fiserv_part_number || 'unknown'}: ${partError.message}`;
        console.error('Error details:', {
          message: partError.message,
          stack: partError.stack,
          error: partError,
          part: part
        });
        errors.push(errorMessage);
      }
    }

    if (errors.length > 0) {
      // If we have errors but also some successes, commit the successful ones
      if (results.length > 0) {
        console.log('Committing partial success');
        await executeWithRetry('COMMIT');
        throw new Error(`Partially successful import. ${results.length} parts imported, but encountered errors:\n${errors.join('\n')}`);
      } else {
        console.log('Rolling back - no successful imports');
        await executeWithRetry('ROLLBACK');
        throw new Error(`Failed to import parts:\n${errors.join('\n')}`);
      }
    }

    await executeWithRetry('COMMIT');
    console.log('Successfully imported parts:', results.length);
    res.json({
      message: `Successfully imported ${results.length} parts`,
      parts: results
    });
  } catch (err) {
    if (client.query) {
      await executeWithRetry('ROLLBACK').catch(rollbackErr => {
        console.error('Error during rollback:', rollbackErr);
      });
    }
    console.error('Error importing parts:', {
      message: err.message,
      stack: err.stack,
      error: err
    });
    throw err;
  }
});

// Record parts usage
router.post('/usage', async (req, res) => {
  const { part_id, machine_id, quantity, reason } = req.body;

  console.log('Recording parts usage:', { part_id, machine_id, quantity });

  if (!part_id || !machine_id || !quantity || quantity <= 0) {
    console.error('Invalid request:', { part_id, machine_id, quantity });
    throw new Error('Invalid request. Required fields: part_id, machine_id, quantity (> 0)');
  }

  try {
    await executeWithRetry('BEGIN');

    // Check if part exists and has enough quantity
    const partResult = await executeWithRetry(
      'SELECT quantity FROM parts WHERE part_id = $1',
      [part_id]
    );

    if (partResult.rows.length === 0) {
      throw new Error(`Part not found with ID: ${part_id}`);
    }

    const currentQuantity = partResult.rows[0].quantity;
    if (currentQuantity < quantity) {
      throw new Error(`Not enough parts in stock. Available: ${currentQuantity}, Requested: ${quantity}`);
    }

    // Update part quantity
    await executeWithRetry(
      'UPDATE parts SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2',
      [quantity, part_id]
    );

    // Record usage in transactions table
    const usageResult = await executeWithRetry(
      `INSERT INTO transactions (
        part_id,
        machine_id,
        quantity,
        type,
        notes,
        created_at
      ) VALUES ($1, $2, $3, 'usage', $4, CURRENT_TIMESTAMP)
      RETURNING *`,
      [part_id, machine_id, quantity, reason]
    );

    await executeWithRetry('COMMIT');
    console.log('Parts usage recorded successfully:', usageResult.rows[0]);
    
    // Notify clients of inventory change
    notifyInventoryChange();
    
    res.json({ message: 'Parts usage recorded successfully' });
  } catch (err) {
    await executeWithRetry('ROLLBACK');
    console.error('Error recording parts usage:', err);
    throw err;
  }
});

// Restock parts
router.post('/restock', async (req, res) => {
  const { part_id, quantity } = req.body;

  console.log('Restocking parts:', { part_id, quantity });

  if (!part_id || !quantity || quantity <= 0) {
    console.error('Invalid request:', { part_id, quantity });
    throw new Error('Invalid request. Required fields: part_id, quantity (> 0)');
  }

  try {
    await executeWithRetry('BEGIN');

    // Check if part exists
    const partResult = await executeWithRetry(
      'SELECT part_id FROM parts WHERE part_id = $1',
      [part_id]
    );

    if (partResult.rows.length === 0) {
      throw new Error(`Part not found with ID: ${part_id}`);
    }

    // Update part quantity
    await executeWithRetry(
      'UPDATE parts SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2',
      [quantity, part_id]
    );

    // Record restock in transactions table
    const restockResult = await executeWithRetry(
      `INSERT INTO transactions (
        part_id,
        quantity,
        type,
        notes,
        created_at
      ) VALUES ($1, $2, 'restock', 'Restock', CURRENT_TIMESTAMP)
      RETURNING *`,
      [part_id, quantity]
    );

    await executeWithRetry('COMMIT');
    console.log('Parts restocked successfully:', restockResult.rows[0]);
    
    // Notify clients of inventory change
    notifyInventoryChange();
    
    res.json({ message: 'Parts restocked successfully' });
  } catch (err) {
    await executeWithRetry('ROLLBACK');
    console.error('Error restocking parts:', err);
    throw err;
  }
});

// Get recent parts usage (last 24 hours)
router.get('/usage/recent', async (req, res) => {
  try {
    const result = await executeWithRetry(`
      SELECT 
        pu.usage_id,
        pu.part_id,
        p.name as part_name,
        pu.machine_id,
        m.name as machine_name,
        pu.quantity,
        pu.usage_date,
        pu.reason
      FROM parts_usage pu
      LEFT JOIN parts p ON pu.part_id = p.part_id
      LEFT JOIN machines m ON pu.machine_id = m.machine_id
      WHERE pu.usage_date >= NOW() - INTERVAL '24 HOURS'
      ORDER BY pu.usage_date DESC
    `);

    console.log('Recent parts usage:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recent parts usage:', err);
    throw err;
  }
});

// Get parts usage history
router.get('/usage/history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Fetching parts usage history with params:', { startDate, endDate });

    let query = `
      SELECT 
        t.transaction_id,
        t.part_id,
        p.name as part_name,
        p.fiserv_part_number,
        t.machine_id,
        m.name as machine_name,
        t.quantity,
        t.created_at as usage_date,
        t.notes as reason,
        COALESCE(p.unit_cost, 0) as unit_cost
      FROM transactions t
      LEFT JOIN parts p ON t.part_id = p.part_id
      LEFT JOIN machines m ON t.machine_id = m.machine_id
      WHERE t.type = 'usage'
    `;

    const queryParams = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND t.created_at >= $${paramCount++}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      query += ` AND t.created_at <= $${paramCount++}`;
      queryParams.push(endDate);
    }

    query += ' ORDER BY t.created_at DESC';

    console.log('Executing query:', { query, params: queryParams });
    const result = await executeWithRetry(query, queryParams);
    console.log('Query result:', { rowCount: result.rowCount });

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching parts usage history:', err);
    throw err;
  }
});

module.exports = router;