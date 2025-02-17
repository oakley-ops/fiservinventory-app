const express = require('express');
const router = express.Router();
const pool = require('../../db');
const asyncHandler = require('express-async-handler');
const EventEmitter = require('events');

const inventoryEvents = new EventEmitter();
const clients = new Set();

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
router.get('/', asyncHandler(async (req, res) => {
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
        p.location ILIKE $${paramCount}
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
      whereConditions.push(`p.location ILIKE $${paramCount}`);
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
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT p.part_id)
       FROM parts p
       ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await pool.query(
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
        p.location,
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
}));

// Create a new part
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    manufacturer_part_number,
    fiserv_part_number,
    quantity,
    minimum_quantity,
    manufacturer,
    cost,
    location,
    notes
  } = req.body;

  try {
    console.log('Creating new part...');
    // Start a transaction
    await pool.query('BEGIN');

    // First, get or create the location
    let locationId = null;
    if (location) {
      console.log('Checking if location exists:', location);
      const locationResult = await pool.query(
        'SELECT location_id FROM part_locations WHERE name = $1',
        [location]
      );
      
      if (locationResult.rows.length > 0) {
        locationId = locationResult.rows[0].location_id;
        console.log('Location exists:', locationId);
      } else {
        console.log('Creating new location:', location);
        const newLocationResult = await pool.query(
          'INSERT INTO part_locations (name) VALUES ($1) RETURNING location_id',
          [location]
        );
        locationId = newLocationResult.rows[0].location_id;
        console.log('Created new location:', locationId);
      }
    }

    // Then create the part
    console.log('Creating new part...');
    const result = await pool.query(
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
        cost,
        locationId,
        notes || null
      ]
    );

    await pool.query('COMMIT');
    console.log('Created new part:', result.rows[0].part_id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error creating part:', err);
    throw err;
  }
}));

// Bulk import parts
router.post('/bulk', asyncHandler(async (req, res) => {
  const client = await pool.connect();
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

    await client.query('BEGIN');
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
        const existingPart = await client.query(
          'SELECT part_id FROM parts WHERE fiserv_part_number = $1',
          [part.fiserv_part_number]
        );

        let result;
        if (existingPart.rows.length > 0) {
          console.log('Updating existing part:', part.fiserv_part_number);
          // Update existing part
          const query = `
            UPDATE parts SET
              name = $1,
              description = COALESCE($2, description),
              supplier = COALESCE($3, supplier),
              manufacturer_part_number = COALESCE($4, manufacturer_part_number),
              quantity = $5,
              minimum_quantity = $6,
              location = COALESCE($7, location),
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
            part.location || null,
            unit_cost,
            part.fiserv_part_number
          ];

          console.log('Executing UPDATE query with values:', JSON.stringify(values, null, 2));
          result = await client.query(query, values);
        } else {
          console.log('Inserting new part:', part.fiserv_part_number);
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
              location,
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
            part.location || null,
            unit_cost
          ];

          console.log('Executing INSERT query with values:', JSON.stringify(values, null, 2));
          result = await client.query(query, values);
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
        await client.query('COMMIT');
        throw new Error(`Partially successful import. ${results.length} parts imported, but encountered errors:\n${errors.join('\n')}`);
      } else {
        console.log('Rolling back - no successful imports');
        await client.query('ROLLBACK');
        throw new Error(`Failed to import parts:\n${errors.join('\n')}`);
      }
    }

    await client.query('COMMIT');
    console.log('Successfully imported parts:', results.length);
    res.json({
      message: `Successfully imported ${results.length} parts`,
      parts: results
    });
  } catch (err) {
    if (client.query) {
      await client.query('ROLLBACK').catch(rollbackErr => {
        console.error('Error during rollback:', rollbackErr);
      });
    }
    console.error('Error importing parts:', {
      message: err.message,
      stack: err.stack,
      error: err
    });
    throw err;
  } finally {
    if (client.release) {
      client.release(true); // Force release the client
    }
  }
}));

// Get a specific part
router.get('/:id', asyncHandler(async (req, res) => {
  const partId = parseInt(req.params.id);
  try {
    console.log('Fetching part:', partId);
    const result = await pool.query(
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
        p.location,
        p.notes,
        p.status
      FROM parts p
      WHERE p.part_id = $1`,
      [partId]
    );
    
    if (result.rows.length === 0) {
      console.log('Part not found:', partId);
      res.status(404).json({ error: 'Part not found' });
    } else {
      console.log('Fetched part:', result.rows[0].part_id);
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error fetching part:', err);
    throw err;
  }
}));

