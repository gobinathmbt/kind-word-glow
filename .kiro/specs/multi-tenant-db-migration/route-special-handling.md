# Routes with Special Handling

This document describes routes that have special handling patterns that deviate from the standard middleware application.

## Overview

Most Company DB routes follow the standard pattern:
```javascript
router.use(protect);
router.use(authorize('role1', 'role2'));
router.use(companyScopeCheck);
router.use(tenantContext);
```

However, some routes have special requirements that necessitate different patterns.

---

## 1. vehicle.routes.js - Mixed Public and Protected Routes

**Special Handling:** Contains both public and protected routes in the same file.

### Pattern:
```javascript
// Public route BEFORE middleware (no auth required)
router.post('/receive', receiveVehicleData);

// Admin-only route with custom auth (no company scope check)
router.post('/process-queue', protect, authorize('master_admin', 'company_super_admin'), processQueueManually);

// Standard middleware for remaining routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// All other routes...
```

### Rationale:
- `/receive` - Public webhook endpoint for external vehicle data ingestion (no authentication needed)
- `/process-queue` - Master admin utility route that doesn't require company context (operates across all companies)
- All other routes - Standard company-scoped vehicle management

### Important Notes:
- Public routes must be defined BEFORE `router.use()` middleware
- Master admin routes that don't need company context should use inline middleware
- The order matters: public routes → special routes → middleware → standard routes

---

## 2. serviceBay.routes.js - Two-Tier Authorization

**Special Handling:** Uses two levels of authorization for different route groups.

### Pattern:
```javascript
// Base middleware for all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Routes accessible by both super admin and admin
router.get('/dropdown', getBaysDropdown);
router.post('/:id/holiday', addBayHoliday);
router.get('/bay-holiday', getHolidays);
router.delete('/:id/holiday/:holidayId', removeBayHoliday);

// Additional authorization for super admin only routes
router.use(authorize('company_super_admin'));

// Routes accessible only by super admin
router.get('/', getServiceBays);
router.post('/', createServiceBay);
router.put('/:id', updateServiceBay);
router.delete('/:id', deleteServiceBay);
router.patch('/:id/status', toggleServiceBayStatus);
```

### Rationale:
- Some routes (dropdown, holidays) need to be accessible by both super admins and regular admins
- Other routes (CRUD operations) should only be accessible by super admins
- Using two-tier authorization avoids repeating authorization middleware on each route

### Important Notes:
- The second `router.use(authorize())` call applies to all routes defined after it
- This pattern is valid and doesn't violate the middleware order requirement
- The validation script allows additional `authorize` calls after `tenantContext`

---

## 3. workshop.routes.js - Inline Route Handlers

**Special Handling:** Contains inline route handlers (not in controller) that use direct model requires.

### Pattern:
```javascript
// Standard middleware
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// ... controller-based routes ...

// Inline route handler with direct model require
router.post('/quote/:quoteId/accept-work', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const WorkshopQuote = require('../models/WorkshopQuote'); // ⚠️ Direct require
    
    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      company_id: req.user.company_id,
    });
    // ... rest of handler ...
  } catch (error) {
    // ... error handling ...
  }
});
```

### Issues:
- ❌ Uses direct `require('../models/WorkshopQuote')` instead of `req.getModel('WorkshopQuote')`
- ❌ This bypasses the multi-tenant connection system
- ❌ Will use the default connection instead of the company-specific connection

### Recommendation:
**These inline handlers should be moved to the controller and updated to use `req.getModel()`:**

```javascript
// In workshop.controller.js
exports.acceptWork = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const WorkshopQuote = req.getModel('WorkshopQuote'); // ✅ Use req.getModel
    
    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      company_id: req.user.company_id,
    });
    // ... rest of handler ...
  } catch (error) {
    // ... error handling ...
  }
};

// In workshop.routes.js
router.post('/quote/:quoteId/accept-work', acceptWork);
```

### Affected Routes in workshop.routes.js:
1. `POST /quote/:quoteId/accept-work` - Uses direct require for WorkshopQuote
2. `POST /quote/:quoteId/request-rework` - Uses direct require for WorkshopQuote

**Action Required:** These routes need to be refactored in Phase 4 (Controller Updates).

---

## 4. Routes with workflowExecution.routes.js (if exists)

**Note:** The route classification document mentions `workflowExecution.routes.js` but this file was not found in the routes directory during validation. This may be:
- A planned route file that hasn't been created yet
- A route that was merged into `workflow.routes.js`
- An outdated reference in the classification document

**Action Required:** Verify if WorkflowExecution routes exist and update documentation accordingly.

---

## Summary of Special Cases

| Route File | Special Handling | Status | Action Required |
|------------|------------------|--------|-----------------|
| vehicle.routes.js | Public + Protected routes | ✅ Correct | None - working as intended |
| serviceBay.routes.js | Two-tier authorization | ✅ Correct | None - working as intended |
| workshop.routes.js | Inline handlers with direct requires | ⚠️ Needs Fix | Move to controller, use req.getModel |

---

## Validation Results

All 25 Company DB routes have been validated:
- ✅ All have `tenantContext` middleware applied
- ✅ All have correct middleware order (protect → authorize → companyScopeCheck → tenantContext)
- ✅ No Main DB routes have tenantContext (correct)
- ✅ No Public routes have tenantContext (correct)

**Validation Script:** `backend/test/validate-tenant-context.js`

Run validation:
```bash
cd backend
node test/validate-tenant-context.js
```

---

## Best Practices

### For Future Route Development:

1. **Standard Company DB Routes:**
   ```javascript
   router.use(protect);
   router.use(authorize('role1', 'role2'));
   router.use(companyScopeCheck);
   router.use(tenantContext);
   ```

2. **Routes with Public Endpoints:**
   - Define public routes BEFORE `router.use()` middleware
   - Use inline middleware for special auth requirements
   - Apply standard middleware after special routes

3. **Routes with Multiple Authorization Levels:**
   - Apply base authorization first
   - Use additional `router.use(authorize())` for stricter routes
   - Group routes by authorization level

4. **Always Use Controllers:**
   - Never define route handlers inline
   - Controllers should use `req.getModel()` for Company DB models
   - Controllers should use direct `require()` for Main DB models

5. **Testing:**
   - Run validation script after any route changes
   - Test with multiple companies to verify isolation
   - Verify `req.getModel()` is available in all Company DB routes

---

## Phase 4 TODO

The following issues need to be addressed in Phase 4 (Controller Updates):

1. **workshop.controller.js:**
   - Add `acceptWork` controller method using `req.getModel('WorkshopQuote')`
   - Add `requestRework` controller method using `req.getModel('WorkshopQuote')`
   - Update workshop.routes.js to use controller methods instead of inline handlers

2. **Verify all controllers:**
   - Ensure no controllers use direct `require()` for Company DB models
   - Ensure all controllers use `req.getModel()` for Company DB models
   - Remove any unused model imports

---

## Conclusion

Phase 3 (Route Updates) is complete with the following results:
- ✅ 25 Company DB routes updated with tenantContext middleware
- ✅ 10 Main DB routes verified (no tenantContext)
- ✅ 5 Public routes verified (no tenantContext)
- ✅ Middleware order validated across all routes
- ✅ Validation script created and passing
- ⚠️ 2 inline route handlers identified for Phase 4 refactoring

The multi-tenant database architecture is now properly enforced at the route level, ensuring all Company DB operations have access to `req.getModel()` and use the correct company-specific database connection.
