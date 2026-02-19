# Multi-Tenant Database Migration - Tasks

## Phase 1: Fix activeRequests Tracking

### Task 1.1: Add decrementActiveRequests Method
- [x] 1.1.1 Add `decrementActiveRequests(companyId)` method to DatabaseConnectionManager
- [x] 1.1.2 Implement safe decrement logic (Math.max(0, count - 1))
- [x] 1.1.3 Add logging for debugging (development only)
- [x] 1.1.4 Update getConnectionStats() to reflect accurate counts

### Task 1.2: Update tenantContext Middleware
- [x] 1.2.1 Track company_id when connection is established
- [x] 1.2.2 Add response 'finish' event listener
- [x] 1.2.3 Call decrementActiveRequests on response finish
- [x] 1.2.4 Handle error cases (response 'close' event)
- [x] 1.2.5 Reduce logging verbosity (only log in development)

### Task 1.3: Test Connection Tracking
- [ ] 1.3.1 Write unit test for increment/decrement cycle
- [ ] 1.3.2 Test multiple concurrent requests
- [ ] 1.3.3 Test error scenarios
- [ ] 1.3.4 Verify LRU eviction uses correct counts
- [ ] 1.3.5 Manual testing with connection stats endpoint

## Phase 2: Register All Models

### Task 2.1: Verify Main DB Models (15 models)
- [x] 2.1.1 Body.js - Verify registration
- [x] 2.1.2 Company.js - Verify registration
- [x] 2.1.3 CustomModuleConfig.js - Verify registration
- [x] 2.1.4 GlobalLog.js - Verify registration
- [x] 2.1.5 Make.js - Verify registration
- [x] 2.1.6 MasterAdmin.js - Verify registration
- [x] 2.1.7 MasterDropdown.js - Verify registration
- [x] 2.1.8 Model.js - Verify registration
- [x] 2.1.9 Permission.js - Verify registration
- [x] 2.1.10 Plan.js - Verify registration
- [x] 2.1.11 TrademeMetadata.js - Verify registration
- [x] 2.1.12 User.js - Verify registration
- [x] 2.1.13 Variant.js - Verify registration
- [x] 2.1.14 VariantYear.js - Verify registration
- [x] 2.1.15 VehicleMetadata.js - Verify registration

### Task 2.2: Register Company DB Models (26 models)
- [x] 2.2.1 AdvertiseData.js - Add registration if missing
- [x] 2.2.2 AdvertiseVehicle.js - Add registration if missing
- [x] 2.2.3 Conversation.js - Add registration if missing
- [x] 2.2.4 CostConfiguration.js - Add registration if missing
- [x] 2.2.5 Currency.js - Add registration if missing
- [x] 2.2.6 Dealership.js - Add registration if missing
- [x] 2.2.7 DropdownMaster.js - Add registration if missing
- [x] 2.2.8 GroupPermission.js - Add registration if missing
- [x] 2.2.9 InspectionConfig.js - Add registration if missing
- [x] 2.2.10 Integration.js - Add registration if missing
- [x] 2.2.11 Invoice.js - Add registration if missing
- [x] 2.2.12 MasterVehicle.js - Add registration if missing
- [x] 2.2.13 Notification.js - Add registration if missing
- [x] 2.2.14 NotificationConfiguration.js - Add registration if missing
- [x] 2.2.15 ServiceBay.js - Add registration if missing
- [x] 2.2.16 Subscriptions.js - Add registration if missing
- [x] 2.2.17 Supplier.js - Add registration if missing
- [x] 2.2.18 TradeinConfig.js - Add registration if missing
- [x] 2.2.19 Vehicle.js - Add registration if missing
- [x] 2.2.20 VehicleActivityLog.js - Add registration if missing
- [x] 2.2.21 Workflow.js - Add registration if missing
- [x] 2.2.22 WorkflowExecution.js - Add registration if missing
- [x] 2.2.23 WorkshopQuote.js - Add registration if missing
- [x] 2.2.24 WorkshopReport.js - Add registration if missing

