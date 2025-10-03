const express = require('express');
const { 
  getSupplierStats,
  getQuotesByStatus,
  startWork,
  submitWork,
  updateProfile,
  getsupplierS3Config
} = require('../controllers/supplierDashboard.controller');

const router = express.Router();

// Supplier auth middleware (to be implemented)
const protectSupplier = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // For now, decode the token and set supplier info
    // In production, verify JWT token properly
    const supplier = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    req.supplier = supplier;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Apply supplier auth middleware to all routes
router.use(protectSupplier);

// Dashboard routes
router.get('/stats', getSupplierStats);
router.get('/quotes/:status', getQuotesByStatus);
router.post('/quote/:quoteId/start-work', startWork);
router.post('/quote/:quoteId/submit-work', submitWork);
router.put('/profile', updateProfile);
router.get('/supplier_s3', getsupplierS3Config);

module.exports = router;