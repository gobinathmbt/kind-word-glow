const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

// Public route for workflow execution (no auth required)
// POST /api/workflow-execute/:endpoint - Execute workflow via custom endpoint
router.post('/:endpoint', workflowController.executeWorkflow);

// GET /api/workflow-execute/logs/:workflowId - Get execution logs for a workflow
router.get('/logs/:workflowId', workflowController.getWorkflowExecutionLogs);

module.exports = router;
