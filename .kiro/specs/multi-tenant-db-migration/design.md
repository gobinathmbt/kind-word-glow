# Multi-Tenant Database Migration - Design

## Architecture Overview

### Current State
```
┌─────────────────────────────────────────────────────────────┐
│                     Express Application                      │
├─────────────────────────────────────────────────────────────┤
│  Routes (Inconsistent middleware application)                │
│    ├─ adpublishing.routes.js ✅ Has tenantContext          │
│    └─ other routes ❌ Missing tenantContext                 │
├─────────────────────────────────────────────────────────────┤
│  Controllers (Mixed patterns)                                │
│    ├─ Unused imports shadowing req.getModel()              │
│    └─ Inconsistent Main DB vs Company DB access            │
├─────────────────────────────────────────────────────────────┤
│  Connection Manager                                          │
│    └─ ⚠️ activeRequests never decremented                   │
└─────────────────────────────────────────────────────────────┘
```

### Target State
```
┌─────────────────────────────────────────────────────────────┐
│                     Express Application                      │
├─────────────────────────────────────────────────────────────┤
│  Routes (Consistent middleware)                              │
│    └─ All routes with company DB → tenantContext           │
├─────────────────────────────────────────────────────────────┤
│  Controllers (Clean patterns)                                │
│    ├─ Main DB: const Model = require('../models/Model')    │
│    └─ Company DB: const Model = req.getModel('Model')      │
├─────────────────────────────────────────────────────────────┤
│  Connection Manager                                          │
│    └─ ✅ activeRequests properly tracked                    │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Connection Manager Enhancement

**File:** `backend/src/config/dbConnectionManager.js`

**Current Issue:**
```javascript
// activeRequests is incremented but never decremented
if (this.companyConnections.has(companyId)) {
  connectionInfo.activeRequests++; // ❌ Never goes down
  return connectionInfo.connection;
}
```

**Solution Design:**
Return a connection wrapper that tracks operation lifecycle:

```javascript
async getCompanyConnection(companyId) {
  // ... existing code ...
  
  if (this.companyConnections.has(companyId)) {
    const connectionInfo = this.companyConnections.get(companyId);
    connectionInfo.lastAccessed = new Date();
    connectionInfo.activeRequests++;
    this.connectionStats.cacheHits++;
    
    // Return wrapped connection that auto-decrements
    return this._wrapConnection(connectionInfo);
  }
  
  // ... rest of code ...
}

_wrapConnection(connectionInfo) {
  const originalConnection = connectionInfo.connection;
  
  // Create proxy that tracks operations
  return new Proxy(originalConnection, {
    get(target, prop) {
      const value = target[prop];
      
      // Wrap async methods to track completion
      if (typeof value === 'function' && 
          ['model', 'collection'].includes(prop)) {
        return function(...args) {
          const result = value.apply(target, args);
          
          // If it's a model, wrap its query methods
          if (prop === 'model' && result) {
            return wrapModel(result, connectionInfo);
          }
          
          return result;
        };
      }
      
      return value;
    }
  });
}
```

**Alternative Simpler Solution:**
Add a `releaseConnection()` method and call it in middleware cleanup:

```javascript
// In tenantContext middleware
async function tenantContext(req, res, next) {
  // ... existing code ...
  
  // Track connection for cleanup
  const companyId = req.user?.company_id;
  
  // Cleanup on response finish
  res.on('finish', () => {
    if (companyId) {
      connectionManager.decrementActiveRequests(companyId);
    }
  });
  
  next();
}

// In dbConnectionManager
decrementActiveRequests(companyId) {
  if (this.companyConnections.has(companyId)) {
    const connectionInfo = this.companyConnections.get(companyId);
    connectionInfo.activeRequests = Math.max(0, connectionInfo.activeRequests - 1);
  }
}
```

**Chosen Approach:** Simpler solution using response lifecycle hooks (easier to implement and maintain)

### 2. Model Registration Pattern

**File:** All model files in `backend/src/models/`

**Pattern for Main DB Models:**
```javascript
const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const UserSchema = new mongoose.Schema({
  // ... schema definition ...
});

// Register with ModelRegistry
ModelRegistry.registerModel('User', UserSchema, 'main');

