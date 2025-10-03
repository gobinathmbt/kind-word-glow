
const express = require('express');
const { protect } = require('../middleware/auth');
const { getApiDocs, getApiSpec } = require('../controllers/docs.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Documentation routes
router.get('/', getApiDocs);
router.get('/spec', getApiSpec);

module.exports = router;
