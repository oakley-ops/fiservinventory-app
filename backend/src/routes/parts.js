const express = require('express');
const router = express.Router();
const PartController = require('../controllers/PartController');
const authMiddleware = require('../middleware/authMiddleware'); 
const multer = require('multer'); 
const csv = require('csv-parser'); 

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

const partController = new PartController();
router.get('/:id/forecast', async (req, res) => {
    const partId = parseInt(req.params.id);
  
    try {
      const partResult = await pool.query('SELECT * FROM parts WHERE part_id = $1', [partId]);
      if (partResult.rows.length === 0) {
        return res.status(404).send('Part not found.');
      }
      const part = partResult.rows[0];
  
      const transactionsResult = await pool.query('SELECT * FROM transactions WHERE part_id = $1', [partId]);
      const transactions = transactionsResult.rows;
  
      // Removed forecasting service dependency
      // const forecast = predictLowStock(part, transactions);
  
      res.json({ message: 'Forecasting service temporarily removed' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error generating forecast.');
    }
  });
router.get('/', async (req, res) => {
    const { name, machine_id, supplier, sort, order, limit, offset } = req.query; 
    let query = 'SELECT * FROM parts';
    const values = [];
  
    if (name || machine_id || supplier) { 
      query += ' WHERE';
      if (name) {
        query += ' name LIKE $1';
        values.push(`%${name}%`);
      }
      if (machine_id) {
        if (name || supplier) query += ' AND'; 
        query += ' machine_id = $' + (values.length + 1);
        values.push(parseInt(machine_id));
      }
      if (supplier) {
        if (name || machine_id) query += ' AND'; 
        query += ' supplier LIKE $' + (values.length + 1);
        values.push(`%${supplier}%`);
      }
    }
  
    if (sort) {
      const allowedSortFields = ['name', 'quantity', 'part_id']; 
      if (allowedSortFields.includes(sort)) {
        query += ` ORDER BY ${sort}`;
        if (order === 'desc') {
          query += ' DESC';
        }
      }
    }
  
    if (limit) {
      query += ' LIMIT $' + (values.length + 1);
      values.push(parseInt(limit));
    }
  
    if (offset) {
      query += ' OFFSET $' + (values.length + 1);
      values.push(parseInt(offset));
    }
  
    try {
      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching parts.');
    }
  });

  router.post('/remove', async (req, res) => {
    const { barcode, quantity } = req.body;
  
    try {
      const findPartResult = await pool.query(
        'SELECT * FROM parts WHERE manufacturer_part_number = $1 OR fiserv_part_number = $1',
        [barcode]
      );
  
      if (findPartResult.rows.length === 0) {
        return res.status(404).send('Part not found.');
      }
  
      const part = findPartResult.rows[0];
  
      const newQuantity = part.quantity - quantity; 
      if (newQuantity < 0) {
        return res.status(400).send('Insufficient quantity in stock.');
      }
  
      const updateResult = await pool.query(
        'UPDATE parts SET quantity = $1 WHERE part_id = $2',
        [newQuantity, part.part_id]
      );
  
      res.json({ message: 'Part removed from inventory.' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error removing part.');
    }
  });

  router.post('/assign', async (req, res) => {
    const { partId, machineId } = req.body;
  
    try {
      const partResult = await pool.query('SELECT * FROM parts WHERE part_id = $1', [partId]);
      if (partResult.rows.length === 0) {
        return res.status(404).send('Part not found.');
      }
  
      const machineResult = await pool.query('SELECT * FROM machines WHERE machine_id = $1', [machineId]);
      if (machineResult.rows.length === 0) {
        return res.status(404).send('Machine not found.');
      }
  
      await pool.query('UPDATE parts SET machine_id = $1 WHERE part_id = $2', [machineId, partId]);
  
      res.json({ message: 'Part assigned to machine successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error assigning part to machine.');
    }
  });

  router.post('/upload', upload.single('csvFile'), async (req, res) => {
    if (!req.file) {
      return res.status(400).send('No CSV file provided.');
    }
  
    const results = [];
    const errors = [];
    let processedRows = 0; 
  
    try {
      const parser = csv({
        mapHeaders: ({ header }) => header.toLowerCase().replace(/\s/g, '_'),
      });
  
      parser.on('data', (data) => results.push(data));
      parser.on('end', async () => {
        try {
          for (const row of results) {
            if (row.machine_name) {
              const machineResult = await pool.query(
                'SELECT machine_id FROM machines WHERE name = $1',
                [row.machine_name]
              );
              if (machineResult.rows.length > 0) {
                row.machine_id = machineResult.rows[0].machine_id;
              } else {
                errors.push(`Machine not found for row: ${JSON.stringify(row)}`);
                continue;
              }
            }
          }
  
          if (errors.length > 0) {
            return res.status(400).json({ errors });
          }
  
          for (const row of results) {
            await pool.query(
              `INSERT INTO parts (
                name,
                description,
                manufacturer_part_number,
                fiserv_part_number,
                quantity,
                minimum_quantity,
                supplier,
                unit_cost,
                location
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                row.name,
                row.description,
                row.manufacturer_part_number,
                row.fiserv_part_number,
                parseInt(row.quantity) || 0,
                parseInt(row.minimum_quantity) || 0,
                row.supplier,
                parseFloat(row.unit_cost) || 0.0,
                row.location,
              ]
            );
            processedRows++;
          }
  
          res.json({ message: 'CSV data uploaded successfully!' });
        } catch (error) {
          console.error(error);
          res.status(500).send('Error uploading CSV data.');
        }
      });
  
      parser.write(req.file.buffer);
      parser.end();
    } catch (error) {
      console.error(error);
      res.status(500).send('Error processing CSV file.');
    }
  });
  
  router.put(
    '/:id',
    async (req, res) => {
      const id = parseInt(req.params.id);
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
      } = req.body;

      try {
        const result = await pool.query(
          `UPDATE parts SET
            name = $1,
            description = $2,
            manufacturer_part_number = $3,
            fiserv_part_number = $4,
            quantity = $5,
            minimum_quantity = $6,
            machine_id = $7,
            supplier = $8,
            unit_cost = $9,
            location = $10
          WHERE part_id = $11 RETURNING *`,
          [
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
            id,
          ]
        );

        if (result.rows.length === 0) {
          return res.status(404).send('Part not found');
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error updating part.');
      }
    }
  );
  
  router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
      const result = await pool.query(
        'DELETE FROM parts WHERE part_id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).send('Part not found');
      }

      res.json({ message: 'Part deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error deleting part.');
    }
  });

module.exports = router;