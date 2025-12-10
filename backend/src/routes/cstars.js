const express = require('express');
const router = express.Router();
const cstarsController = require('../controllers/cstarsController');

// Create a new Cstar
router.post('/', cstarsController.createCstar);

// Get all Cstars
router.get('/', cstarsController.getAllCstars);

// Search Cstars
router.get('/search', cstarsController.searchCstars);

// Get statistics
router.get('/stats', cstarsController.getCstarsStats);

// Get Cstars by category (must be before /:id)
router.get('/category/:category', cstarsController.getCstarsByCategory);

// Get single Cstar by ID
router.get('/:id', cstarsController.getCstarById);

// Update Cstar
router.put('/:id', cstarsController.updateCstar);

// Delete Cstar
router.delete('/:id', cstarsController.deleteCstar);

module.exports = router;