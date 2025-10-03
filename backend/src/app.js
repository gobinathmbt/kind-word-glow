const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { startSubscriptionCronJob } = require("./jobs/subscriptionCron");
const { startGlobalLogCleanupCron } = require("./jobs/globalLogsCron");
const { startNotificationCleanupCron } = require("./jobs/notificationCleanupCron");
const { startQueueConsumer } = require('./controllers/sqs.controller');
const { startWorkshopQueueConsumer } = require('./controllers/workshopReportSqs.controller');
const mongoose = require("mongoose");

// Import routes
const authRoutes = require("./routes/auth.routes");
const masterRoutes = require("./routes/master.routes");
const companyRoutes = require("./routes/company.routes");
const dropdownRoutes = require("./routes/dropdown.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const configRoutes = require("./routes/config.routes");
const inspectionRoutes = require("./routes/inspection.routes");
const tradeinRoutes = require("./routes/tradein.routes");
const mastervehicleRoutes = require("./routes/mastervehicle.routes");
const adpublishingRoutes = require("./routes/adpublishing.routes");
const docsRoutes = require("./routes/docs.routes");
const workshopRoutes = require("./routes/workshop.routes");
const workflowsRoutes = require("./routes/workflow.routes");
const workflowExcecutionRoutes = require("./routes/workflowExecution.routes");
const workshopReportRoutes = require("./routes/workshopReport.routes");
const supplierRoutes = require("./routes/supplier.routes");
const supplierAuthRoutes = require("./routes/supplierAuth.routes");
const supplierDashboardRoutes = require("./routes/supplierDashboard.routes");
const dealershipRoutes = require("./routes/dealership.routes");
const masterInspectionRoutes = require("./routes/masterInspection.routes");
const logsRoutes = require("./routes/logs.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const customModuleRoutes = require("./routes/customModule.routes");
const vehicleMetadataRoutes = require("./routes/vehicleMetadata.routes");
const socketRoutes = require("./routes/socketRoutes");
const commonVehicleRoutes = require("./routes/commonvehicle.routes");
const notificationConfigRoutes = require("./routes/notificationConfig.routes");
const notificationRoutes = require("./routes/notification.routes");
const integrationRoutes = require("./routes/integration.routes");
const serviceBayRoutes = require("./routes/serviceBay.routes");


const errorHandler = require("./middleware/error");
const notificationMiddleware = require("./middleware/notificationMiddleware");
const { logRequest } = require("./controllers/logs.controller");

// Connect to database
connectDB();

// Start CRON jobs
startSubscriptionCronJob();
startGlobalLogCleanupCron();
startNotificationCleanupCron();
// Start main vehicle processing queue consumer
// startQueueConsumer();

// Start workshop report processing queue consumer
// startWorkshopQueueConsumer();


const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
// app.use(cors({
//   origin: [
//     process.env.FRONTEND_URL || 'http://localhost:8080',
//     'http://localhost:8080',
//     'http://127.0.0.1:8080'
//   ],
//   credentials: true
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true }));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Compression middleware
app.use(compression());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("combined"));
}

// Custom logging middleware
app.use(logRequest);

// Notification middleware (apply to all routes)
app.use(notificationMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.io health check endpoint
app.get("/socket/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Socket.io endpoint is available",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/dropdown", dropdownRoutes);
app.use("/api/vehicle", vehicleRoutes);
app.use("/api/config", configRoutes);
app.use("/api/inspection", inspectionRoutes);
app.use("/api/tradein", tradeinRoutes);
app.use("/api/mastervehicle", mastervehicleRoutes);
app.use("/api/adpublishing", adpublishingRoutes);
app.use("/api/docs", docsRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/workshop", workshopRoutes);
app.use("/api/workflows", workflowsRoutes);
app.use("/api/workflow-execute", workflowExcecutionRoutes);
app.use("/api/workshop-report", workshopReportRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/supplier-auth", supplierAuthRoutes);
app.use("/api/supplier-dashboard", supplierDashboardRoutes);
app.use("/api/dealership", dealershipRoutes);
app.use("/api/master-inspection", masterInspectionRoutes);
app.use("/api/master/custom-modules", customModuleRoutes);
app.use("/api/master/vehicle-metadata", vehicleMetadataRoutes);
app.use("/api/socket_connection", socketRoutes);
app.use("/api/common-vehicle", commonVehicleRoutes);
app.use("/api/notification-config", notificationConfigRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/service-bay", serviceBayRoutes);


app.get("/api/health", async (req, res) => {
  try {
    const healthCheck = {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {},
    };

    // Check MongoDB connection
    try {
      const dbState = mongoose.connection.readyState;
      healthCheck.services.database = {
        status: dbState === 1 ? "connected" : "disconnected",
        state: dbState,
        stateName: getMongoDBStateName(dbState),
      };

      // Test a simple query if connected
      if (dbState === 1) {
        const User = require("./models/User");
        const GlobalLog = require("./models/GlobalLog");

        const userCount = await User.countDocuments();
        const logCount = await GlobalLog.countDocuments();
        healthCheck.services.database.userCount = userCount;
        healthCheck.services.database.logCount = logCount;
      }
    } catch (dbError) {
      healthCheck.services.database = {
        status: "error",
        error: dbError.message,
      };
    }

    // Add other service checks
    healthCheck.services.redis = { status: "not_implemented" };
    healthCheck.services.sqs = { status: "not_implemented" };

    // Overall status
    const allServicesHealthy = Object.values(healthCheck.services).every(
      (service) =>
        service.status === "connected" || service.status === "not_implemented"
    );

    if (!allServicesHealthy) {
      healthCheck.status = "degraded";
      return res.status(503).json(healthCheck);
    }

    res.status(200).json(healthCheck);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Internal server error during health check",
    });
  }
});

// Simple health check
app.get("/api/health/simple", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? "OK" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: isDbConnected,
      state: dbState,
      stateName: getMongoDBStateName(dbState),
    },
  });
});

// Basic health check for load balancers
app.get("/api/health/basic", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  if (isDbConnected) {
    res.status(200).send("OK");
  } else {
    res.status(503).send("Service Unavailable");
  }
});

// Helper function to get MongoDB connection state name
function getMongoDBStateName(state) {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };
  return states[state] || "unknown";
}

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
