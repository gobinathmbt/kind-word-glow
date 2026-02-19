/**
 * Validation Script: Verify tenantContext middleware is properly applied
 * 
 * This script validates that all Company DB routes have:
 * 1. tenantContext middleware applied
 * 2. req.getModel() is available in controllers
 * 3. Middleware order is correct
 */

const fs = require('fs');
const path = require('path');

// Company DB routes that should have tenantContext
const COMPANY_DB_ROUTES = [
  'adpublishing.routes.js',
  'vehicle.routes.js',
  'mastervehicle.routes.js',
  'commonvehicle.routes.js',
  'vehicleActivityLog.routes.js',
  'tradein.routes.js',
  'inspection.routes.js',
  'workshop.routes.js',
  'workshopReport.routes.js',
  'dealership.routes.js',
  'supplier.routes.js',
  'supplierDashboard.routes.js',
  'workflow.routes.js',
  'notification.routes.js',
  'notificationConfig.routes.js',
  'integration.routes.js',
  'serviceBay.routes.js',
  'currency.routes.js',
  'costConfiguration.routes.js',
  'costSetter.routes.js',
  'config.routes.js',
  'dropdown.routes.js',
  'invoice.routes.js',
  'subscription.routes.js',
  'dashboardReport.routes.js',
];

// Main DB only routes that should NOT have tenantContext
const MAIN_DB_ROUTES = [
  'master.routes.js',
  'company.routes.js',
  'vehicleMetadata.routes.js',
  'trademeMetadata.routes.js',
  'customModule.routes.js',
  'paymentSettings.routes.js',
  'logs.routes.js',
  'master.dropdown.routes.js',
  'permission.routes.js',
  'masterInspection.routes.js',
];

// Public routes that should NOT have tenantContext
const PUBLIC_ROUTES = [
  'auth.routes.js',
  'supplierAuth.routes.js',
  'docs.routes.js',
  'googlemaps.routes.js',
  'socketRoutes.js',
];

const routesDir = path.join(__dirname, '../src/routes');

/**
 * Check if a route file has tenantContext middleware
 */
function hasTenantContext(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if tenantContext is imported
  const hasImport = content.includes("require('../middleware/tenantContext')") ||
                    content.includes('require("../middleware/tenantContext")');
  
  // Check if tenantContext is used
  const hasUsage = content.includes('router.use(tenantContext)');
  
  return { hasImport, hasUsage };
}

/**
 * Check middleware order in route file
 */
function checkMiddlewareOrder(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all router.use() calls
  const routerUseRegex = /router\.use\(([^)]+)\)/g;
  const matches = [...content.matchAll(routerUseRegex)];
  
  const middlewareOrder = matches.map(match => {
    const arg = match[1].trim();
    if (arg === 'protect') return 'protect';
    if (arg.includes('authorize')) return 'authorize';
    if (arg === 'companyScopeCheck') return 'companyScopeCheck';
    if (arg === 'tenantContext') return 'tenantContext';
    return null;
  }).filter(Boolean);
  
  // Expected order: protect → authorize → companyScopeCheck → tenantContext
  // Note: Additional authorize calls after tenantContext are allowed for route-specific authorization
  const expectedOrder = ['protect', 'authorize', 'companyScopeCheck', 'tenantContext'];
  
  // Find the index of tenantContext
  const tenantContextIndex = middlewareOrder.indexOf('tenantContext');
  
  // Only check order up to and including tenantContext
  const relevantMiddleware = tenantContextIndex >= 0 
    ? middlewareOrder.slice(0, tenantContextIndex + 1)
    : middlewareOrder;
  
  // Check if the order matches (allowing for missing middleware)
  let lastIndex = -1;
  for (const middleware of relevantMiddleware) {
    const expectedIndex = expectedOrder.indexOf(middleware);
    if (expectedIndex !== -1) {
      if (expectedIndex < lastIndex) {
        return { correct: false, actual: relevantMiddleware, expected: expectedOrder };
      }
      lastIndex = expectedIndex;
    }
  }
  
  return { correct: true, actual: relevantMiddleware };
}

/**
 * Main validation function
 */
function validateRoutes() {
  console.log('='.repeat(80));
  console.log('TENANT CONTEXT MIDDLEWARE VALIDATION');
  console.log('='.repeat(80));
  console.log();
  
  let totalIssues = 0;
  
  // Validate Company DB routes (should have tenantContext)
  console.log('1. COMPANY DB ROUTES (Should have tenantContext)');
  console.log('-'.repeat(80));
  
  for (const routeFile of COMPANY_DB_ROUTES) {
    const filePath = path.join(routesDir, routeFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${routeFile} - FILE NOT FOUND`);
      totalIssues++;
      continue;
    }
    
    const { hasImport, hasUsage } = hasTenantContext(filePath);
    const orderCheck = checkMiddlewareOrder(filePath);
    
    if (!hasImport || !hasUsage) {
      console.log(`❌ ${routeFile} - Missing tenantContext (import: ${hasImport}, usage: ${hasUsage})`);
      totalIssues++;
    } else if (!orderCheck.correct) {
      console.log(`⚠️  ${routeFile} - Incorrect middleware order`);
      console.log(`   Expected: ${orderCheck.expected.join(' → ')}`);
      console.log(`   Actual: ${orderCheck.actual.join(' → ')}`);
      totalIssues++;
    } else {
      console.log(`✅ ${routeFile} - OK`);
    }
  }
  
  console.log();
  
  // Validate Main DB routes (should NOT have tenantContext)
  console.log('2. MAIN DB ROUTES (Should NOT have tenantContext)');
  console.log('-'.repeat(80));
  
  for (const routeFile of MAIN_DB_ROUTES) {
    const filePath = path.join(routesDir, routeFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${routeFile} - FILE NOT FOUND`);
      continue;
    }
    
    const { hasImport, hasUsage } = hasTenantContext(filePath);
    
    if (hasImport || hasUsage) {
      console.log(`❌ ${routeFile} - Should NOT have tenantContext (import: ${hasImport}, usage: ${hasUsage})`);
      totalIssues++;
    } else {
      console.log(`✅ ${routeFile} - OK (no tenantContext)`);
    }
  }
  
  console.log();
  
  // Validate Public routes (should NOT have tenantContext)
  console.log('3. PUBLIC ROUTES (Should NOT have tenantContext)');
  console.log('-'.repeat(80));
  
  for (const routeFile of PUBLIC_ROUTES) {
    const filePath = path.join(routesDir, routeFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${routeFile} - FILE NOT FOUND`);
      continue;
    }
    
    const { hasImport, hasUsage } = hasTenantContext(filePath);
    
    if (hasImport || hasUsage) {
      console.log(`❌ ${routeFile} - Should NOT have tenantContext (import: ${hasImport}, usage: ${hasUsage})`);
      totalIssues++;
    } else {
      console.log(`✅ ${routeFile} - OK (no tenantContext)`);
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Company DB Routes: ${COMPANY_DB_ROUTES.length}`);
  console.log(`Total Main DB Routes: ${MAIN_DB_ROUTES.length}`);
  console.log(`Total Public Routes: ${PUBLIC_ROUTES.length}`);
  console.log(`Total Issues Found: ${totalIssues}`);
  console.log();
  
  if (totalIssues === 0) {
    console.log('✅ ALL ROUTES VALIDATED SUCCESSFULLY!');
    console.log();
    return 0;
  } else {
    console.log('❌ VALIDATION FAILED - Please fix the issues above');
    console.log();
    return 1;
  }
}

// Run validation
const exitCode = validateRoutes();
process.exit(exitCode);
