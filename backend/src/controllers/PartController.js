const Part = require('../models/Part');
const { Pool } = require('pg'); 
const { body, validationResult } = require('express-validator'); 
const io = require('socket.io'); // Fix socket.io initialization

class PartController {
  constructor(server) {
    this.pool = new Pool({
      // ... your database configuration
    });
    this.io = io(server); // Initialize socket.io with the server instance
  }

  async getAllParts(req, res) {
    try {
      const result = await this.pool.query('SELECT * FROM parts');
      const parts = result.rows.map(
        (row) =>
          new Part(
            row.part_id,
            row.name,
            row.description,
            row.quantity,
            row.manufacturer_part_number,
            row.fiserv_part_number,
            row.machine_id,
            row.supplier,
            row.image
          )
      );
      res.json(parts);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching parts');
    }
  }

  // ... other methods for create, update, delete
  async createPart(req, res) {
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
      const result = await this.pool.query(
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

  async updatePart(req, res) {
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
      minimum_quantity
    } = req.body;

    try {
      const result = await this.pool.query(
        `UPDATE parts 
         SET name = $1, description = $2, quantity = $3, manufacturer_part_number = $4, fiserv_part_number = $5, machine_id = $6, supplier = $7, image = $8, minimum_quantity = $9 
         WHERE part_id = $10 RETURNING *`,
        [
          name,
          description,
          quantity,
          manufacturer_part_number,
          fiserv_part_number,
          machine_id,
          supplier,
          image,
          minimum_quantity,
          partId, 
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).send('Part not found');
      }

      const updatedPart = result.rows[0];
      if (updatedPart.quantity < updatedPart.minimum_quantity) {
        this.io.emit('notification', {
          id: 'stock-alert',
          message: `Part ${updatedPart.name} is low in stock!`,
          type: 'warning',
          timestamp: new Date(),
          isRead: false,
        });
      } else if (updatedPart.quantity === 0) {
        this.io.emit('notification', {
          id: 'stock-alert',
          message: `Part ${updatedPart.name} is out of stock!`,
          type: 'error',
          timestamp: new Date(),
          isRead: false,
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating part');
    }
  }

  async deletePart(req, res) {
    const partId = parseInt(req.params.id); 

    try {
      const result = await this.pool.query(
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
  }
}

module.exports = PartController;