### Task 2.3: Validate Model Registry
- [ ] 2.3.1 Create validation script to check all models registered
- [ ] 2.3.2 Run validation script
- [ ] 2.3.3 Fix any missing registrations
- [ ] 2.3.4 Verify correct type (main vs company) for each model

## Phase 3: Update All Routes

### Task 3.1: Identify Routes Needing tenantContext
- [x] 3.1 Scan all route files and categorize by DB usage
  - [x] 3.1.1 List all route files in backend/src/routes directory
  - [x] 3.1.2 For each route file, identify which models are used in controllers
  - [x] 3.1.3 Categorize routes: Company DB (needs tenantContext), Main DB only, Public (no auth)
  - [x] 3.1.4 Document findings in a route classification list

### Task 3.2: Update Vehicle-Related Routes
- [x] 3.2 Add tenantContext middleware to vehicle routes
  - [x] 3.2.1 Update vehicle.routes.js - Add tenantContext after auth middleware
  - [x] 3.2.2 Update mastervehicle.routes.js - Add tenantContext after auth middleware
  - [x] 3.2.3 Update commonvehicle.routes.js - Add tenantContext after auth middleware
  - [x] 3.2.4 Update vehicleActivityLog.routes.js - Add tenantContext after auth middleware
  - [x] 3.2.5 Test vehicle routes to ensure req.getModel is available

### Task 3.3: Update Trade-In and Inspection Routes
- [x] 3.3 Add tenantContext middleware to trade-in and inspection routes
  - [x] 3.3.1 Update tradein.routes.js - Add tenantContext after auth middleware
  - [x] 3.3.2 Update inspection.routes.js - Add tenantContext after auth middleware
  - [x] 3.3.3 Test trade-in and inspection routes

### Task 3.4: Update Workshop Routes
- [x] 3.4 Add tenantContext middleware to workshop routes
  - [x] 3.4.1 Update workshop.routes.js - Add tenantContext after auth middleware
  - [x] 3.4.2 Update workshopReport.routes.js - Add tenantContext after auth middleware
  - [x] 3.4.3 Test workshop routes

### Task 3.5: Update Dealership and Supplier Routes
- [x] 3.5 Add tenantContext middleware to dealership and supplier routes
  - [x] 3.5.1 Update dealership.routes.js - Add tenantContext after auth middleware
  - [x] 3.5.2 Update supplier.routes.js - Add tenantContext after auth middleware
  - [x] 3.5.3 Update supplierDashboard.routes.js - Add tenantContext after auth middleware
  - [x] 3.5.4 Test dealership and supplier routes

### Task 3.6: Update Workflow and Notification Routes
- [x] 3.6 Add tenantContext middleware to workflow and notification routes
  - [x] 3.6.1 Update workflow.routes.js - Add tenantContext after auth middleware
  - [x] 3.6.2 Update notification.routes.js - Add tenantContext after auth middleware
  - [x] 3.6.3 Update notificationConfig.routes.js - Add tenantContext after auth middleware
  - [x] 3.6.4 Test workflow and notification routes

### Task 3.7: Update Integration and Service Bay Routes
- [x] 3.7 Add tenantContext middleware to integration and service bay routes
  - [x] 3.7.1 Update integration.routes.js - Add tenantContext after auth middleware
  - [x] 3.7.2 Update serviceBay.routes.js - Add tenantContext after auth middleware
  - [x] 3.7.3 Test integration and service bay routes

### Task 3.8: Update Configuration Routes
- [x] 3.8 Add tenantContext middleware to configuration routes
  - [x] 3.8.1 Update currency.routes.js - Add tenantContext after auth middleware
  - [x] 3.8.2 Update costConfiguration.routes.js - Add tenantContext after auth middleware
  - [x] 3.8.3 Update costSetter.routes.js - Add tenantContext after auth middleware
  - [x] 3.8.4 Update config.routes.js - Add tenantContext after auth middleware
  - [x] 3.8.5 Test configuration routes

