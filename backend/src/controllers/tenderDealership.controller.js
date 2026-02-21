const User = require("../models/User");
const { logEvent } = require("./logs.controller");
const mailService = require("../config/mailer");
const Env_Configuration = require("../config/env");

/**
 * Manually populate User fields from main DB for TenderDealership documents
 * @param {Array|Object} items - TenderDealership document(s) to populate
 * @returns {Array|Object} Populated items
 */
async function populateTenderDealershipUsers(items) {
  const isArray = Array.isArray(items);
  const itemsArray = isArray ? items : [items];

  if (itemsArray.length === 0) return items;

  // Collect all unique user IDs from created_by field
  const userIds = new Set();
  itemsArray.forEach((item) => {
    if (item.created_by) {
      userIds.add(item.created_by.toString());
    }
  });

  if (userIds.size === 0) return items;

  // Fetch all users at once
  const users = await User.find(
    { _id: { $in: Array.from(userIds) } },
    "first_name last_name email",
  ).lean();

  // Create user lookup map
  const userMap = {};
  users.forEach((user) => {
    userMap[user._id.toString()] = user;
  });

  // Populate items
  itemsArray.forEach((item) => {
    if (item.created_by) {
      item.created_by = userMap[item.created_by.toString()] || item.created_by;
    }
  });

  return isArray ? itemsArray : itemsArray[0];
}

// @desc    Get tender dealerships with pagination and search
// @route   GET /api/tender-dealership
// @access  Private (Company Admin/Super Admin)
const getTenderDealerships = async (req, res) => {
  try {
    const TenderDealership = req.getModel("TenderDealership");
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {
      company_id: req.user.company_id,
    };

    // Handle status filter
    if (status && status !== "all") {
      filter.isActive = status === "active";
    }

    if (search) {
      filter.$or = [
        { dealership_name: { $regex: search, $options: "i" } },
        { "address.street": { $regex: search, $options: "i" } },
        { "address.suburb": { $regex: search, $options: "i" } },
        { "address.state": { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { tenderDealership_id: { $regex: search, $options: "i" } },
        { abn: { $regex: search, $options: "i" } },
        { dp_name: { $regex: search, $options: "i" } },
        { brand_or_make: { $regex: search, $options: "i" } },
      ];
    }

    const dealerships = await TenderDealership.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate User fields from main DB
    await populateTenderDealershipUsers(dealerships);

    const total = await TenderDealership.countDocuments(filter);

    // Get stats
    const totalDealerships = await TenderDealership.countDocuments({
      company_id: req.user.company_id,
    });
    const activeDealerships = await TenderDealership.countDocuments({
      company_id: req.user.company_id,
      isActive: true,
    });
    const inactiveDealerships = await TenderDealership.countDocuments({
      company_id: req.user.company_id,
      isActive: false,
    });

    res.status(200).json({
      success: true,
      data: dealerships,
      stats: {
        totalDealerships,
        activeDealerships,
        inactiveDealerships,
      },
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit),
        has_next_page: page < Math.ceil(total / limit),
        has_prev_page: page > 1,
      },
    });
  } catch (error) {
    console.error("Get tender dealerships error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving tender dealerships",
    });
  }
};

// @desc    Get single tender dealership
// @route   GET /api/tender-dealership/:id
// @access  Private (Company Admin/Super Admin)
const getTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel("TenderDealership");
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    }).lean();

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: "Tender dealership not found",
      });
    }

    // Manually populate User fields from main DB
    await populateTenderDealershipUsers(dealership);

    res.status(200).json({
      success: true,
      data: dealership,
    });
  } catch (error) {
    console.error("Get tender dealership error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving tender dealership",
    });
  }
};

