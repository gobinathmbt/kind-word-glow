const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getVehiclesByStatus,
  getWorkshopQuotesByStatus,
  getLicenseExpiryTracking,
  getReportCompletion,
  getWorkshopProgress,
  getCostAnalysis,
  getSupplierPerformance,
  getTimelineAnalysis,
  getQualityMetrics,
  getWorkloadDistribution,
  getCompletionRateAnalysis,
  getWorkshopReportsSummary,
  getVehicleRecords,
} = require('../controllers/dashboardReport.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Dashboard report routes
router.get('/vehicles-by-status', getVehiclesByStatus);
router.get('/workshop-quotes-by-status', getWorkshopQuotesByStatus);
router.get('/license-expiry', getLicenseExpiryTracking);
router.get('/report-completion', getReportCompletion);
router.get('/workshop-progress', getWorkshopProgress);
router.get('/cost-analysis', getCostAnalysis);
router.get('/supplier-performance', getSupplierPerformance);
router.get('/timeline-analysis', getTimelineAnalysis);
router.get('/quality-metrics', getQualityMetrics);
router.get('/workload-distribution', getWorkloadDistribution);
router.get('/completion-rate', getCompletionRateAnalysis);
router.get('/workshop-reports-summary', getWorkshopReportsSummary);
router.post('/vehicle-records', getVehicleRecords);

module.exports = router;
