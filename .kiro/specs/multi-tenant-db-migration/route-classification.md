# Route Classification for Multi-Tenant DB Migration

## Summary
- **Total Routes:** 41
- **Company DB Routes (Need tenantContext):** 26 (1 already done, 25 remaining)
- **Main DB Only Routes (No tenantContext):** 10
- **Public Routes (No auth/tenantContext):** 5

---

## Company DB Routes (Need tenantContext Middleware)

These routes use Company DB models and require `tenantContext` middleware to be added after auth middleware.

### Status: ✅ Already Implemented (1)
1. **adpublishing.routes.js** - Already has tenantContext ✅

### Status: ⏳ Needs Implementation (25)

#### Vehicle-Related Routes (4)
2. **vehicle.routes.js** - Uses Vehicle, MasterVehicle models
3. **mastervehicle.routes.js** - Uses MasterVehicle model
4. **commonvehicle.routes.js** - Uses Vehicle, MasterVehicle models
5. **vehicleActivityLog.routes.js** - Uses VehicleActivityLog model

#### Trade-In and Inspection Routes (2)
6. **tradein.routes.js** - Uses TradeinConfig model
7. **inspection.routes.js** - Uses InspectionConfig model

#### Workshop Routes (2)
8. **workshop.routes.js** - Uses WorkshopQuote model
9. **workshopReport.routes.js** - Uses WorkshopReport model

#### Dealership and Supplier Routes (3)
10. **dealership.routes.js** - Uses Dealership model
11. **supplier.routes.js** - Uses Supplier model
12. **supplierDashboard.routes.js** - Uses Supplier, Vehicle models

#### Workflow and Notification Routes (4)
13. **workflow.routes.js** - Uses Workflow model
14. **workflowExecution.routes.js** - Uses WorkflowExecution model
15. **notification.routes.js** - Uses Notification model
16. **notificationConfig.routes.js** - Uses NotificationConfiguration model

#### Integration and Service Bay Routes (2)
17. **integration.routes.js** - Uses Integration model
18. **serviceBay.routes.js** - Uses ServiceBay model

#### Configuration Routes (4)
19. **currency.routes.js** - Uses Currency model
20. **costConfiguration.routes.js** - Uses CostConfiguration model
21. **costSetter.routes.js** - Uses CostConfiguration model
22. **config.routes.js** - Uses InspectionConfig, TradeinConfig models

#### Dropdown, Invoice, and Subscription Routes (3)
23. **dropdown.routes.js** - Uses DropdownMaster model
24. **invoice.routes.js** - Uses Invoice model
25. **subscription.routes.js** - Uses Subscriptions model

#### Dashboard Report Routes (1)
26. **dashboardReport.routes.js** - Uses multiple Company DB models

---

## Main DB Only Routes (No tenantContext Needed)

These routes only use Main DB models and should NOT have tenantContext middleware.

1. **master.routes.js** - Uses Company, Plan, MasterAdmin models (Main DB)
2. **company.routes.js** - Uses Company model (Main DB)
3. **vehicleMetadata.routes.js** - Uses VehicleMetadata, Make, Model, Body, Variant models (Main DB)
4. **trademeMetadata.routes.js** - Uses TrademeMetadata model (Main DB)
5. **customModule.routes.js** - Uses CustomModuleConfig model (Main DB)
6. **paymentSettings.routes.js** - Uses MasterAdmin model (Main DB)
7. **logs.routes.js** - Uses GlobalLog model (Main DB)
8. **master.dropdown.routes.js** - Uses MasterDropdown model (Main DB)
9. **permission.routes.js** - Uses Permission model (Main DB)
10. **masterInspection.routes.js** - Needs verification (likely Main DB)

---

## Public Routes (No Auth/TenantContext)

These routes are public and should NOT have any auth or tenantContext middleware.

1. **auth.routes.js** - Public authentication routes
2. **supplierAuth.routes.js** - Public supplier authentication routes
3. **docs.routes.js** - API documentation (public)
4. **googlemaps.routes.js** - Google Maps integration (public)
5. **socketRoutes.js** - WebSocket routes (public)

---

## Implementation Order

### Phase 1: Vehicle-Related Routes (Task 3.2)
- vehicle.routes.js
- mastervehicle.routes.js
- commonvehicle.routes.js
- vehicleActivityLog.routes.js

### Phase 2: Trade-In and Inspection Routes (Task 3.3)
- tradein.routes.js
- inspection.routes.js

### Phase 3: Workshop Routes (Task 3.4)
- workshop.routes.js
- workshopReport.routes.js

### Phase 4: Dealership and Supplier Routes (Task 3.5)
- dealership.routes.js
- supplier.routes.js
- supplierDashboard.routes.js

### Phase 5: Workflow and Notification Routes (Task 3.6)
- workflow.routes.js
- workflowExecution.routes.js
- notification.routes.js
- notificationConfig.routes.js

### Phase 6: Integration and Service Bay Routes (Task 3.7)
- integration.routes.js
- serviceBay.routes.js

### Phase 7: Configuration Routes (Task 3.8)
- currency.routes.js
- costConfiguration.routes.js
- costSetter.routes.js
- config.routes.js

### Phase 8: Dropdown, Invoice, and Subscription Routes (Task 3.9)
- dropdown.routes.js
- invoice.routes.js
- subscription.routes.js

### Phase 9: Dashboard Report Routes (Task 3.10)
- dashboardReport.routes.js

---

## Middleware Application Pattern

For Company DB routes, apply middleware in this order:

```javascript
const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');

const router = express.Router();

// Apply middleware in order
router.use(protect);                    // 1. Authenticate
router.use(authorize('role1', 'role2')); // 2. Authorize
router.use(companyScopeCheck);          // 3. Validate company access
router.use(tenantContext);              // 4. Attach DB connections & req.getModel()

// Routes...
```

---

## Notes

- **adpublishing.routes.js** is the reference implementation - all other Company DB routes should follow the same pattern
- Some routes may have specific routes that don't need tenantContext (e.g., public endpoints within the file)
- Always verify the controller to confirm which models are actually used
- Test each route after adding tenantContext to ensure req.getModel() is available
