# Multi-Tenant Database Migration - Requirements

## Overview
Migrate the entire backend codebase to properly support multi-tenant database architecture by ensuring all models, routes, controllers, and middlewares correctly use either direct imports (Main DB) or `req.getModel()` (Company DB) based on the model registry classification.

## Feature Name
`multi-tenant-db-migration`

## Background
The application currently has a partial multi-tenant implementation where:
- Main DB models (shared across companies) should use direct `require()` imports
- Company DB models (isolated per company) should use `req.getModel()` for dynamic connection binding
- Only `adpublishing.routes.js` currently implements the `tenantContext` middleware
- Many controllers have unused model imports that shadow the correct `req.getModel()` usage
- The `activeRequests` tracking in connection manager is not properly decremented

## Goals
1. Fix `activeRequests` tracking in database connection manager
2. Remove all unused model imports from controllers
3. Register all models with the ModelRegistry
4. Update all routes to include `tenantContext` middleware where needed
5. Update all controllers to use correct pattern (direct require for Main DB, req.getModel for Company DB)
6. Update all middlewares to use correct pattern
7. Ensure consistent multi-tenant database access across the entire application

## User Stories

### 1. Connection Management
**As a** system administrator  
**I want** accurate connection tracking and proper resource cleanup  
**So that** the application doesn't leak connections or exhaust database resources

**Acceptance Criteria:**
- 1.1 `activeRequests` counter is incremented when a connection is retrieved
- 1.2 `activeRequests` counter is decremented when database operations complete
- 1.3 LRU eviction considers actual active request counts
- 1.4 Connection statistics accurately reflect current usage
- 1.5 No connection leaks occur during normal operation

### 2. Model Registry Completeness
**As a** developer  
**I want** all models registered in the ModelRegistry  
**So that** `req.getModel()` works for all company-specific models

**Acceptance Criteria:**
- 2.1 All Main DB models are registered with type 'main'
- 2.2 All Company DB models are registered with type 'company'
- 2.3 Model registration happens at module load time
- 2.4 Registry validation prevents duplicate registrations
- 2.5 All 41 models are properly categorized and registered

### 3. Controller Code Cleanup
**As a** developer  
**I want** clean controller code without unused imports  
**So that** the codebase is maintainable and the correct pattern is obvious

**Acceptance Criteria:**
- 3.1 No unused model imports at the top of controller files
- 3.2 Main DB models use direct `require()` at file top
- 3.3 Company DB models use `req.getModel()` inside functions
- 3.4 No shadowing of imports (same variable name used for require and getModel)
- 3.5 All controllers follow consistent pattern

### 4. Route Middleware Application
**As a** developer  
**I want** `tenantContext` middleware applied to all routes that need company DB access  
**So that** `req.getModel()` is available and connections are properly established

**Acceptance Criteria:**
- 4.1 All routes using company DB models have `tenantContext` middleware
- 4.2 Middleware is applied in correct order: protect → authorize → companyScopeCheck → tenantContext
- 4.3 Public routes (auth, health checks) skip tenantContext appropriately
- 4.4 Master admin routes that don't need company context skip tenantContext
- 4.5 All route files are consistent in middleware application

### 5. Middleware Pattern Compliance
**As a** developer  
**I want** all middlewares to use the correct model access pattern  
**So that** middleware code is consistent with the multi-tenant architecture

**Acceptance Criteria:**
- 5.1 Middlewares use direct require for Main DB models
- 5.2 Middlewares use `req.getModel()` for Company DB models when available
- 5.3 Middlewares handle cases where `req.getModel()` is not available (unauthenticated requests)
- 5.4 Error handling is consistent across all middlewares
- 5.5 No middleware breaks due to missing tenant context

## Model Classification

### Main DB Models (15 models - Use direct `require()`)
1. Body
2. Company
3. CustomModuleConfig
4. GlobalLog
5. Make
6. MasterAdmin
7. MasterDropdown
8. Model
9. Permission
10. Plan
11. TrademeMetadata
12. User
13. Variant
14. VariantYear
15. VehicleMetadata