### Task 3.9: Update Dropdown, Invoice, and Subscription Routes
- [x] 3.9 Add tenantContext middleware to dropdown, invoice, and subscription routes
  - [x] 3.9.1 Update dropdown.routes.js - Add tenantContext after auth middleware
  - [x] 3.9.2 Update invoice.routes.js - Add tenantContext after auth middleware
  - [x] 3.9.3 Update subscription.routes.js - Add tenantContext after auth middleware
  - [x] 3.9.4 Test dropdown, invoice, and subscription routes

### Task 3.10: Update Dashboard Report Routes
- [x] 3.10 Add tenantContext middleware to dashboard report routes
  - [x] 3.10.1 Update dashboardReport.routes.js - Add tenantContext after auth middleware
  - [x] 3.10.2 Test dashboard report routes

### Task 3.11: Verify Public Routes (No tenantContext Needed)
- [x] 3.11 Verify public routes do not have tenantContext
  - [x] 3.11.1 Verify auth.routes.js - Public routes, confirm no tenantContext
  - [x] 3.11.2 Verify supplierAuth.routes.js - Public routes, confirm no tenantContext
  - [x] 3.11.3 Verify docs.routes.js - Check if public or needs tenantContext
  - [x] 3.11.4 Document public routes that should remain without tenantContext

### Task 3.12: Verify Main DB Only Routes (No tenantContext Needed)
- [x] 3.12 Verify Main DB only routes do not have tenantContext
  - [x] 3.12.1 Verify master.routes.js - Main DB only, confirm no tenantContext
  - [x] 3.12.2 Verify company.routes.js - Main DB only, confirm no tenantContext
  - [x] 3.12.3 Verify vehicleMetadata.routes.js - Main DB only, confirm no tenantContext
  - [x] 3.12.4 Verify trademeMetadata.routes.js - Main DB only, confirm no tenantContext
  - [x] 3.12.5 Verify customModule.routes.js - Main DB only, confirm no tenantContext
  - [x] 3.12.6 Verify paymentSettings.routes.js - Main DB only, confirm no tenantContext
  - [x] 3.12.7 Verify logs.routes.js - Main DB only, confirm no tenantContext
  - [x] 3.12.8 Document Main DB only routes

### Task 3.13: Final Route Validation
- [x] 3.13 Validate all route updates
  - [x] 3.13.1 Run diagnostics on all updated route files
  - [x] 3.13.2 Verify middleware order: protect → authorize → companyScopeCheck → tenantContext
  - [x] 3.13.3 Create test script to verify req.getModel is available in all company DB routes
  - [x] 3.13.4 Document any routes that need special handling



## Phase 4: Update All Controllers

### Task 4.1: Update Advertisement Controllers
- [x] 4.1.1 adpublishing.controller.js - Remove unused imports, use req.getModel
- [x] 4.1.2 advertisement.controller.js - Remove unused imports, use req.getModel

### Task 4.2: Update Vehicle Controllers
- [x] 4.2.1 vehicle.controller.js - Remove unused imports, use req.getModel
- [x] 4.2.2 mastervehicle.controller.js - Remove unused imports, use req.getModel
- [x] 4.2.3 commonvehicle.controller.js - Remove unused imports, use req.getModel
- [x] 4.2.4 vehicleActivityLog.controller.js - Update pattern
- [x] 4.2.5 vehicleMetadata.controller.js - Main DB only, verify pattern

### Task 4.3: Update Workshop Controllers
- [x] 4.3.1 workshop.controller.js - Remove unused imports, use req.getModel
- [x] 4.3.2 workshopReport.controller.js - Remove unused imports, use req.getModel
- [x] 4.3.3 workshopReportSqs.controller.js - Update pattern

### Task 4.4: Update Configuration Controllers
- [x] 4.4.1 config.controller.js - Remove unused imports, use req.getModel
- [x] 4.4.2 inspection.controller.js - Remove unused imports, use req.getModel
- [x] 4.4.3 tradein.controller.js - Remove unused imports, use req.getModel
- [x] 4.4.4 costConfiguration.controller.js - Remove unused imports, use req.getModel
- [x] 4.4.5 costSetter.controller.js - Remove unused imports, use req.getModel
- [x] 4.4.6 notificationConfig.controller.js - Remove unused imports, use req.getModel

