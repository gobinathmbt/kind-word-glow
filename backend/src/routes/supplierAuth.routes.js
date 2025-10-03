const express = require('express');
const jwt = require('jsonwebtoken');
const {
  supplierLogin,
  getSupplierVehicles,
  getSupplierVehicleDetails,
  submitSupplierResponse,
  getSupplierProfile
} = require('../controllers/supplierAuth.controller');
const Env_Configuration = require('../config/env');

const router = express.Router();

// Supplier authentication middleware
const protectSupplier = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    const decoded = jwt.verify(token, Env_Configuration.JWT_SECRET || 'your-secret-key');
    req.supplier = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

// Public routes
router.post('/login', supplierLogin);

// Protected supplier routes
router.use(protectSupplier);
router.get('/profile', getSupplierProfile);
router.get('/vehicles', getSupplierVehicles);
router.get('/vehicle/:vehicleStockId/:vehicleType', getSupplierVehicleDetails);
router.post('/quote/:quoteId/respond', submitSupplierResponse);
router.patch('/quote/:quoteId/not-interested', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const supplierId = req.supplier.supplier_id;

    const WorkshopQuote = require('../models/WorkshopQuote');
    
    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      selected_suppliers: supplierId,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found or not assigned to this supplier",
      });
    }

    // Check if supplier already responded
    const existingResponseIndex = quote.supplier_responses.findIndex(
      (response) => response.supplier_id.toString() === supplierId
    );

    const responseData = {
      supplier_id: supplierId,
      status: "not_interested",
      responded_at: new Date()
    };

    if (existingResponseIndex >= 0) {
      quote.supplier_responses[existingResponseIndex] = responseData;
    } else {
      quote.supplier_responses.push(responseData);
    }

    await quote.save();

    res.status(200).json({
      success: true,
      message: "Marked as not interested successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Not interested error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating quote status",
    });
  }
});

module.exports = router;