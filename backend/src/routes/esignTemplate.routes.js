const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { checkModuleAccess } = require('../middleware/moduleAccess');
const esignTemplateController = require('../controllers/esignTemplate.controller');

// Apply middleware to all routes
router.use(protect);
router.use(tenantContext);
router.use(checkModuleAccess('esign_documents'));

// Template CRUD Routes
router.post('/', 
  esignTemplateController.createTemplate
);

router.get('/', 
  esignTemplateController.listTemplates
);

router.get('/:id', 
  esignTemplateController.getTemplate
);

router.put('/:id', 
  esignTemplateController.updateTemplate
);

router.delete('/:id', 
  esignTemplateController.deleteTemplate
);

// Template Operations
router.post('/:id/duplicate', 
  esignTemplateController.duplicateTemplate
);

router.post('/:id/activate', 
  authorize('company_super_admin', 'company_admin'),
  esignTemplateController.activateTemplate
);

router.post('/:id/upload-pdf', 
  esignTemplateController.uploadPDF
);

router.post('/:id/extract-delimiters', 
  esignTemplateController.extractDelimiters
);

module.exports = router;