### Task 4.5: Update Master/Admin Controllers
- [x] 4.5.1 master.controller.js - Main DB only, verify pattern
- [x] 4.5.2 company.controller.js - Mixed, update pattern
- [x] 4.5.3 auth.controller.js - Main DB only, verify pattern
- [x] 4.5.4 masterInspection.controller.js - Update pattern
- [x] 4.5.5 customModule.controller.js - Main DB only, verify pattern

### Task 4.6: Update Supplier Controllers
- [x] 4.6.1 supplier.controller.js - Remove unused imports, use req.getModel
- [x] 4.6.2 supplierAuth.controller.js - Update pattern
- [x] 4.6.3 supplierDashboard.controller.js - Remove unused imports, use req.getModel

### Task 4.7: Update Other Controllers
- [x] 4.7.1 dealership.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.2 dropdown.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.3 masterDropdown.controller.js - Main DB only, verify pattern
- [x] 4.7.4 workflow.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.5 notification.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.6 integration.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.7 serviceBay.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.8 currency.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.9 invoice.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.10 subscription.controller.js - Update pattern
- [x] 4.7.11 logs.controller.js - Main DB only, verify pattern
- [x] 4.7.12 docs.controller.js - Update pattern
- [x] 4.7.13 sqs.controller.js - Update pattern
- [x] 4.7.14 socket.controller.js - Update pattern
- [x] 4.7.15 groupPermission.controller.js - Remove unused imports, use req.getModel
- [x] 4.7.16 userPermission.controller.js - Update pattern
- [x] 4.7.17 permission.controller.js - Main DB only, verify pattern
- [x] 4.7.18 paymentSettings.controller.js - Main DB only, verify pattern
- [x] 4.7.19 trademeMetadata.controller.js - Main DB only, verify pattern
- [x] 4.7.20 dashboardReport.controller.js - Update pattern

### Task 4.8: Update Report Controllers
- [x] 4.8.1 reports/conversation.report.controller.js - Update pattern
- [x] 4.8.2 reports/costConfiguration.report.controller.js - Update pattern
- [x] 4.8.3 reports/dealership.report.controller.js - Update pattern
- [x] 4.8.4 reports/dropdownMaster.report.controller.js - Update pattern
- [x] 4.8.5 reports/groupPermission.report.controller.js - Update pattern
- [x] 4.8.6 reports/inspectionConfig.report.controller.js - Update pattern
- [x] 4.8.7 reports/integration.report.controller.js - Update pattern
- [x] 4.8.8 reports/notificationConfig.report.controller.js - Update pattern
- [x] 4.8.9 reports/serviceBay.report.controller.js - Update pattern
- [x] 4.8.10 reports/supplier.report.controller.js - Update pattern
- [x] 4.8.11 reports/tradeinConfig.report.controller.js - Update pattern
- [x] 4.8.12 reports/user.report.controller.js - Update pattern
- [x] 4.8.13 reports/vehicle.report.controller.js - Update pattern
- [x] 4.8.14 reports/workflow.report.controller.js - Update pattern
- [x] 4.8.15 reports/workshopQuote.report.controller.js - Update pattern
- [x] 4.8.16 reports/workshopReport.report.controller.js - Update pattern

## Phase 5: Update Middlewares

### Task 5.1: Update Auth Middleware
- [x] 5.1.1 auth.js - Verify Main DB pattern (User, MasterAdmin)
- [x] 5.1.2 Test authentication flow by running getDiagnostics
- [x] 5.1.3 Verify no breaking changes

### Task 5.2: Update Workflow Middlewares
- [x] 5.2.1 outboundWorkflowMiddleware.js - Update to use req.getModel for company DB
- [x] 5.2.2 emailTriggerMiddleware.js - Update to use req.getModel for company DB
- [x] 5.2.3 Test workflow execution
- [x] 5.2.4 Handle cases where req.getModel not available

### Task 5.3: Update Notification Middleware
- [x] 5.3.1 notificationMiddleware.js - Update to use req.getModel for company DB
- [x] 5.3.2 Handle cases where req.getModel not available
- [x] 5.3.3 Test notification creation

