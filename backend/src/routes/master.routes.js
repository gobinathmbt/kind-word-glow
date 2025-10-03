
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboard,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  toggleCompanyStatus,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  updateProfile,
  updateSmtpSettings,
  testSmtp,
  updateAwsSettings,
  testAwsConnection,
  getAwsSettings,
  getMaintenanceSettings,
  updateMaintenanceSettings
} = require('../controllers/master.controller');

const router = express.Router();

// Public maintenance check route (no auth required)
router.get('/maintenance/public', async (req, res) => {
  try {
    const MasterAdmin = require('../models/MasterAdmin');
    const masterAdmin = await MasterAdmin.findOne({}).select('website_maintenance');
    
    res.json({
      success: true,
      data: masterAdmin?.website_maintenance || {
        is_enabled: false,
        message: 'We are currently performing maintenance on our website. Please check back later.',
        end_time: null,
        modules: []
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        is_enabled: false,
        message: 'We are currently performing maintenance on our website. Please check back later.',
        end_time: null,
        modules: []
      }
    });
  }
});

// Apply auth middleware to all other routes
router.use(protect);
router.use(authorize('master_admin'));

// Dashboard routes
router.get('/dashboard', getDashboard);

// Company management routes
router.get('/companies', getCompanies);
router.get('/companies/:id', getCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);
router.patch('/companies/:id/status', toggleCompanyStatus);

// Plan management routes
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Permission management routes
router.use('/permissions', require('./permission.routes'));

// Settings routes
router.put('/profile', updateProfile);
router.put('/smtp-settings', updateSmtpSettings);
router.post('/test-smtp', testSmtp);
router.put('/aws-settings', updateAwsSettings);
router.post('/test-aws', testAwsConnection);
router.get('/aws-settings', getAwsSettings);

// Website maintenance routes
router.get('/maintenance', getMaintenanceSettings);
router.put('/maintenance', updateMaintenanceSettings);

// Master admin dropdown routes
router.use('/dropdowns', require('./master.dropdown.routes'));
router.use('/master/dropdowns', authorize('master_admin'), require('./master.dropdown.routes'));

module.exports = router;
