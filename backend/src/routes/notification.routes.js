const express = require('express');
const router = express.Router();
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
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

// Notification operations
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/mark-multiple-read', markMultipleAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;