const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const moduleAccess = require('../middleware/moduleAccess');
const esignSigningGroupController = require('../controllers/esignSigningGroup.controller');

// All routes require authentication, tenant context, and esign module access
router.use(auth);
router.use(tenantContext);
router.use(moduleAccess('esign_documents'));

// Signing group CRUD operations
router.post('/', esignSigningGroupController.createSigningGroup);
router.get('/', esignSigningGroupController.listSigningGroups);
router.get('/:id', esignSigningGroupController.getSigningGroup);
router.put('/:id', esignSigningGroupController.updateSigningGroup);
router.delete('/:id', esignSigningGroupController.deleteSigningGroup);

// Member management
router.post('/:id/members', esignSigningGroupController.addMember);
router.delete('/:id/members/:memberId', esignSigningGroupController.removeMember);

module.exports = router;
