
const Vehicle = require('../models/Vehicle');
const { logEvent } = require('./logs.controller');

// @desc    Get all inspections
// @route   GET /api/inspection
// @access  Private (Company Admin/Super Admin)
const getInspections = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = { 
      company_id: req.user.company_id,
      vehicle_type: 'inspection'
    };

    if (status) {
      filter.inspection_status = status;
    }

    const inspections = await Vehicle.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: inspections,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving inspections'
    });
  }
};

// @desc    Start inspection for a vehicle
// @route   POST /api/inspection/start/:vehicleId
// @access  Private (Company Admin/Super Admin)
const startInspection = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { 
        vehicle_stock_id: req.params.vehicleId,
        company_id: req.user.company_id 
      },
      { 
        inspection_status: 'in_progress',
        inspection_started_at: new Date(),
        inspection_started_by: req.user.id
      },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    await logEvent({
      event_type: 'inspection',
      event_action: 'inspection_started',
      event_description: `Inspection started for ${vehicle.make} ${vehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: vehicle.vehicle_stock_id }
    });

    res.status(200).json({
      success: true,
      data: vehicle,
      message: 'Inspection started successfully'
    });

  } catch (error) {
    console.error('Start inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting inspection'
    });
  }
};

// @desc    Get single inspection
// @route   GET /api/inspection/:id
// @access  Private (Company Admin/Super Admin)
const getInspection = async (req, res) => {
  try {
    const inspection = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: 'inspection'
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    res.status(200).json({
      success: true,
      data: inspection
    });

  } catch (error) {
    console.error('Get inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving inspection'
    });
  }
};

// @desc    Update inspection
// @route   PUT /api/inspection/:id
// @access  Private (Company Admin/Super Admin)
const updateInspection = async (req, res) => {
  try {
    const inspection = await Vehicle.findOneAndUpdate(
      { 
        _id: req.params.id,
        company_id: req.user.company_id,
        vehicle_type: 'inspection'
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    res.status(200).json({
      success: true,
      data: inspection
    });

  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inspection'
    });
  }
};

// @desc    Complete inspection
// @route   POST /api/inspection/:id/complete
// @access  Private (Company Admin/Super Admin)
const completeInspection = async (req, res) => {
  try {
    const inspection = await Vehicle.findOneAndUpdate(
      { 
        _id: req.params.id,
        company_id: req.user.company_id,
        vehicle_type: 'inspection'
      },
      { 
        inspection_status: 'completed',
        inspection_completed_at: new Date(),
        inspection_completed_by: req.user.id,
        inspection_data: req.body.inspection_data
      },
      { new: true }
    );

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    await logEvent({
      event_type: 'inspection',
      event_action: 'inspection_completed',
      event_description: `Inspection completed for ${inspection.make} ${inspection.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: inspection.vehicle_stock_id }
    });

    // Send to callback URL if configured
    // This would trigger webhook to external system

    res.status(200).json({
      success: true,
      data: inspection,
      message: 'Inspection completed successfully'
    });

  } catch (error) {
    console.error('Complete inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing inspection'
    });
  }
};

// @desc    Get inspection report
// @route   GET /api/inspection/:id/report
// @access  Private (Company Admin/Super Admin)
const getInspectionReport = async (req, res) => {
  try {
    const inspection = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: 'inspection',
      inspection_status: 'completed'
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Completed inspection not found'
      });
    }

    // Generate comprehensive report
    const report = {
      vehicle_info: {
        make: inspection.make,
        model: inspection.model,
        year: inspection.year,
        registration: inspection.registration_number,
        vin: inspection.vin_number
      },
      inspection_details: {
        started_at: inspection.inspection_started_at,
        completed_at: inspection.inspection_completed_at,
        duration: inspection.inspection_completed_at - inspection.inspection_started_at,
        inspector: inspection.inspection_completed_by
      },
      inspection_data: inspection.inspection_data || {},
      summary: {
        total_checks: Object.keys(inspection.inspection_data || {}).length,
        passed_checks: 0, // Calculate based on data
        failed_checks: 0, // Calculate based on data
        overall_condition: 'Good' // Calculate based on data
      }
    };

    res.status(200).json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get inspection report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating inspection report'
    });
  }
};

module.exports = {
  getInspections,
  startInspection,
  getInspection,
  updateInspection,
  completeInspection,
  getInspectionReport
};
