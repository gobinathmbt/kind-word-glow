const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { 
  createController, 
  modifyController, 
  retrieveController 
} = require('../controllers/vehicleMetadata.controller');

const router = express.Router();
router.use(protect);
router.use(authorize('master_admin'));

// Get lists for tables (makes, models, variants, bodies, years, metadata)
router.get('/list/:type', retrieveController.list);

// Get dropdown data
router.get('/dropdown', retrieveController.dropdown);

// Get counts for dashboard
router.get('/counts', retrieveController.counts);

// Get schema fields for form building
router.get('/schema-fields', retrieveController.schemaFields);


// Create single entry (make, model, variant, body, year, metadata)
router.post('/create/:type', createController.create);

// Bulk create entries
router.post('/bulk-create', createController.bulkCreate);

// Update single entry
router.put('/update/:type/:id', modifyController.update);

// Delete single entry
router.delete('/delete/:type/:id', modifyController.delete);

module.exports = router;