// @desc    Create new tender dealership
// @route   POST /api/tender-dealership
// @access  Private (Super Admin only)
const createTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel("TenderDealership");

    // Validate required fields
    const { dealership_name, email } = req.body;

    if (!dealership_name || !email) {
      return res.status(400).json({
        success: false,
        message: "Dealership name and email are required",
        errors: [
          !dealership_name && {
            field: "dealership_name",
            message: "Dealership name is required",
          },
          !email && { field: "email", message: "Email is required" },
        ].filter(Boolean),
      });
    }

    // Check for duplicate email within company
    const existingDealership = await TenderDealership.findOne({
      company_id: req.user.company_id,
      email: email.toLowerCase(),
    });

    if (existingDealership) {
      return res.status(409).json({
        success: false,
        message: "A tender dealership with this email already exists",
        code: "DUPLICATE_EMAIL",
      });
    }

    // Create dealership data
    const dealershipData = {
      ...req.body,
      company_id: req.user.company_id,
      created_by: req.user.id,
    };

    const dealership = await TenderDealership.create(dealershipData);

    // Create primary dealership user
    const TenderDealershipUser = req.getModel("TenderDealershipUser");

    // Generate username from dealership name
    const username = dealership.dealership_name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 30);

    const defaultPassword = "Welcome@123";

    const primaryUser = await TenderDealershipUser.create({
      username,
      email: dealership.email,
      password: defaultPassword,
      tenderDealership_id: dealership._id,
      company_id: req.user.company_id,
      role: "primary_tender_dealership_user",
      isActive: true,
    });

    // Send email invitation with credentials
    try {
      const Company = require("../models/Company");
      const company = await Company.findById(req.user.company_id);
      const frontendUrl = Env_Configuration.FRONTEND_URL || "http://localhost:8080";

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Email Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <!-- HEADER -->
          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">🚗</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Complete Vehicle Management Solution</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Tender Portal</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Welcome to<br/>
                <span style="color:#22c55e;">${company ? company.company_name : 'Auto ERP'}</span> Portal
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Dear ${dealership.dealership_name} Team,</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">Your dealership has been <strong style="color:#111827;">successfully registered</strong> on our tender portal. Below are your account credentials — please keep them secure.</p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#22c55e,#16a34a);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">🔐 Your Login Credentials</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Username</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${username}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Password</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${defaultPassword}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Company ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${req.user.company_id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Dealership ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${dealership._id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Role</td>
                      <td><span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:4px 14px;border-radius:100px;">Primary Tender Dealership User</span></td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:30px;">
                <tr><td style="padding:14px 18px;font-size:13px;color:#92400e;line-height:1.6;">
                  <strong>⚠️ Security Notice:</strong> Please log in and <strong>change your password immediately</strong> to protect your account.
                </td></tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}login" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;box-shadow:0 8px 20px rgba(34,197,94,0.35);">
                    🚀 &nbsp; Access the Tender Portal
                  </a>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#2a2a2c;padding:28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">${company ? company.company_name : 'Auto ERP'} Team</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly.</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Secure Mail</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">
                © 2025 ${company ? company.company_name : 'Auto ERP'}. All rights reserved.&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Privacy Policy</a>&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

      await mailService.sendEmail({
        to: dealership.email,
        subject: `Welcome to ${company ? company.company_name : "Auto ERP"} Tender Portal`,
        html,
      });
    } catch (emailError) {
      console.error("Error sending email invitation:", emailError);
      // Don't fail the request if email fails, just log it
    }

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: "CREATE",
      resource_type: "TenderDealership",
      resource_id: dealership._id,
      description: `Created tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get("user-agent"),
    });

    res.status(201).json({
      success: true,
      message:
        "Tender dealership created successfully and invitation email sent",
      data: dealership,
    });
  } catch (error) {
    console.error("Create tender dealership error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating tender dealership",
    });
  }
};

// @desc    Update tender dealership
// @route   PUT /api/tender-dealership/:id
// @access  Private (Super Admin only)
const updateTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel("TenderDealership");

    // Find dealership
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: "Tender dealership not found",
      });
    }

    // Check for duplicate email if email is being changed
    if (
      req.body.email &&
      req.body.email.toLowerCase() !== dealership.email.toLowerCase()
    ) {
      const existingDealership = await TenderDealership.findOne({
        company_id: req.user.company_id,
        email: req.body.email.toLowerCase(),
        _id: { $ne: req.params.id },
      });

      if (existingDealership) {
        return res.status(409).json({
          success: false,
          message: "A tender dealership with this email already exists",
          code: "DUPLICATE_EMAIL",
        });
      }
    }

    // Update fields
    const allowedUpdates = [
      "dealership_name",
      "address",
      "billing_address",
      "abn",
      "dp_name",
      "brand_or_make",
      "email",
      "hubRecID",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        dealership[field] = req.body[field];
      }
    });

    await dealership.save();

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: "UPDATE",
      resource_type: "TenderDealership",
      resource_id: dealership._id,
      description: `Updated tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get("user-agent"),
    });

    res.status(200).json({
      success: true,
      message: "Tender dealership updated successfully",
      data: dealership,
    });
  } catch (error) {
    console.error("Update tender dealership error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating tender dealership",
    });
  }
};

// @desc    Delete tender dealership (permanent)
// @route   DELETE /api/tender-dealership/:id
// @access  Private (Super Admin only)
const deleteTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel("TenderDealership");
    const TenderDealershipUser = req.getModel("TenderDealershipUser");

    // Find dealership
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: "Tender dealership not found",
      });
    }

    // Delete all associated users (cascade deletion)
    await TenderDealershipUser.deleteMany({
      tenderDealership_id: dealership._id,
      company_id: req.user.company_id,
    });

    // Delete dealership
    await TenderDealership.deleteOne({ _id: dealership._id });

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: "DELETE",
      resource_type: "TenderDealership",
      resource_id: dealership._id,
      description: `Deleted tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get("user-agent"),
    });

    res.status(200).json({
      success: true,
      message: "Tender dealership and associated users deleted successfully",
    });
  } catch (error) {
    console.error("Delete tender dealership error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting tender dealership",
    });
  }
};

// @desc    Toggle tender dealership status
// @route   PATCH /api/tender-dealership/:id/status
// @access  Private (Super Admin only)
const toggleTenderDealershipStatus = async (req, res) => {
  try {
    const TenderDealership = req.getModel("TenderDealership");

    // Find dealership
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: "Tender dealership not found",
      });
    }

    // Toggle status
    dealership.isActive = !dealership.isActive;
    await dealership.save();

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: "UPDATE",
      resource_type: "TenderDealership",
      resource_id: dealership._id,
      description: `${dealership.isActive ? "Activated" : "Deactivated"} tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get("user-agent"),
    });

    res.status(200).json({
      success: true,
      message: `Tender dealership ${dealership.isActive ? "activated" : "deactivated"} successfully`,
      data: dealership,
    });
  } catch (error) {
    console.error("Toggle tender dealership status error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling tender dealership status",
    });
  }
};

module.exports = {
  getTenderDealerships,
  getTenderDealership,
  createTenderDealership,
  updateTenderDealership,
  deleteTenderDealership,
  toggleTenderDealershipStatus,
};
