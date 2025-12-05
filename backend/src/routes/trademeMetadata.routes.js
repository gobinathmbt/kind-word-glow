const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const trademeMetadataController = require('../controllers/trademeMetadata.controller');

const router = express.Router();
router.use(protect);
router.use(authorize('master_admin'));

// Get all trademe metadata with pagination and filters
router.get('/', trademeMetadataController.getAll);

// Get counts by metadata type
router.get('/counts', trademeMetadataController.getCounts);

// Get single trademe metadata by ID
router.get('/:id', trademeMetadataController.getById);

// Update trademe metadata
router.put('/:id', trademeMetadataController.update);

// Delete trademe metadata
router.delete('/:id', trademeMetadataController.delete);

// Toggle active status
router.patch('/:id/status', trademeMetadataController.toggleStatus);

module.exports = router;
