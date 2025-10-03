
const express = require('express');
const { 
  getDropdowns, 
  getMasterdropdownvalues,
  createDropdown, 
  updateDropdown, 
  deleteDropdown, 
  addValue, 
  updateValue, 
  deleteValue, 
  reorderValues, 
  getMasterInspection 
} = require('../controllers/masterDropdown.controller');
const router = express.Router();

// Note: parent master.routes.js already applies protect + authorize('master_admin')
// These routes are mounted under /api/master/dropdowns

// CRUD for master dropdowns
router.get('/', getDropdowns);
router.post('/dropdown_values', getMasterdropdownvalues);
router.post('/', createDropdown);
router.put('/:id', updateDropdown);
router.delete('/:id', deleteDropdown);

// Values management
router.post('/:id/values', addValue);
router.put('/:id/values/:valueId', updateValue);
router.put('/:id/reorder/values', reorderValues);
router.delete('/:id/values/:valueId', deleteValue);

// Static master inspection categories
router.get('/master_inspection', getMasterInspection);

module.exports = router;
