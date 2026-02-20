const express = require('express');
const router = express.Router();
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getNotifications,
  markNotificationAsRead,
  markMultipleAsRead,
  markAllAsRead,
  getNotificationStats,
  deleteNotification,
  getUnreadCount
} = require('../controllers/notification.controller');

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Log all notification API calls
router.use((req, res, next) => {
  console.log('🔔 NOTIFICATION API CALLED:', {
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    user: req.user?.id,
    query: req.query
  });
  next();
});

// Notification operations
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/mark-multiple-read', markMultipleAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;