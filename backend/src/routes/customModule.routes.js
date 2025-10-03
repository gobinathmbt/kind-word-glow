const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const customModuleController = require('../controllers/customModule.controller');

// Validation middleware
const customModuleConfigValidation = [
  body('company_id')
    .notEmpty()
    .withMessage('Company ID is required')
    .isMongoId()
    .withMessage('Invalid company ID'),
  body('custom_modules')
    .isArray({ min: 0 })
    .withMessage('Custom modules must be an array'),
  body('custom_modules.*.module_name')
    .notEmpty()
    .withMessage('Module name is required'),
  body('custom_modules.*.module_display')
    .notEmpty()
    .withMessage('Module display name is required'),
  body('custom_modules.*.is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be boolean')
];

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('master_admin'));

// Routes
router.get('/', customModuleController.getCustomModuleConfigs);
router.get('/companies-without-config', customModuleController.getCompaniesWithoutConfig);
router.get('/:id', customModuleController.getCustomModuleConfig);
router.get('/company/:companyId', customModuleController.getCustomModuleConfigByCompany);
router.post('/', customModuleConfigValidation, customModuleController.createOrUpdateCustomModuleConfig);
router.put('/:id', customModuleConfigValidation, customModuleController.createOrUpdateCustomModuleConfig);
router.delete('/:id', customModuleController.deleteCustomModuleConfig);
router.patch('/:id/status', customModuleController.toggleCustomModuleConfigStatus);

module.exports = router;