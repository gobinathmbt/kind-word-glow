const WorkshopQuote = require("../models/WorkshopQuote");
const Company = require("../models/Company");
const Supplier = require("../models/Supplier");
const Vehicle = require("../models/Vehicle");
const { logEvent } = require("./logs.controller");

// @desc    Get supplier dashboard statistics
// @route   GET /api/supplier-dashboard/stats
// @access  Private (Supplier)
const getSupplierStats = async (req, res) => {
  try {
    const supplierId = req.supplier.supplier_id;

    // Get counts for each status
    const stats = await WorkshopQuote.aggregate([
      {
        $match: {
          selected_suppliers: { $in: [supplierId] },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalEarnings: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "completed_jobs"] },
                then: "$comment_sheet.final_price",
                else: 0,
              },
            },
          },
        },
      },
    ]);

    // Initialize all status counts
    const statusCounts = {
      quote_request: 0,
      quote_sent: 0,
      quote_approved: 0,
      quote_rejected: 0,
      work_in_progress: 0,
      work_review: 0,
      completed_jobs: 0,
      rework: 0,
      total_earnings: 0,
    };

    // Map the aggregated results
    stats.forEach((stat) => {
      if (statusCounts.hasOwnProperty(stat._id)) {
        statusCounts[stat._id] = stat.count;
      }
      statusCounts.total_earnings += stat.totalEarnings || 0;
    });

    res.status(200).json({
      success: true,
      data: statusCounts,
    });
  } catch (error) {
    console.error("Get supplier stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving supplier statistics",
    });
  }
};

