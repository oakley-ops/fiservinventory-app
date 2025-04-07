const express = require('express');
const SupplierController = require('../controllers/SupplierController');
const authenticateToken = require('../middleware/authenticateToken');
const roleAuthorization = require('../middleware/roleMiddleware');

const router = express.Router();

// Apply authentication middleware to all supplier routes
router.use(authenticateToken);

// CRUD operations - restrict to admin and purchasing roles
router.post('/', roleAuthorization(['admin', 'purchasing']), SupplierController.createSupplier);
router.get('/', roleAuthorization(['admin', 'purchasing']), SupplierController.getAllSuppliers);
router.get('/:id', roleAuthorization(['admin', 'purchasing']), SupplierController.getSupplierById);
router.put('/:id', roleAuthorization(['admin', 'purchasing']), SupplierController.updateSupplier);
router.delete('/:id', roleAuthorization(['admin', 'purchasing']), SupplierController.deleteSupplier);

// Get parts by supplier - restrict to admin and purchasing roles
router.get('/:id/parts', roleAuthorization(['admin', 'purchasing']), SupplierController.getPartsBySupplier);

module.exports = router;
