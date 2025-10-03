const BayBooking = require('../models/BayBooking');
const ServiceBay = require('../models/ServiceBay');
const User = require('../models/User');
const { logEvent } = require('./logs.controller');

// @desc    Create bay booking request
// @route   POST /api/bay-booking
// @access  Private (Company Admin/Super Admin)
const createBayBooking = async (req, res) => {
  try {
    const {
      vehicle_type,
      vehicle_stock_id,
      field_id,
      field_name,
      bay_id,
      booking_date,
      booking_start_time,
      booking_end_time,
      booking_description,
      images,
      videos
    } = req.body;

    // Validate required fields
    if (!vehicle_type || !vehicle_stock_id || !field_id || !bay_id || !booking_date || !booking_start_time || !booking_end_time) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if booking already exists for this field
    const existingBooking = await BayBooking.findOne({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'A booking already exists for this field'
      });
    }

    // Verify bay exists and is active
    const bay = await ServiceBay.findOne({
      _id: bay_id,
      company_id: req.user.company_id,
      is_active: true
    });

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: 'Service bay not found or inactive'
      });
    }

    // Check if the time slot is available (no overlapping bookings)
    const bookingDateObj = new Date(booking_date);
    bookingDateObj.setHours(0, 0, 0, 0);

    const overlappingBooking = await BayBooking.findOne({
      bay_id,
      booking_date: bookingDateObj,
      status: { $nin: ['booking_rejected', 'completed_jobs'] },
      $or: [
        {
          $and: [
            { booking_start_time: { $lte: booking_start_time } },
            { booking_end_time: { $gt: booking_start_time } }
          ]
        },
        {
          $and: [
            { booking_start_time: { $lt: booking_end_time } },
            { booking_end_time: { $gte: booking_end_time } }
          ]
        },
        {
          $and: [
            { booking_start_time: { $gte: booking_start_time } },
            { booking_end_time: { $lte: booking_end_time } }
          ]
        }
      ]
    });

    if (overlappingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    const booking = new BayBooking({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
      field_name,
      bay_id,
      booking_date: bookingDateObj,
      booking_start_time,
      booking_end_time,
      booking_description,
      images: images || [],
      videos: videos || [],
      status: 'booking_request',
      created_by: req.user.id
    });

    await booking.save();

    await logEvent({
      event_type: 'bay_booking_operation',
      event_action: 'booking_created',
      event_description: `Bay booking created for ${field_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        booking_id: booking._id,
        bay_id,
        vehicle_stock_id,
        field_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Bay booking request created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Create bay booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bay booking'
    });
  }
};

// @desc    Get bay bookings for calendar (by bay user)
// @route   GET /api/bay-booking/calendar
// @access  Private (Company Admin - Bay User)
const getBayCalendar = async (req, res) => {
  try {
    const { start_date, end_date, bay_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Find bays where user is a bay user
    let bayFilter = {
      company_id: req.user.company_id,
      bay_users: req.user.id,
      is_active: true
    };

    if (bay_id) {
      bayFilter._id = bay_id;
    }

    const userBays = await ServiceBay.find(bayFilter).select('_id bay_name bay_timings bay_holidays');

    if (userBays.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to any bays'
      });
    }

    const bayIds = userBays.map(b => b._id);

    // Get bookings for these bays within date range
    const bookings = await BayBooking.find({
      bay_id: { $in: bayIds },
      booking_date: {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      }
    })
      .populate('bay_id', 'bay_name')
      .populate('created_by', 'first_name last_name')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        bays: userBays,
        bookings
      }
    });
  } catch (error) {
    console.error('Get bay calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving bay calendar'
    });
  }
};

// @desc    Accept bay booking
// @route   POST /api/bay-booking/:id/accept
// @access  Private (Company Admin - Bay User)
const acceptBayBooking = async (req, res) => {
  try {
    const booking = await BayBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify user is part of the bay
    const bay = await ServiceBay.findOne({
      _id: booking.bay_id,
      company_id: req.user.company_id,
      bay_users: req.user.id
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this booking'
      });
    }

    if (booking.status !== 'booking_request') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not in request status'
      });
    }

    booking.status = 'booking_accepted';
    booking.accepted_by = req.user.id;
    booking.accepted_at = new Date();

    await booking.save();

    await logEvent({
      event_type: 'bay_booking_operation',
      event_action: 'booking_accepted',
      event_description: `Bay booking accepted for ${booking.field_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        booking_id: booking._id,
        bay_id: booking.bay_id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      data: booking
    });
  } catch (error) {
    console.error('Accept bay booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting booking'
    });
  }
};

