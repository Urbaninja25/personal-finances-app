const express = require('express');
const categoryController = require('../controllers/categoryController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.post('/:id', categoryController.createCategory);
router.put('/:id', categoryController.renameCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