// Export default model (bound to default connection)
module.exports = mongoose.model('User', UserSchema);
```

**Pattern for Company DB Models:**
```javascript
const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const VehicleSchema = new mongoose.Schema({
  // ... schema definition ...
});

// Register with ModelRegistry
ModelRegistry.registerModel('Vehicle', VehicleSchema, 'company');

// Export schema only (no default model - will be created per connection)
module.exports = VehicleSchema;
```

**Why Different Exports:**
- Main DB: Can export model because it uses single shared connection
- Company DB: Should export schema only to avoid confusion (models created dynamically)

### 3. Controller Pattern

**Pattern for Controllers Using Main DB Only:**
```javascript
// Top of file - direct requires
const User = require('../models/User');
const Company = require('../models/Company');
const MasterAdmin = require('../models/MasterAdmin');

const someController = async (req, res) => {
  // Use directly
  const user = await User.findById(req.user.id);
  const company = await Company.findById(req.user.company_id);
};
```

**Pattern for Controllers Using Company DB:**
```javascript
// Top of file - only Main DB requires
const User = require('../models/User');
const Company = require('../models/Company');

// NO require for company DB models!

const someController = async (req, res) => {
  // Get company DB models dynamically
  const Vehicle = req.getModel('Vehicle');
  const Dealership = req.getModel('Dealership');
  
  // Use Main DB models directly
  const company = await Company.findById(req.user.company_id);
  
  // Use Company DB models from req.getModel
  const vehicles = await Vehicle.find({ company_id: req.user.company_id });
};
```

**Pattern for Controllers Using Both:**
```javascript
// Top of file - Main DB only
const User = require('../models/User');
const Company = require('../models/Company');

const mixedController = async (req, res) => {
  // Main DB
  const user = await User.findById(req.user.id);
  
  // Company DB
  const Vehicle = req.getModel('Vehicle');
  const vehicles = await Vehicle.find({ company_id: req.user.company_id });
};
```

### 4. Route Middleware Pattern

**Pattern for Routes with Company DB Access:**
```javascript
const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');

const router = express.Router();

// Apply middleware in order
router.use(protect);                    // 1. Authenticate
router.use(authorize('role1', 'role2')); // 2. Authorize
router.use(companyScopeCheck);          // 3. Validate company access
router.use(tenantContext);              // 4. Attach DB connections

// Routes...
router.get('/', controller.getAll);
```

**Pattern for Routes with Main DB Only:**
```javascript
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
// NO tenantContext needed

const router = express.Router();

router.use(protect);
router.use(authorize('master_admin'));

// Routes...
router.get('/', controller.getAll);
```

**Pattern for Public Routes:**
```javascript
const express = require('express');
// NO middleware needed

const router = express.Router();

// Public routes
router.post('/login', controller.login);
router.post('/register', controller.register);
```

### 5. Middleware Pattern

**For Middlewares That Run Before Authentication:**
```javascript
// Can only use Main DB models with default connection
const GlobalLog = require('../models/GlobalLog');

async function someMiddleware(req, res, next) {
  // Use Main DB models directly
  await GlobalLog.create({ /* ... */ });
  next();
}
```

**For Middlewares That Run After tenantContext:**
```javascript
// Can use both patterns
const User = require('../models/User');

async function someMiddleware(req, res, next) {
  // Main DB
  const user = await User.findById(req.user.id);
  
  // Company DB (if req.getModel is available)
  if (req.getModel) {
    const Notification = req.getModel('Notification');
    await Notification.create({ /* ... */ });
  }
  
  next();
}
```

## Data Flow

### Request Flow with Multi-Tenant DB
```
1. Request arrives
   ↓
2. protect middleware
   - Validates JWT
   - Loads user
   - Sets req.user with company_id
   ↓
3. authorize middleware
   - Checks user role
   ↓
4. companyScopeCheck middleware
   - Validates company access
   ↓
5. tenantContext middleware
   - Gets/creates main DB connection → req.mainDb
   - Gets/creates company DB connection → req.companyDb
   - Attaches req.getModel() helper
   - Increments activeRequests
   ↓
