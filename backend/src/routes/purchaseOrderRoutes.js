const express = require('express');
const PurchaseOrderController = require('../controllers/PurchaseOrderController');
const authenticate = require('../middleware/authMiddleware');
const roleAuthorization = require('../middleware/roleMiddleware');
const { body } = require('express-validator');

const router = express.Router();
const purchaseOrderController = new PurchaseOrderController();

// GET all purchase orders
router.get('/', 
  authenticate, 
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.getAllPurchaseOrders.bind(purchaseOrderController)
);

// GET parts with pending purchase orders
router.get(
  '/parts-with-pending-orders',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.getPartsWithPendingOrders.bind(purchaseOrderController)
);

// GET purchase order by ID
router.get('/:id', 
  authenticate, 
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.getPurchaseOrderById.bind(purchaseOrderController)
);

// POST create purchase order
router.post(
  '/',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.getValidationRules(),
  purchaseOrderController.createPurchaseOrder.bind(purchaseOrderController)
);

// PUT update purchase order status
router.put(
  '/:id/status',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.updatePurchaseOrderStatus.bind(purchaseOrderController)
);

// PUT update general purchase order fields
router.put(
  '/:id',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.updatePurchaseOrder.bind(purchaseOrderController)
);

// DELETE purchase order
router.delete(
  '/:id',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.deletePurchaseOrder.bind(purchaseOrderController)
);

// POST generate purchase orders for parts
router.post(
  '/generate-for-low-stock',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.generatePurchaseOrdersForParts.bind(purchaseOrderController)
);

// New routes for managing purchase order items
// POST add item to purchase order
router.post(
  '/:id/items',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.addItemToPurchaseOrder.bind(purchaseOrderController)
);

// DELETE remove item from purchase order
router.delete(
  '/:id/items/:itemId',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.removeItemFromPurchaseOrder.bind(purchaseOrderController)
);

// PUT update item in purchase order
router.put(
  '/:id/items/:itemId',
  authenticate,
  roleAuthorization(['admin', 'purchasing']),
  purchaseOrderController.updateItemInPurchaseOrder.bind(purchaseOrderController)
);

// POST create blank purchase order
router.post('/blank', 
  authenticate, 
  roleAuthorization(['admin', 'purchasing']),
  [
    body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('is_urgent').optional().isBoolean().withMessage('is_urgent must be a boolean'),
    body('next_day_air').optional().isBoolean().withMessage('next_day_air must be a boolean'),
    body('shipping_cost').optional().isFloat({ min: 0 }).withMessage('Shipping cost must be a positive number'),
    body('tax_amount').optional().isFloat({ min: 0 }).withMessage('Tax amount must be a positive number'),
    body('requested_by').optional().isString().withMessage('Requested by must be a string'),
    body('approved_by').optional().isString().withMessage('Approved by must be a string'),
    body('priority').optional().isString().withMessage('Priority must be a string')
  ], 
  purchaseOrderController.createBlankPurchaseOrder.bind(purchaseOrderController)
);

module.exports = router;