// @desc    Reject bay booking
// @route   POST /api/bay-booking/:id/reject
// @access  Private (Company Admin - Bay User)
const rejectBayBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await BayBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify user is part of the bay
    const bay = await ServiceBay.findOne({
      _id: booking.bay_id,
      company_id: req.user.company_id,
      bay_users: req.user.id
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this booking'
      });
    }

    if (booking.status !== 'booking_request') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not in request status'
      });
    }

    booking.status = 'booking_rejected';
    booking.rejected_reason = reason;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully',
      data: booking
    });
  } catch (error) {
    console.error('Reject bay booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting booking'
    });
  }
};

// @desc    Start work on booking
// @route   POST /api/bay-booking/:id/start-work
// @access  Private (Company Admin - Bay User)
const startWork = async (req, res) => {
  try {
    const booking = await BayBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const bay = await ServiceBay.findOne({
      _id: booking.bay_id,
      company_id: req.user.company_id,
      bay_users: req.user.id
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized'
      });
    }

    if (booking.status !== 'booking_accepted') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be accepted before starting work'
      });
    }

    booking.status = 'work_in_progress';
    booking.work_started_at = new Date();

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Work started successfully',
      data: booking
    });
  } catch (error) {
    console.error('Start work error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting work'
    });
  }
};

// @desc    Submit work
// @route   POST /api/bay-booking/:id/submit-work
// @access  Private (Company Admin - Bay User)
const submitWork = async (req, res) => {
  try {
    const booking = await BayBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const bay = await ServiceBay.findOne({
      _id: booking.bay_id,
      company_id: req.user.company_id,
      bay_users: req.user.id
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized'
      });
    }

    if (booking.status !== 'work_in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Work must be in progress to submit'
      });
    }

    booking.comment_sheet = req.body;
    booking.status = 'work_review';
    booking.work_submitted_at = new Date();

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Work submitted for review',
      data: booking
    });
  } catch (error) {
    console.error('Submit work error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting work'
    });
  }
};

// @desc    Accept work (by company)
// @route   POST /api/bay-booking/:id/accept-work
// @access  Private (Company Admin/Super Admin)
const acceptWork = async (req, res) => {
  try {
    const booking = await BayBooking.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'work_review') {
      return res.status(400).json({
        success: false,
        message: 'Work must be under review to accept'
      });
    }

    booking.status = 'completed_jobs';
    booking.work_completed_at = new Date();

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Work accepted successfully',
      data: booking
    });
  } catch (error) {
    console.error('Accept work error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting work'
    });
  }
};

// @desc    Request rework (by company)
// @route   POST /api/bay-booking/:id/request-rework
// @access  Private (Company Admin/Super Admin)
const requestRework = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await BayBooking.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'work_review') {
      return res.status(400).json({
        success: false,
        message: 'Work must be under review to request rework'
      });
    }

    booking.status = 'rework';
    if (booking.comment_sheet) {
      booking.comment_sheet.company_feedback = reason;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Rework requested successfully',
      data: booking
    });
  } catch (error) {
    console.error('Request rework error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting rework'
    });
  }
};

// @desc    Get booking details for field
// @route   GET /api/bay-booking/field/:vehicle_type/:vehicle_stock_id/:field_id
// @access  Private (Company Admin/Super Admin)
const getBookingForField = async (req, res) => {
  try {
    const { vehicle_type, vehicle_stock_id, field_id } = req.params;

    const booking = await BayBooking.findOne({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id: parseInt(vehicle_stock_id),
      field_id
    })
      .populate('bay_id', 'bay_name bay_timings')
      .populate('accepted_by', 'first_name last_name email username');

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking for field error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving booking'
    });
  }
};

module.exports = {
  createBayBooking,
  getBayCalendar,
  acceptBayBooking,
  rejectBayBooking,
  startWork,
  submitWork,
  acceptWork,
  requestRework,
  getBookingForField
};