### Task 5.4: Update Module Access Middleware
- [x] 5.4.1 moduleAccess.js - Verify Main DB pattern
- [x] 5.4.2 Test module access checks

### Task 5.5: Update Tenant Context Middleware
- [x] 5.5.1 tenantContext.js - Already updated in Phase 1
- [x] 5.5.2 Verify all changes working correctly

## Phase 6: Update Utilities & Services

### Task 6.1: Update Utilities
- [x] 6.1.1 email.utils.js - Verify Main DB pattern (User)
- [x] 6.1.2 Test email sending functionality with getDiagnostics

### Task 6.2: Update Services
- [x] 6.2.1 trademeMapping.service.js - Verify Main DB pattern (TrademeMetadata)
- [x] 6.2.2 activityLogging.service.js - Check if needs update
- [x] 6.2.3 Test service functionality

### Task 6.3: Update Cron Jobs
- [x] 6.3.1 globalLogsCron.js - Verify Main DB pattern (GlobalLog)
- [x] 6.3.2 notificationCleanupCron.js - Update to use proper connection
- [x] 6.3.3 subscriptionCron.js - Verify Main DB pattern (Company)
- [x] 6.3.4 workflowExecutionCleanupCron.js - Update to use proper connection
- [x] 6.3.5 Test each cron job with getDiagnostics
- [x] 6.3.4 workflowExecutionCleanupCron.js - Update to use proper connection
- [x] 6.3.5 Test each cron job manually

## Phase 7: Validation & Testing

### Task 7.1: Code Validation
- [ ] 7.1.1 Run linter on all changed files
- [ ] 7.1.2 Check for any remaining unused imports
- [ ] 7.1.3 Verify all company DB models use req.getModel
- [ ] 7.1.4 Verify all main DB models use direct require

### Task 7.2: Unit Testing
- [ ] 7.2.1 Run existing unit tests
- [ ] 7.2.2 Fix any broken tests
- [ ] 7.2.3 Add tests for activeRequests tracking
- [ ] 7.2.4 Add tests for model registry

### Task 7.3: Integration Testing
- [ ] 7.3.1 Test authentication flow
- [ ] 7.3.2 Test vehicle CRUD operations
- [ ] 7.3.3 Test workshop quote flow
- [ ] 7.3.4 Test notification creation
- [ ] 7.3.5 Test workflow execution
- [ ] 7.3.6 Test multi-company isolation

### Task 7.4: Performance Testing
- [ ] 7.4.1 Benchmark connection retrieval times
- [ ] 7.4.2 Benchmark model instantiation times
- [ ] 7.4.3 Load test with multiple companies
- [ ] 7.4.4 Monitor connection pool usage
- [ ] 7.4.5 Check for memory leaks

### Task 7.5: Connection Leak Testing
- [ ] 7.5.1 Monitor activeRequests over time
- [ ] 7.5.2 Test with sustained load
- [ ] 7.5.3 Verify connections are released
- [ ] 7.5.4 Check LRU eviction works correctly

### Task 7.6: Manual Testing
- [ ] 7.6.1 Test all major user flows
- [ ] 7.6.2 Test as different user roles
- [ ] 7.6.3 Test with multiple companies
- [ ] 7.6.4 Test error scenarios

### Task 7.7: Documentation
- [ ] 7.7.1 Update developer guide with patterns
- [ ] 7.7.2 Document Main DB vs Company DB usage
- [ ] 7.7.3 Add examples to README
- [ ] 7.7.4 Update architecture diagrams
- [ ] 7.7.5 Document middleware order requirements

### Task 7.8: Final Validation
- [ ] 7.8.1 Review all changes
- [ ] 7.8.2 Verify all acceptance criteria met
- [ ] 7.8.3 Get code review approval
- [ ] 7.8.4 Deploy to staging
- [ ] 7.8.5 Monitor staging for issues
- [ ] 7.8.6 Prepare production deployment plan

## Summary
- **Total Tasks:** 200+
- **Estimated Time:** 3-5 days
- **Priority:** High
- **Risk Level:** Medium-High (many changes across codebase)
