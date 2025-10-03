
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  togglePermissionStatus
} = require('../controllers/permission.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('master_admin'));

// Permission management routes
router.get('/', getPermissions);
router.post('/', createPermission);
router.get('/:id', getPermission);
router.put('/:id', updatePermission);
router.delete('/:id', deletePermission);
router.patch('/:id/status', togglePermissionStatus);

module.exports = router;
