const express = require('express');
const authController = require('../controllers/authController');
const flowController = require('../controllers/flowController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.route('/expenses-getFlowStats').get(flowController.getFlowStats);
router.route('/expenses').get(flowController.getAll);
router.route('/:id').post(flowController.createOne);

export default router;
