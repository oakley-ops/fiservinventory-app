const db = require('../../db');

class MachineController {
  constructor() {
    // Bind methods to ensure 'this' context
    this.getAllMachines = this.getAllMachines.bind(this);
    this.getMachine = this.getMachine.bind(this);
    this.createMachine = this.createMachine.bind(this);
    this.deleteMachine = this.deleteMachine.bind(this);
    this.updateMachine = this.updateMachine.bind(this);
  }

  async getMachine(req, res) {
    console.log('getMachine called with params:', req.params);
    const machineId = parseInt(req.params.id);
    
    if (!machineId) {
      console.log('Invalid machine ID:', req.params.id);
      return res.status(400).json({ error: 'Invalid machine ID' });
    }

    try {
      console.log('Executing query for machine ID:', machineId);
      const result = await db.query(
        'SELECT * FROM machines WHERE machine_id = $1',
        [machineId]
      );
      
      console.log('Query result:', result.rows);
      
      if (result.rows.length === 0) {
        console.log('Machine not found:', machineId);
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error in getMachine:', error);
      res.status(500).json({ 
        error: 'Error fetching machine',
        details: error.message 
      });
    }
  }

  async updateMachine(req, res) {
    const machineId = parseInt(req.params.id);
    const { 
      name, 
      model, 
      serial_number, 
      location, 
      status, 
      manufacturer,
      installation_date,
      last_maintenance_date,
      next_maintenance_date,
      notes
    } = req.body;
    
    if (!machineId) {
      return res.status(400).json({ error: 'Invalid machine ID' });
    }

    try {
      // First check if machine exists
      const checkResult = await db.query(
        'SELECT * FROM machines WHERE machine_id = $1',
        [machineId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Machine not found' });
      }

      // Update the machine
      const result = await db.query(
        `UPDATE machines 
         SET name = COALESCE($1, name),
             model = COALESCE($2, model),
             serial_number = COALESCE($3, serial_number),
             location = COALESCE($4, location),
             status = COALESCE($5, status),
             manufacturer = COALESCE($6, manufacturer),
             installation_date = COALESCE($7::timestamp, installation_date),
             last_maintenance_date = COALESCE($8::timestamp, last_maintenance_date),
             next_maintenance_date = COALESCE($9::timestamp, next_maintenance_date),
             notes = COALESCE($10, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE machine_id = $11
         RETURNING *`,
        [
          name, 
          model, 
          serial_number, 
          location, 
          status, 
          manufacturer,
          installation_date,
          last_maintenance_date,
          next_maintenance_date,
          notes,
          machineId
        ]
      );

      console.log('Update result:', result.rows[0]);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating machine:', error);
      res.status(500).json({ 
        error: 'Error updating machine',
        details: error.message 
      });
    }
  }

  async getAllMachines(req, res) {
    try {
      const result = await db.query('SELECT * FROM machines ORDER BY machine_id');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching machines:', error);
      res.status(500).json({ 
        error: 'Error fetching machines',
        details: error.message 
      });
    }
  }

  async createMachine(req, res) {
    const { 
      name, 
      model, 
      serial_number, 
      location, 
      status, 
      manufacturer,
      installation_date,
      last_maintenance_date,
      next_maintenance_date,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Machine name is required' });
    }

    try {
      const result = await db.query(
        `INSERT INTO machines (
          name, 
          model, 
          serial_number, 
          location, 
          status, 
          manufacturer,
          installation_date,
          last_maintenance_date,
          next_maintenance_date,
          notes
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $8::timestamp, $9::timestamp, $10)
        RETURNING *`,
        [
          name, 
          model, 
          serial_number, 
          location, 
          status, 
          manufacturer,
          installation_date,
          last_maintenance_date,
          next_maintenance_date,
          notes
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating machine:', error);
      res.status(500).json({ 
        error: 'Error creating machine',
        details: error.message 
      });
    }
  }

  async deleteMachine(req, res) {
    const machineId = parseInt(req.params.id);
    if (!machineId) {
      return res.status(400).json({ error: 'Invalid machine ID' });
    }

    try {
      const result = await db.query(
        'DELETE FROM machines WHERE machine_id = $1 RETURNING *',
        [machineId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Machine not found' });
      }

      res.json({ message: 'Machine deleted successfully' });
    } catch (error) {
      console.error('Error deleting machine:', error);
      res.status(500).json({ 
        error: 'Error deleting machine',
        details: error.message 
      });
    }
  }
}

module.exports = MachineController;