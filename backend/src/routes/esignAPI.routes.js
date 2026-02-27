const express = require('express');
const router = express.Router();
const esignAPIController = require('../controllers/esignAPI.controller');
const { esignAPIAuth, requireScope } = require('../middleware/esignAPIAuth');
const { moderateRateLimit, strictRateLimit } = require('../middleware/esignRateLimit');
const { esignIdempotency } = require('../middleware/esignIdempotency');

/**
 * External API Routes for E-Sign
 * 
 * These routes are accessed by external systems using API keys
 * No auth/tenantContext middleware - uses esignAPIAuth instead
 * 
 * Base path: /api/v1/esign
 */

// Apply API authentication to all routes
router.use(esignAPIAuth);

// Apply rate limiting to all routes
router.use(moderateRateLimit);

/**
 * Document Initiation
 * POST /api/v1/esign/documents/initiate
 * 
 * Initiates a new document signing workflow
 * Requires scope: esign:create
 * Supports idempotency via x-idempotency-key header
 */
router.post(
  '/documents/initiate',
  requireScope('esign:create'),
  esignIdempotency,
  esignAPIController.initiateDocument
);

/**
 * Document Status
 * GET /api/v1/esign/documents/:id/status
 * 
 * Get current status of a document
 * Requires scope: esign:status
 */
router.get(
  '/documents/:id/status',
  requireScope('esign:status'),
  esignAPIController.getDocumentStatus
);

/**
 * Download Signed PDF
 * GET /api/v1/esign/documents/:id/download
 * 
 * Download the signed PDF document
 * Requires scope: esign:download
 */
router.get(
  '/documents/:id/download',
  requireScope('esign:download'),
  esignAPIController.downloadDocument
);

/**
 * Cancel Document
 * POST /api/v1/esign/documents/:id/cancel
 * 
 * Cancel a pending document
 * Requires scope: esign:cancel
 */
router.post(
  '/documents/:id/cancel',
  requireScope('esign:cancel'),
  esignAPIController.cancelDocument
);

/**
 * Get Template Schema
 * GET /api/v1/esign/templates/:id/schema
 * 
 * Get the payload schema for a template
 * Requires scope: template:read
 */
router.get(
  '/templates/:id/schema',
  requireScope('template:read'),
  esignAPIController.getTemplateSchema
);

/**
 * Bulk Document Initiation
 * POST /api/v1/esign/bulk/initiate
 * 
 * Initiate multiple documents from CSV file
 * Requires scope: esign:create
 */
router.post(
  '/bulk/initiate',
  requireScope('esign:create'),
  strictRateLimit, // Stricter rate limit for bulk operations
  esignAPIController.initiateBulkDocuments
);

/**
 * Get Bulk Job Status
 * GET /api/v1/esign/bulk/:jobId/status
 * 
 * Get status of a bulk job
 * Requires scope: esign:status
 */
router.get(
  '/bulk/:jobId/status',
  requireScope('esign:status'),
  esignAPIController.getBulkJobStatus
);

module.exports = router;
