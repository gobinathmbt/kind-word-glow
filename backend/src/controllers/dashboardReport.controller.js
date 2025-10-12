const Vehicle = require("../models/Vehicle");
const WorkshopQuote = require("../models/WorkshopQuote");
const WorkshopReport = require("../models/WorkshopReport");
const { logEvent } = require("./logs.controller");

// @desc    Get vehicles by status summary
// @route   GET /api/dashboard-report/vehicles-by-status
// @access  Private (Company Admin/Super Admin)
const getVehiclesByStatus = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    // Handle dealership-based access
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      const dealershipObjectIds = req.user.dealership_ids.map((dealer) =>
        typeof dealer === "object" ? dealer._id : dealer
      );
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    const result = await Vehicle.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          vehicles: { $push: "$vehicle_stock_id" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get vehicles by status error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicles by status",
    });
  }
};

// @desc    Get workshop quotes by status summary
// @route   GET /api/dashboard-report/workshop-quotes-by-status
// @access  Private (Company Admin/Super Admin)
const getWorkshopQuotesByStatus = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopQuote.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total_amount: { $sum: "$quote_amount" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get workshop quotes by status error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving workshop quotes by status",
    });
  }
};

// @desc    Get license expiry tracking
// @route   GET /api/dashboard-report/license-expiry
// @access  Private (Company Admin/Super Admin)
const getLicenseExpiryTracking = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
      "vehicle_registration.license_expiry_date": { $exists: true, $ne: null },
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    // Handle dealership-based access
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      const dealershipObjectIds = req.user.dealership_ids.map((dealer) =>
        typeof dealer === "object" ? dealer._id : dealer
      );
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    const result = await Vehicle.aggregate([
      { $match: filter },
      { $unwind: "$vehicle_registration" },
      {
        $project: {
          vehicle_stock_id: 1,
          make: 1,
          model: 1,
          plate_no: 1,
          license_expiry_date: "$vehicle_registration.license_expiry_date",
          days_until_expiry: {
            $divide: [
              {
                $subtract: [
                  "$vehicle_registration.license_expiry_date",
                  today,
                ],
              },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $bucket: {
          groupBy: "$days_until_expiry",
          boundaries: [-Infinity, 0, 7, 30, 60, Infinity],
          default: "Unknown",
          output: {
            count: { $sum: 1 },
            vehicles: {
              $push: {
                vehicle_stock_id: "$vehicle_stock_id",
                make: "$make",
                model: "$model",
                plate_no: "$plate_no",
                license_expiry_date: "$license_expiry_date",
                days_until_expiry: "$days_until_expiry",
              },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get license expiry tracking error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving license expiry tracking",
    });
  }
};

// @desc    Get inspection/trade-in report completion
// @route   GET /api/dashboard-report/report-completion
// @access  Private (Company Admin/Super Admin)
const getReportCompletion = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    // Handle dealership-based access
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      const dealershipObjectIds = req.user.dealership_ids.map((dealer) =>
        typeof dealer === "object" ? dealer._id : dealer
      );
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    const result = await Vehicle.aggregate([
      { $match: filter },
      {
        $facet: {
          inspection_reports: [
            {
              $match: {
                vehicle_type: "inspection",
                inspection_report_pdf: { $exists: true, $ne: [] },
              },
            },
            {
              $project: {
                vehicle_stock_id: 1,
                report_count: { $size: "$inspection_report_pdf" },
              },
            },
            {
              $group: {
                _id: null,
                total_vehicles: { $sum: 1 },
                total_reports: { $sum: "$report_count" },
              },
            },
          ],
          tradein_reports: [
            {
              $match: {
                vehicle_type: "tradein",
                tradein_report_pdf: { $exists: true, $ne: [] },
              },
            },
            {
              $project: {
                vehicle_stock_id: 1,
                report_count: { $size: "$tradein_report_pdf" },
              },
            },
            {
              $group: {
                _id: null,
                total_vehicles: { $sum: 1 },
                total_reports: { $sum: "$report_count" },
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Get report completion error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving report completion",
    });
  }
};

// @desc    Get workshop progress stages
// @route   GET /api/dashboard-report/workshop-progress
// @access  Private (Company Admin/Super Admin)
const getWorkshopProgress = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    // Handle dealership-based access
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      const dealershipObjectIds = req.user.dealership_ids.map((dealer) =>
        typeof dealer === "object" ? dealer._id : dealer
      );
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    const result = await Vehicle.aggregate([
      { $match: filter },
      {
        $project: {
          vehicle_stock_id: 1,
          make: 1,
          model: 1,
          workshop_progress: 1,
        },
      },
      {
        $group: {
          _id: "$workshop_progress",
          count: { $sum: 1 },
          vehicles: {
            $push: {
              vehicle_stock_id: "$vehicle_stock_id",
              make: "$make",
              model: "$model",
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get workshop progress error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving workshop progress",
    });
  }
};

// @desc    Get cost analysis
// @route   GET /api/dashboard-report/cost-analysis
// @access  Private (Company Admin/Super Admin)
const getCostAnalysis = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
      status: { $in: ["completed_jobs", "work_review"] },
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopQuote.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total_quotes: { $sum: 1 },
          total_quote_amount: { $sum: "$quote_amount" },
          total_final_amount: { $sum: "$comment_sheet.final_price" },
          total_parts_cost: { $sum: "$comment_sheet.amount_spent" },
          avg_quote_amount: { $avg: "$quote_amount" },
          avg_final_amount: { $avg: "$comment_sheet.final_price" },
          quotes_with_difference: {
            $sum: {
              $cond: [
                {
                  $ne: [
                    "$quote_amount",
                    "$comment_sheet.final_price",
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: result[0] || {},
    });
  } catch (error) {
    console.error("Get cost analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving cost analysis",
    });
  }
};

// @desc    Get supplier performance
// @route   GET /api/dashboard-report/supplier-performance
// @access  Private (Company Admin/Super Admin)
const getSupplierPerformance = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
      approved_supplier: { $exists: true, $ne: null },
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopQuote.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "suppliers",
          localField: "approved_supplier",
          foreignField: "_id",
          as: "supplier_info",
        },
      },
      { $unwind: "$supplier_info" },
      {
        $group: {
          _id: "$approved_supplier",
          supplier_name: { $first: "$supplier_info.company_name" },
          total_jobs: { $sum: 1 },
          completed_jobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed_jobs"] }, 1, 0],
            },
          },
          total_amount: { $sum: "$quote_amount" },
          avg_amount: { $avg: "$quote_amount" },
          in_progress: {
            $sum: {
              $cond: [{ $eq: ["$status", "work_in_progress"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { total_jobs: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get supplier performance error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving supplier performance",
    });
  }
};

// @desc    Get timeline analysis
// @route   GET /api/dashboard-report/timeline-analysis
// @access  Private (Company Admin/Super Admin)
const getTimelineAnalysis = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopQuote.aggregate([
      { $match: filter },
      {
        $project: {
          status: 1,
          created_at: 1,
          approved_at: 1,
          work_started_at: 1,
          work_completed_at: 1,
          quote_to_approval_days: {
            $cond: [
              { $and: ["$created_at", "$approved_at"] },
              {
                $divide: [
                  { $subtract: ["$approved_at", "$created_at"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              null,
            ],
          },
          work_duration_days: {
            $cond: [
              { $and: ["$work_started_at", "$work_completed_at"] },
              {
                $divide: [
                  { $subtract: ["$work_completed_at", "$work_started_at"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avg_quote_to_approval: { $avg: "$quote_to_approval_days" },
          avg_work_duration: { $avg: "$work_duration_days" },
          max_work_duration: { $max: "$work_duration_days" },
          min_work_duration: { $min: "$work_duration_days" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: result[0] || {},
    });
  } catch (error) {
    console.error("Get timeline analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving timeline analysis",
    });
  }
};

// @desc    Get quality metrics
// @route   GET /api/dashboard-report/quality-metrics
// @access  Private (Company Admin/Super Admin)
const getQualityMetrics = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
      status: { $in: ["completed_jobs", "work_review", "rework"] },
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopQuote.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate rework rate
    const completed = result.find((r) => r._id === "completed_jobs")?.count || 0;
    const rework = result.find((r) => r._id === "rework")?.count || 0;
    const total = completed + rework;
    const reworkRate = total > 0 ? (rework / total) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        status_breakdown: result,
        rework_rate: reworkRate.toFixed(2),
        total_jobs: total,
      },
    });
  } catch (error) {
    console.error("Get quality metrics error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving quality metrics",
    });
  }
};

// @desc    Get workload distribution
// @route   GET /api/dashboard-report/workload-distribution
// @access  Private (Company Admin/Super Admin)
const getWorkloadDistribution = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopQuote.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
          },
          total_quotes: { $sum: 1 },
          statuses: { $push: "$status" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get workload distribution error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving workload distribution",
    });
  }
};

// @desc    Get completion rate analysis
// @route   GET /api/dashboard-report/completion-rate
// @access  Private (Company Admin/Super Admin)
const getCompletionRateAnalysis = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopQuote.aggregate([
      { $match: filter },
      {
        $facet: {
          by_status: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          by_quote_type: [
            {
              $group: {
                _id: "$quote_type",
                count: { $sum: 1 },
                completed: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "completed_jobs"] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Get completion rate analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving completion rate analysis",
    });
  }
};

// @desc    Get workshop reports summary
// @route   GET /api/dashboard-report/workshop-reports-summary
// @access  Private (Company Admin/Super Admin)
const getWorkshopReportsSummary = async (req, res) => {
  try {
    const { vehicle_type, start_date, end_date } = req.query;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    const result = await WorkshopReport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$report_type",
          count: { $sum: 1 },
          total_cost: { $sum: "$workshop_summary.total_cost" },
          avg_cost: { $avg: "$workshop_summary.total_cost" },
          total_fields: { $sum: "$workshop_summary.total_fields" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get workshop reports summary error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving workshop reports summary",
    });
  }
};

// @desc    Get vehicles by filters for drill-down
// @route   POST /api/dashboard-report/vehicle-records
// @access  Private (Company Admin/Super Admin)
const getVehicleRecords = async (req, res) => {
  try {
    const {
      vehicle_type,
      status,
      workshop_progress,
      start_date,
      end_date,
      page = 1,
      limit = 20,
    } = req.body;

    const skip = (page - 1) * limit;

    const filter = {
      company_id: req.user.company_id,
    };

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (status) {
      filter.status = status;
    }

    if (workshop_progress) {
      filter.workshop_progress = workshop_progress;
    }

    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      };
    }

    // Handle dealership-based access
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      const dealershipObjectIds = req.user.dealership_ids.map((dealer) =>
        typeof dealer === "object" ? dealer._id : dealer
      );
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .select({
          vehicle_stock_id: 1,
          make: 1,
          model: 1,
          year: 1,
          plate_no: 1,
          vin: 1,
          status: 1,
          workshop_progress: 1,
          vehicle_hero_image: 1,
          created_at: 1,
          dealership_id: 1,
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vehicle.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: vehicles,
      total,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: limit,
      },
    });
  } catch (error) {
    console.error("Get vehicle records error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicle records",
    });
  }
};

module.exports = {
  getVehiclesByStatus,
  getWorkshopQuotesByStatus,
  getLicenseExpiryTracking,
  getReportCompletion,
  getWorkshopProgress,
  getCostAnalysis,
  getSupplierPerformance,
  getTimelineAnalysis,
  getQualityMetrics,
  getWorkloadDistribution,
  getCompletionRateAnalysis,
  getWorkshopReportsSummary,
  getVehicleRecords,
};
