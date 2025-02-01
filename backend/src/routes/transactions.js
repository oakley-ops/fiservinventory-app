const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/TransactionController');

const transactionController = new TransactionController();

router.get('/', transactionController.getAllTransactions);
// ... other routes for create, update (if needed), delete

module.exports = router;