// Update a part
router.put('/:id', asyncHandler(async (req, res) => {
  const partId = parseInt(req.params.id);
  const {
    name,
    description,
    manufacturer_part_number,
    fiserv_part_number,
    quantity,
    minimum_quantity,
    manufacturer,
    cost,
    location,
    notes,
    status
  } = req.body;

  try {
    console.log('Updating part:', partId, req.body);
    // Start a transaction
    await pool.query('BEGIN');

    // First, get or create the location
    let locationId = null;
    if (location) {
      console.log('Checking if location exists:', location);
      const locationResult = await pool.query(
        'SELECT location_id FROM part_locations WHERE name = $1',
        [location]
      );
      
      if (locationResult.rows.length > 0) {
        locationId = locationResult.rows[0].location_id;
        console.log('Location exists:', locationId);
      } else {
        console.log('Creating new location:', location);
        const newLocationResult = await pool.query(
          'INSERT INTO part_locations (name) VALUES ($1) RETURNING location_id',
          [location]
        );
        locationId = newLocationResult.rows[0].location_id;
        console.log('Created new location:', locationId);
      }
    }

    const result = await pool.query(
      `UPDATE parts SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        manufacturer_part_number = COALESCE($3, manufacturer_part_number),
        fiserv_part_number = COALESCE($4, fiserv_part_number),
        quantity = COALESCE($5, quantity),
        minimum_quantity = COALESCE($6, minimum_quantity),
        supplier = COALESCE($7, supplier),
        unit_cost = COALESCE($8, unit_cost),
        location_id = COALESCE($9, location_id),
        notes = COALESCE($10, notes),
        status = COALESCE($11, status)
      WHERE part_id = $12
      RETURNING *`,
      [
        name,
        description || null,
        manufacturer_part_number || null,
        fiserv_part_number,
        quantity,
        minimum_quantity,
        manufacturer || null,
        cost,
        locationId,
        notes || null,
        status || 'active',
        partId
      ]
    );

    await pool.query('COMMIT');
    console.log('Updated part:', result.rows[0].part_id);

    if (result.rows.length === 0) {
      console.log('Part not found:', partId);
      res.status(404).json({ error: 'Part not found' });
    } else {
      console.log('Updated part:', result.rows[0].part_id);
      res.json(result.rows[0]);
    }
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating part:', err);
    throw err;
  }
}));

// Delete a part
router.delete('/:id', asyncHandler(async (req, res) => {
  const partId = parseInt(req.params.id);

  try {
    console.log('Deleting part:', partId);
    const result = await pool.query(
      'DELETE FROM parts WHERE part_id = $1 RETURNING *',
      [partId]
    );

    if (result.rows.length === 0) {
      console.log('Part not found:', partId);
      res.status(404).json({ error: 'Part not found' });
    } else {
      console.log('Deleted part:', result.rows[0].part_id);
      res.json({ message: 'Part deleted successfully' });
    }
  } catch (err) {
    console.error('Error deleting part:', err);
    throw err;
  }
}));

// Record parts usage
router.post('/usage', asyncHandler(async (req, res) => {
  const { part_id, machine_id, quantity, reason } = req.body;

  console.log('Recording parts usage:', { part_id, machine_id, quantity });

  if (!part_id || !machine_id || !quantity || quantity <= 0) {
    console.error('Invalid request:', { part_id, machine_id, quantity });
    throw new Error('Invalid request. Required fields: part_id, machine_id, quantity (> 0)');
  }

  try {
    await pool.query('BEGIN');

    // Check if part exists and has enough quantity
    const partResult = await pool.query(
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
    await pool.query(
      'UPDATE parts SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2',
      [quantity, part_id]
    );

    // Record usage in transactions table
    const usageResult = await pool.query(
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

    await pool.query('COMMIT');
    console.log('Parts usage recorded successfully:', usageResult.rows[0]);
    
    // Notify clients of inventory change
    notifyInventoryChange();
    
    res.json({ message: 'Parts usage recorded successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error recording parts usage:', err);
    throw err;
  }
}));

// Restock parts
router.post('/restock', asyncHandler(async (req, res) => {
  const { part_id, quantity } = req.body;

  console.log('Restocking parts:', { part_id, quantity });

  if (!part_id || !quantity || quantity <= 0) {
    console.error('Invalid request:', { part_id, quantity });
    throw new Error('Invalid request. Required fields: part_id, quantity (> 0)');
  }

  try {
    await pool.query('BEGIN');

    // Check if part exists
    const partResult = await pool.query(
      'SELECT part_id FROM parts WHERE part_id = $1',
      [part_id]
    );

    if (partResult.rows.length === 0) {
      throw new Error(`Part not found with ID: ${part_id}`);
    }

    // Update part quantity
    await pool.query(
      'UPDATE parts SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE part_id = $2',
      [quantity, part_id]
    );

    // Record restock in transactions table
    const restockResult = await pool.query(
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

    await pool.query('COMMIT');
    console.log('Parts restocked successfully:', restockResult.rows[0]);
    
    // Notify clients of inventory change
    notifyInventoryChange();
    
    res.json({ message: 'Parts restocked successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error restocking parts:', err);
    throw err;
  }
}));

// Get recent parts usage (last 24 hours)
router.get('/usage/recent', asyncHandler(async (req, res) => {
  try {
    const result = await pool.query(`
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
}));

// Get parts usage history
router.get('/usage/history', asyncHandler(async (req, res) => {
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
        t.notes as reason
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
    const result = await pool.query(query, queryParams);
    console.log('Query result:', { rowCount: result.rowCount });

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching parts usage history:', err);
    throw err;
  }
}));

module.exports = router;