const Transaction = require('../models/Transaction');
const { Pool } = require('pg');

class TransactionController {
  constructor() {
    this.pool = new Pool({
      // ... your database configuration
    });
  }

  async getAllTransactions(req, res) {
    try {
      const result = await this.pool.query('SELECT * FROM transactions');
      const transactions = result.rows.map(
        (row) =>
          new Transaction(
            row.transaction_id,
            row.part_id,
            row.type,
            row.quantity,
            row.timestamp,
            row.user_id
          )
      );
      res.json(transactions);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching transactions');
    }
  }

  // ... other methods for create, update (if needed), delete
}

module.exports = TransactionController;