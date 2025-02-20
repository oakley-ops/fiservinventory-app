const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db');

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

// Get all parts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parts ORDER BY id ASC');
    res.json(result.rows);
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
    
    const result = await pool.query('SELECT * FROM parts WHERE id = $1', [id]);
    
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
    const { name, description, quantity, location } = req.body;
    
    if (!name || !quantity || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      'INSERT INTO parts (name, description, quantity, location) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, quantity, location]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding part:', error);
    res.status(500).json({ error: 'Failed to add part' });
  }
});

// Update a part
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, quantity, location } = req.body;
    
    if (!name || !quantity || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      'UPDATE parts SET name = $1, description = $2, quantity = $3, location = $4 WHERE id = $5 RETURNING *',
      [name, description, quantity, location, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// Delete a part
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM parts WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

module.exports = router; 