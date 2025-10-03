const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getLogs,
  getLogUsers,
  getLogCompanies,
  exportLogs,
  getDailyLogAnalytics
} = require('../controllers/logs.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Log routes accessible to master_admin only
router.get('/', authorize('master_admin'), getLogs);
router.get('/users', authorize('master_admin'), getLogUsers);
router.get('/companies', authorize('master_admin'), getLogCompanies);
router.get('/export', authorize('master_admin'), exportLogs);
router.get('/analytics/daily', authorize('master_admin'), getDailyLogAnalytics);

module.exports = router;