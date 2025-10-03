const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getWorkshopVehicles,
  getWorkshopVehicleDetails,
  createQuote,
  getQuotesForField,
  approveSupplierQuote
} = require('../controllers/workshop.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Workshop routes
router.get('/vehicles', getWorkshopVehicles);
router.get('/vehicle/:vehicleId/:vehicleType', getWorkshopVehicleDetails);
router.post('/quote', createQuote);
router.get('/quotes/:vehicle_type/:vehicle_stock_id/:field_id', getQuotesForField);
router.post('/quote/:quoteId/approve/:supplierId', approveSupplierQuote);
router.post('/quote/:quoteId/accept-work', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const WorkshopQuote = require('../models/WorkshopQuote');
    
    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      company_id: req.user.company_id,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found",
      });
    }

    quote.status = 'completed_jobs';
    await quote.save();

    res.status(200).json({
      success: true,
      message: "Work accepted successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Accept work error:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting work",
    });
  }
});

router.post('/quote/:quoteId/request-rework', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { reason } = req.body;
    const WorkshopQuote = require('../models/WorkshopQuote');
    
    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      company_id: req.user.company_id,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found",
      });
    }

    quote.status = 'rework';
    if (quote.comment_sheet) {
      quote.comment_sheet.company_feedback = reason;
    }
    await quote.save();

    res.status(200).json({
      success: true,
      message: "Rework requested successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Request rework error:", error);
    res.status(500).json({
      success: false,
      message: "Error requesting rework",
    });
  }
});

module.exports = router;