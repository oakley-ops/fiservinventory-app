const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const dbConfig = require('../../config/database')[process.env.NODE_ENV || 'development'];
const pool = new Pool(dbConfig);

// Get all machines
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        machine_id as id,
        name,
        model,
        serial_number,
        location,
        manufacturer,
        installation_date,
        last_maintenance_date,
        next_maintenance_date,
        notes
      FROM machines
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching machines:', err);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// Create a new machine
router.post('/', async (req, res) => {
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

// Get a specific machine
router.get('/:id', async (req, res) => {
  const machineId = parseInt(req.params.id);
  try {
    const result = await pool.query(
      `SELECT 
        machine_id as id,
        name,
        model,
        serial_number,
        location,
        manufacturer,
        installation_date,
        last_maintenance_date,
        next_maintenance_date,
        notes
      FROM machines
      WHERE machine_id = $1`,
      [machineId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Machine not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error fetching machine:', err);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
});

// Update a machine
router.put('/:id', async (req, res) => {
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
    notes,
    status
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE machines SET
        name = COALESCE($1, name),
        model = COALESCE($2, model),
        serial_number = COALESCE($3, serial_number),
        location = COALESCE($4, location),
        manufacturer = COALESCE($5, manufacturer),
        installation_date = COALESCE($6, installation_date),
        last_maintenance_date = COALESCE($7, last_maintenance_date),
        next_maintenance_date = COALESCE($8, next_maintenance_date),
        notes = COALESCE($9, notes),
        status = COALESCE($10, status)
      WHERE machine_id = $11
      RETURNING *`,
      [
        name,
        model,
        serial_number,
        location,
        manufacturer,
        installation_date,
        last_maintenance_date,
        next_maintenance_date,
        notes,
        status,
        machineId
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Machine not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error updating machine:', err);
    res.status(500).json({ error: 'Failed to update machine' });
  }
});

// Delete a machine
router.delete('/:id', async (req, res) => {
  const machineId = parseInt(req.params.id);

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // First, set machine_id to NULL in related transactions
    await pool.query(
      'UPDATE transactions SET machine_id = NULL WHERE machine_id = $1',
      [machineId]
    );

    // Then delete the machine
    const result = await pool.query(
      'DELETE FROM machines WHERE machine_id = $1 RETURNING *',
      [machineId]
    );

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      res.status(404).json({ error: 'Machine not found' });
    } else {
      await pool.query('COMMIT');
      res.json({ message: 'Machine deleted successfully' });
    }
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error deleting machine:', err);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
});

module.exports = router;