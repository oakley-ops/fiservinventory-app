const express = require('express');
const router = express.Router();
const MachineController = require('../controllers/MachineController');
const asyncHandler = require('express-async-handler');

const machineController = new MachineController();

// Add logging middleware
router.use((req, res, next) => {
  console.log('Machine route hit:', {
    method: req.method,
    path: req.path,
    params: req.params,
    originalUrl: req.originalUrl
  });
  next();
});

router.get('/', asyncHandler(async (req, res) => await machineController.getAllMachines(req, res)));
router.get('/:id', asyncHandler(async (req, res) => await machineController.getMachine(req, res)));
router.post('/', asyncHandler(async (req, res) => await machineController.createMachine(req, res)));
// ... other routes for update, delete
router.delete('/:id', asyncHandler(async (req, res) => await machineController.deleteMachine(req, res)));

module.exports = router;