### Company DB Models (26 models - Use `req.getModel()`)
1. AdvertiseData
2. AdvertiseVehicle
3. Conversation
4. CostConfiguration
5. Currency
6. Dealership
7. DropdownMaster
8. GroupPermission
9. InspectionConfig
10. Integration
11. Invoice
12. MasterVehicle
13. Notification
14. NotificationConfiguration
15. ServiceBay
16. Subscriptions
17. Supplier
18. TradeinConfig
19. Vehicle
20. VehicleActivityLog
21. Workflow
22. WorkflowExecution
23. WorkshopQuote
24. WorkshopReport

## Files Requiring Changes

### Core Infrastructure (Priority 1)
- `backend/src/config/dbConnectionManager.js` - Fix activeRequests tracking
- `backend/src/models/modelRegistry.js` - Verify all models registered
- `backend/src/middleware/tenantContext.js` - Reduce logging verbosity

### Models (Priority 2) - 41 files
All model files need to ensure they call `ModelRegistry.registerModel()` with correct type

### Routes (Priority 3) - ~30 route files
All route files need `tenantContext` middleware where company DB models are used

### Controllers (Priority 4) - ~40 controller files
All controllers need pattern compliance:
- Remove unused imports
- Use direct require for Main DB
- Use req.getModel for Company DB

### Middlewares (Priority 5) - 5 middleware files
- `backend/src/middleware/auth.js`
- `backend/src/middleware/emailTriggerMiddleware.js`
- `backend/src/middleware/moduleAccess.js`
- `backend/src/middleware/notificationMiddleware.js`
- `backend/src/middleware/outboundWorkflowMiddleware.js`

### Utilities & Services (Priority 6)
- `backend/src/utils/email.utils.js`
- `backend/src/services/trademeMapping.service.js`

### Jobs/Cron (Priority 7)
- `backend/src/jobs/globalLogsCron.js`
- `backend/src/jobs/notificationCleanupCron.js`
- `backend/src/jobs/subscriptionCron.js`
- `backend/src/jobs/workflowExecutionCleanupCron.js`

## Non-Functional Requirements

### Performance
- NFR-1: Connection retrieval should remain under 1ms for cached connections
- NFR-2: Model instantiation should remain under 1ms for cached models
- NFR-3: No performance degradation from activeRequests tracking

### Reliability
- NFR-4: No connection leaks under normal operation
- NFR-5: Proper error handling for all database operations
- NFR-6: Graceful degradation when connections fail

### Maintainability
- NFR-7: Consistent code patterns across all files
- NFR-8: Clear separation between Main DB and Company DB model usage
- NFR-9: Self-documenting code through consistent patterns

## Success Criteria
- All 41 models are registered in ModelRegistry
- All controllers follow the correct pattern (no unused imports)
- All routes using company DB have tenantContext middleware
- activeRequests tracking works correctly
- No connection leaks in production
- All existing tests pass
- Code is cleaner and more maintainable

## Out of Scope
- Changing the database architecture itself
- Adding new models or features
- Performance optimization beyond fixing activeRequests
- Adding new middleware functionality
- Changing authentication/authorization logic

## Dependencies
- Existing ModelRegistry implementation
- Existing tenantContext middleware
- Existing dbConnectionManager
- Mongoose connection pooling

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing functionality | High | Medium | Thorough testing after each phase |
| Missing model registrations | Medium | Low | Automated validation script |
| Incorrect model classification | High | Low | Review against modelRegistry.js |
| Performance degradation | Medium | Low | Benchmark before/after |
| Connection leaks | High | Medium | Monitor connection stats in staging |

## Testing Strategy
- Unit tests for activeRequests tracking
- Integration tests for model access patterns
- Manual testing of all major features
- Connection leak testing under load
- Verify all routes work with tenantContext

## Rollout Plan
1. Phase 1: Fix activeRequests tracking (isolated change)
2. Phase 2: Register all models (low risk)
3. Phase 3: Update all routes (medium risk)
4. Phase 4: Update all controllers (high risk - do one by one)
5. Phase 5: Update middlewares (medium risk)
6. Phase 6: Update utilities and jobs (low risk)
7. Phase 7: Final testing and validation
