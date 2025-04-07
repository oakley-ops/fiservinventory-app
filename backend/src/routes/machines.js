const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const dbConfig = require('../../config/database')[process.env.NODE_ENV || 'development'];
const pool = new Pool(dbConfig);
const authenticateToken = require('../middleware/authenticateToken');
const roleAuthorization = require('../middleware/roleMiddleware');

// Get all machines - Admin only
router.get('/', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM machines ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching machines:', err);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// Get machine cost summary - Admin only
router.get('/costs', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM machine_parts_cost_view');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching machine costs:', err);
    res.status(500).json({ error: 'Failed to fetch machine costs' });
  }
});

// Get detailed parts usage for a specific machine - Admin only
router.get('/:id/parts-usage', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  const machineId = parseInt(req.params.id);
  
  try {
    const result = await pool.query(
      'SELECT * FROM machine_parts_detail_view WHERE machine_id = $1',
      [machineId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching machine parts usage:', err);
    res.status(500).json({ error: 'Failed to fetch machine parts usage' });
  }
});

// Get parts associated with a specific machine - Admin only
router.get('/:id/parts', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  const machineId = parseInt(req.params.id);
  
  try {
    // Query to get parts associated with a machine through transactions
    const result = await pool.query(`
      SELECT DISTINCT 
        p.part_id,
        p.name,
        p.fiserv_part_number,
        p.manufacturer_part_number,
        p.quantity,
        p.minimum_quantity
      FROM 
        parts p
      JOIN 
        transactions t ON p.part_id = t.part_id
      WHERE 
        t.machine_id = $1
      ORDER BY 
        p.name
    `, [machineId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching machine parts:', err);
    res.status(500).json({ error: 'Failed to fetch machine parts' });
  }
});

// Get machine parts usage over time (for charts) - Admin only
router.get('/:id/usage-timeline', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  const machineId = parseInt(req.params.id);
  const { startDate, endDate } = req.query;
  
  try {
    let query = `
      SELECT 
        DATE_TRUNC('month', pu.usage_date) AS month,
        SUM(pu.quantity * p.unit_cost) AS monthly_cost,
        COUNT(DISTINCT pu.part_id) AS parts_count,
        SUM(pu.quantity) AS parts_quantity
      FROM parts_usage pu
      JOIN parts p ON pu.part_id = p.part_id
      WHERE pu.machine_id = $1
    `;
    
    const params = [machineId];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND pu.usage_date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND pu.usage_date <= $${params.length}`;
    }
    
    query += `
      GROUP BY DATE_TRUNC('month', pu.usage_date)
      ORDER BY DATE_TRUNC('month', pu.usage_date)
    `;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching machine usage timeline:', err);
    res.status(500).json({ error: 'Failed to fetch machine usage timeline' });
  }
});

// Get PM schedule data for calendar - Available to all authenticated users
router.get('/pm-schedule', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching PM schedule data...');
    
    // First check if maintenance_status column exists
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'machines'
        AND column_name = 'maintenance_status'
      );
    `);
    
    // Construct query based on whether maintenance_status column exists
    let query;
    if (columnCheck.rows[0].exists) {
      query = `
        SELECT 
          machine_id as id,
          name,
          model,
          location,
          last_maintenance_date,
          next_maintenance_date,
          maintenance_status,
          CASE
            WHEN maintenance_status = 'in_progress' THEN 'in_progress'
            WHEN next_maintenance_date < CURRENT_DATE THEN 'overdue'
            WHEN next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due'
            ELSE 'scheduled'
          END as status
        FROM machines
        WHERE next_maintenance_date IS NOT NULL
        AND (maintenance_status IS NULL OR maintenance_status != 'completed')
        ORDER BY next_maintenance_date ASC
      `;
    } else {
      query = `
        SELECT 
          machine_id as id,
          name,
          model,
          location,
          last_maintenance_date,
          next_maintenance_date,
          CASE
            WHEN next_maintenance_date < CURRENT_DATE THEN 'overdue'
            WHEN next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due'
            ELSE 'scheduled'
          END as status
        FROM machines
        WHERE next_maintenance_date IS NOT NULL
        ORDER BY next_maintenance_date ASC
      `;
    }
    
    const result = await pool.query(query);
    
    console.log(`Found ${result.rows.length} machines with maintenance dates`);
    
    // Count status types for debugging
    const overdueCount = result.rows.filter(m => m.status === 'overdue').length;
    const dueCount = result.rows.filter(m => m.status === 'due').length;
    const scheduledCount = result.rows.filter(m => m.status === 'scheduled').length;
    const inProgressCount = result.rows.filter(m => m.status === 'in_progress').length;
    
    console.log(`Status counts - Overdue: ${overdueCount}, Due: ${dueCount}, Scheduled: ${scheduledCount}, In Progress: ${inProgressCount}`);
    
    // Format the data for the calendar
    const events = result.rows.map(machine => {
      // Ensure id is a valid number
      const id = typeof machine.id === 'number' ? machine.id : parseInt(machine.id, 10);
      
      // Skip invalid entries
      if (isNaN(id) || !machine.next_maintenance_date) {
        console.warn('Skipping invalid machine data:', machine);
        return null;
      }
      
      const event = {
        id,
        title: `${machine.name || 'Unknown'} ${machine.model ? `(${machine.model})` : ''}`,
        start: machine.next_maintenance_date,
        end: machine.next_maintenance_date,
        allDay: true,
        resource: {
          location: machine.location || 'Unknown',
          status: machine.status || 'scheduled',
          lastMaintenance: machine.last_maintenance_date
        }
      };
      
      // Debug log for overdue events
      if (machine.status === 'overdue') {
        console.log('Created overdue event:', event);
      }
      
      return event;
    }).filter(event => event !== null); // Remove any null entries
    
    console.log(`Sending ${events.length} events to frontend`);
    console.log(`Event status counts - Overdue: ${events.filter(e => e.resource.status === 'overdue').length}, Due: ${events.filter(e => e.resource.status === 'due').length}, Scheduled: ${events.filter(e => e.resource.status === 'scheduled').length}`);
    
    res.json(events);
  } catch (err) {
    console.error('Error fetching PM schedule data:', err);
    res.status(500).json({ error: 'Failed to fetch PM schedule data' });
  }
});