6. Controller executes
   - Uses req.getModel() for company DB models
   - Uses direct require for main DB models
   ↓
7. Response sent
   ↓
8. Response 'finish' event
   - Decrements activeRequests
   - Connection returned to pool
```

## Implementation Strategy

### Phase 1: Fix activeRequests Tracking
**Files:** 1 file
- `backend/src/config/dbConnectionManager.js`
- `backend/src/middleware/tenantContext.js`

**Changes:**
1. Add `decrementActiveRequests()` method to connection manager
2. Add response lifecycle hook in tenantContext middleware
3. Add unit tests for tracking

**Risk:** Low - Isolated change
**Testing:** Monitor connection stats before/after

### Phase 2: Register All Models
**Files:** 41 model files

**Changes:**
1. Add `ModelRegistry.registerModel()` call to each model
2. Change Company DB models to export schema instead of model
3. Verify all models in registry

**Risk:** Low - Additive change
**Testing:** Verify registry has all 41 models

### Phase 3: Update All Routes
**Files:** ~30 route files

**Changes:**
1. Add `tenantContext` middleware to routes using company DB
2. Ensure correct middleware order
3. Document which routes need it

**Risk:** Medium - Could break routes if applied incorrectly
**Testing:** Test each route after update

### Phase 4: Update All Controllers
**Files:** ~40 controller files

**Changes:**
1. Remove unused model imports
2. Keep Main DB requires at top
3. Change Company DB to use req.getModel()
4. One controller at a time

**Risk:** High - Most changes, highest chance of bugs
**Testing:** Test each controller thoroughly

### Phase 5: Update Middlewares
**Files:** 5 middleware files

**Changes:**
1. Update to use correct pattern
2. Handle missing req.getModel gracefully

**Risk:** Medium - Middlewares affect all routes
**Testing:** Integration testing

### Phase 6: Update Utilities & Jobs
**Files:** ~6 files

**Changes:**
1. Update pattern in utilities
2. Update pattern in cron jobs

**Risk:** Low - Limited scope
**Testing:** Run jobs manually

### Phase 7: Validation & Testing
**Activities:**
1. Run full test suite
2. Manual testing of major features
3. Load testing for connection leaks
4. Monitor in staging environment

## Error Handling

### Connection Errors
```javascript
try {
  const Model = req.getModel('ModelName');
} catch (error) {
  if (error.statusCode === 400) {
    // Missing company context
    return res.status(400).json({
      success: false,
      message: 'Company context required'
    });
  }
  // Other errors
  return res.status(500).json({
    success: false,
    message: 'Database error'
  });
}
```

### Missing Middleware
```javascript
// In controller
if (!req.getModel) {
  throw new Error('tenantContext middleware not applied to this route');
}
```

## Monitoring & Observability

### Connection Stats Endpoint
```javascript
app.get('/api/health/connections', protect, authorize('master_admin'), (req, res) => {
  const stats = connectionManager.getConnectionStats();
  const modelStats = modelFactory.getCacheStats();
  
  res.json({
    connections: stats,
    models: modelStats,
    timestamp: new Date()
  });
});
```

### Metrics to Track
- Active company connections
- Cache hit/miss ratio
- Active requests per connection
- Connection creation rate
- Model cache size

## Rollback Plan

### If Issues Found in Phase 4+ (Controllers)
1. Revert specific controller file
2. Keep infrastructure changes (Phases 1-3)
3. Fix issue and retry

### If Critical Issues in Phase 1-3
1. Full rollback via git
2. Review design
3. Re-implement with fixes

## Success Metrics

### Code Quality
- Zero unused imports in controllers
- 100% model registration coverage
- Consistent pattern across all files

### Performance
- No increase in response times
- Connection pool utilization < 80%
- Cache hit ratio > 95%

### Reliability
- Zero connection leaks
- Zero "model not found" errors
- All tests passing

## Documentation Updates

### Developer Guide
- Document Main DB vs Company DB pattern
- Provide examples for each pattern
- Explain when to use each approach

### Architecture Docs
- Update architecture diagrams
- Document connection lifecycle
- Explain model registry

### Code Comments
- Add JSDoc to key functions
- Document middleware order requirements
- Explain req.getModel() usage