// @desc    Get quotes by status for supplier
// @route   GET /api/supplier-dashboard/quotes/:status
// @access  Private (Supplier)
const getQuotesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;
    const supplierId = req.supplier.supplier_id;

    let filter = {};

    // Handle filtering based on status logic
    if (status === "quote_request" || status === "quote_sent") {
      // Show quotes to all selected suppliers
      filter = {
        selected_suppliers: { $in: [supplierId] },
        status,
      };
    } else if (status === "quote_approved") {
      // Show only if this supplier's response was approved
      filter = {
        supplier_responses: {
          $elemMatch: { supplier_id: supplierId, status: "approved" },
        },
        status,
      };
    } else if (
      ["work_in_progress", "work_review", "completed_jobs", "rework"].includes(
        status
      )
    ) {
      // After approval, only approved supplier can see
      filter = {
        approved_supplier: supplierId,
        status,
      };
    } else if (status === "quote_rejected") {
      // Show rejected quotes for this supplier
      filter = {
        supplier_responses: {
          $elemMatch: { supplier_id: supplierId, status: "rejected" },
        },
      };
    } else {
      // Generic fallback
      filter = {
        selected_suppliers: { $in: [supplierId] },
        status,
      };
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { field_name: { $regex: search, $options: "i" } },
        { quote_description: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch quotes
    const quotes = await WorkshopQuote.find(filter)
      .populate("company_id", "company_name")
      .populate("approved_supplier", "name supplier_shop_name")
      .populate("supplier_responses.supplier_id", "name supplier_shop_name")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WorkshopQuote.countDocuments(filter);

    // Enrich with vehicle data and filter supplier responses
    const enrichedQuotes = await Promise.all(
      quotes.map(async (quote) => {
        const vehicle = await Vehicle.findOne({
          vehicle_stock_id: quote.vehicle_stock_id,
          vehicle_type: quote.vehicle_type,
          company_id: quote.company_id,
        }).select("make model year plate_no vin name vehicle_hero_image");

        // Filter supplier_responses to only show current supplier's response
        const filteredResponses = quote.supplier_responses.filter(
          (response) =>
            response.supplier_id._id.toString() === supplierId.toString()
        );

        return {
          ...quote.toObject(),
          vehicle,
          supplier_responses: filteredResponses, // Only current supplier's responses
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedQuotes,
      total,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get quotes by status error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving quotes",
    });
  }
};

// @desc    Start work on approved quote
// @route   POST /api/supplier-dashboard/quote/:quoteId/start-work
// @access  Private (Supplier)
const startWork = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const supplierId = req.supplier.supplier_id;

    console.log(
      "Starting work for supplier:",
      supplierId,
      "on quote:",
      quoteId
    );
    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      $or: [
        { approved_supplier: supplierId, status: "quote_approved" },
        { approved_supplier: supplierId, status: "rework" },
      ],
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found or not available for work",
      });
    }

    // Update status to work_in_progress
    quote.status = "work_in_progress";
    quote.work_started_at = new Date();
    await quote.save();

    // Log the event
    await logEvent({
      event_type: "workshop_operation",
      event_action:
        quote.status === "rework" ? "rework_started" : "work_started",
      event_description: `Supplier started work on quote for ${quote.field_name}`,
      user_id: supplierId,
      company_id: quote.company_id,
      user_role: "supplier",
      metadata: {
        quote_id: quote._id,
        vehicle_stock_id: quote.vehicle_stock_id,
        field_id: quote.field_id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Work started successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Start work error:", error);
    res.status(500).json({
      success: false,
      message: "Error starting work",
    });
  }
};

// @desc    Submit work for review
// @route   POST /api/supplier-dashboard/quote/:quoteId/submit-work
// @access  Private (Supplier)
const submitWork = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const supplierId = req.supplier.supplier_id;
    const {
      work_entries,
      warranty_months,
      maintenance_recommendations,
      next_service_due,
      supplier_comments,
      company_feedback,
      customer_satisfaction,
      workMode,
      technician_company_assigned,
      work_completion_date,
      total_amount,
      quote_difference,
      final_price,
      gst_amount,
      amount_spent,
      invoice_pdf_url,
      invoice_pdf_key,
      work_images,
      save_as_draft,
    } = req.body;

    const finalStatus =
      workMode === "edit" ? "work_review" : "work_in_progress";
    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      approved_supplier: supplierId,
      status: finalStatus,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found or work not in progress",
      });
    }

    // Calculate total amount if not provided
    const calculatedTotal =
      total_amount || (final_price || 0) + (gst_amount || 0);

    // Update comment sheet
    quote.comment_sheet = {
      work_entries: work_entries || [],
      warranty_months,
      maintenance_recommendations,
      next_service_due: next_service_due
        ? new Date(next_service_due)
        : null,
      supplier_comments,
      company_feedback,
      customer_satisfaction,
      technician_company_assigned,
      work_completion_date: work_completion_date
        ? new Date(work_completion_date)
        : null,
      total_amount: calculatedTotal,
      quote_difference,
      final_price: final_price || 0,
      gst_amount: gst_amount || 0,
      amount_spent: amount_spent || 0,
      invoice_pdf_url,
      invoice_pdf_key,
      work_images: work_images || [],
      submitted_at: new Date(),
    };

    // Only update status if NOT saving as draft
    if (!save_as_draft) {
      quote.status = "work_review";
      quote.work_submitted_at = new Date();
    }

    await quote.save();

    // Log only if actual submission (not draft)
    if (!save_as_draft) {
      await logEvent({
        event_type: "workshop_operation",
        event_action: "work_submitted",
        event_description: `Supplier submitted work for review on ${quote.field_name}`,
        user_id: supplierId,
        company_id: quote.company_id,
        user_role: "supplier",
        metadata: {
          quote_id: quote._id,
          vehicle_stock_id: quote.vehicle_stock_id,
          field_id: quote.field_id,
          final_price,
          total_amount: calculatedTotal,
          work_entries_count: work_entries ? work_entries.length : 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: save_as_draft
        ? "Work draft saved successfully"
        : "Work submitted for review successfully",
        draft_status:save_as_draft,
      data: quote,
    });
  } catch (error) {
    console.error("Submit work error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting work",
    });
  }
};

// @desc    Update supplier profile
// @route   PUT /api/supplier-dashboard/profile
// @access  Private (Supplier)
const updateProfile = async (req, res) => {
  try {
    const supplierId = req.supplier.supplier_id;
    const {
      name,
      supplier_shop_name,
      address,
      phone,
      current_password,
      new_password,
    } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Update basic fields
    if (name) supplier.name = name;
    if (supplier_shop_name) supplier.supplier_shop_name = supplier_shop_name;
    if (address) supplier.address = address;
    if (phone) supplier.phone = phone;

    // Handle password change
    if (current_password && new_password) {
      const isMatch = current_password === supplier.password;
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      supplier.password = new_password;
    }

    await supplier.save();

    // Return supplier without password
    const { password, ...supplierData } = supplier.toObject();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: supplierData,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

const getsupplierS3Config = async (req, res) => {
  try {
    const company = await Company.findById(req.supplier.company_id).select(
      "s3_config"
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    res.status(200).json({
      success: true,
      data: company.s3_config || {},
    });
  } catch (error) {
    console.error("Get S3 config error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving S3 configuration",
    });
  }
};

module.exports = {
  getSupplierStats,
  getQuotesByStatus,
  startWork,
  submitWork,
  updateProfile,
  getsupplierS3Config,
};