// Create a new machine - Admin only
router.post('/', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  const {
    name,
    model,
    serial_number,
    location,
    manufacturer,
    installation_date,
    notes
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO machines (
        name,
        model,
        serial_number,
        location,
        manufacturer,
        installation_date,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, model, serial_number, location, manufacturer, installation_date, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating machine:', err);
    res.status(500).json({ error: 'Failed to create machine' });
  }
});

// Get a specific machine - Admin only
router.get('/:id', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  const machineId = parseInt(req.params.id);
  
  try {
    const result = await pool.query(
      'SELECT * FROM machines WHERE machine_id = $1',
      [machineId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching machine:', err);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
});

// Update a machine - Admin only
router.put('/:id', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  const machineId = parseInt(req.params.id);
  const {
    name,
    model,
    serial_number,
    location,
    manufacturer,
    installation_date,
    last_maintenance_date,
    next_maintenance_date,
    maintenance_status,
    notes
  } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE machines SET
        name = $1,
        model = $2,
        serial_number = $3,
        location = $4,
        manufacturer = $5,
        installation_date = $6,
        last_maintenance_date = $7,
        next_maintenance_date = $8,
        maintenance_status = $9,
        notes = $10
      WHERE machine_id = $11 RETURNING *`,
      [
        name,
        model,
        serial_number,
        location,
        manufacturer,
        installation_date,
        last_maintenance_date,
        next_maintenance_date,
        maintenance_status,
        notes,
        machineId
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating machine:', err);
    res.status(500).json({ error: 'Failed to update machine' });
  }
});

// Delete a machine - Admin only
router.delete('/:id', authenticateToken, roleAuthorization(['admin']), async (req, res) => {
  const machineId = parseInt(req.params.id);
  
  try {
    const result = await pool.query(
      'DELETE FROM machines WHERE machine_id = $1 RETURNING *',
      [machineId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    res.json({ message: 'Machine deleted successfully' });
  } catch (err) {
    console.error('Error deleting machine:', err);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
});

module.exports = router;