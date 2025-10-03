const express = require("express");
const { body } = require("express-validator");
const workflowController = require("../controllers/workflow.controller");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Validation middleware
const validateWorkflowCreation = [
  body("name").notEmpty().trim().withMessage("Workflow name is required"),
  body("workflow_type")
    .isIn(["vehicle_inbound", "vehicle_property_trigger", "email_automation"])
    .withMessage("Invalid workflow type"),
  body("description").optional().trim(),
];

const validateWorkflowUpdate = [
  body("name")
    .optional()
    .notEmpty()
    .trim()
    .withMessage("Workflow name cannot be empty"),
  body("workflow_type")
    .optional()
    .isIn(["vehicle_inbound", "vehicle_property_trigger", "email_automation"])
    .withMessage("Invalid workflow type"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "draft"])
    .withMessage("Invalid status"),
];

// Routes that require authentication and workflow module access

router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));

// GET /api/workflows - Get all workflows
router.get("/", workflowController.getWorkflows);

// GET /api/workflows/stats - Get workflow statistics
router.get("/stats", workflowController.getWorkflowStats);

// GET /api/workflows/vehicle-schema - Get vehicle schema fields for mapping
router.get("/vehicle-schema", workflowController.getVehicleSchemaFields);

// GET /api/workflows/:id - Get specific workflow
router.get("/:id", workflowController.getWorkflow);

// POST /api/workflows - Create new workflow
router.post("/", validateWorkflowCreation, workflowController.createWorkflow);

// PUT /api/workflows/:id - Update workflow
router.put("/:id", validateWorkflowUpdate, workflowController.updateWorkflow);

// PATCH /api/workflows/:id/status - Toggle workflow status
router.patch("/:id/status", workflowController.toggleWorkflowStatus);

// DELETE /api/workflows/:id - Delete workflow
router.delete("/:id", workflowController.deleteWorkflow);

// POST /api/workflows/:id/test - Test workflow configuration
router.post("/:id/test", workflowController.testWorkflow);

module.exports = router;
