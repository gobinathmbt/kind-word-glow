const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

// Public route for workflow execution (no auth required)
// POST /api/workflow-execute/:endpoint - Execute workflow via custom endpoint
router.post('/:endpoint', workflowController.executeWorkflow);

module.exports = router;