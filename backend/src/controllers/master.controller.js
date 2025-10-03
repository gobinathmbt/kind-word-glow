
const MasterAdmin = require('../models/MasterAdmin');
const Company = require('../models/Company');
const User = require('../models/User');
const Plan = require('../models/Plan');
const bcrypt = require('bcryptjs');
const { logEvent } = require('./logs.controller');
const { sendEmail } = require('../config/mailer');

// Get dashboard data
const getDashboard = async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ is_active: true });
    const totalUsers = await User.countDocuments();
    const totalPlans = await Plan.countDocuments();

    // Recent companies (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompanies = await Company.countDocuments({
      created_at: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        totalUsers,
        totalPlans,
        recentCompanies,
        inactiveCompanies: totalCompanies - activeCompanies
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

// Get all companies
const getCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (search) {
      query.$or = [
        { company_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.is_active = status === 'active';
    }

    const companies = await Company.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      data: {
        companies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies'
    });
  }
};

// Get single company
const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('plan_id', 'plan_name monthly_price user_limit');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get user count for this company
    const userCount = await User.countDocuments({ company_id: company._id });

    res.json({
      success: true,
      data: {
        ...company.toObject(),
        user_count: userCount
      }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company'
    });
  }
};

// Update company
const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('plan_id', 'plan_name');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Log the event
    await logEvent({
      event_type: 'company_operation',
      event_action: 'company_updated',
      event_description: `Company ${company.company_name} updated by master admin`,
      user_id: req.user.id,
      user_role: req.user.role,
      resource_type: 'company',
      resource_id: company._id.toString(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: company,
      message: 'Company updated successfully'
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company'
    });
  }
};

// Delete company
const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Delete all users associated with this company
    await User.deleteMany({ company_id: company._id });

    // Delete the company
    await Company.findByIdAndDelete(req.params.id);

    // Log the event
    await logEvent({
      event_type: 'company_operation',
      event_action: 'company_deleted',
      event_description: `Company ${company.company_name} deleted by master admin`,
      user_id: req.user.id,
      user_role: req.user.role,
      resource_type: 'company',
      resource_id: company._id.toString(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company'
    });
  }
};

// Toggle company status
const toggleCompanyStatus = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company.is_active = !company.is_active;
    await company.save();

    // Log the event
    await logEvent({
      event_type: 'company_operation',
      event_action: 'company_status_changed',
      event_description: `Company ${company.company_name} status changed to ${company.is_active ? 'active' : 'inactive'}`,
      user_id: req.user.id,
      user_role: req.user.role,
      resource_type: 'company',
      resource_id: company._id.toString(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: company,
      message: `Company ${company.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle company status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company status'
    });
  }
};

// Get all plans
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ created_at: -1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
};

// Create plan
const createPlan = async (req, res) => {
  try {
    const plan = new Plan(req.body);
    await plan.save();

    // Log the event
    await logEvent({
      event_type: 'plan_operation',
      event_action: 'plan_created',
      event_description: `Plan ${plan.plan_name} created by master admin`,
      user_id: req.user.id,
      user_role: req.user.role,
      resource_type: 'plan',
      resource_id: plan._id.toString(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Plan created successfully'
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan'
    });
  }
};

// Update plan
const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Log the event
    await logEvent({
      event_type: 'plan_operation',
      event_action: 'plan_updated',
      event_description: `Plan ${plan.plan_name} updated by master admin`,
      user_id: req.user.id,
      user_role: req.user.role,
      resource_type: 'plan',
      resource_id: plan._id.toString(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: plan,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan'
    });
  }
};

// Delete plan
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Check if any companies are using this plan
    const companiesUsingPlan = await Company.countDocuments({ plan_id: plan._id });

    if (companiesUsingPlan > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan as it is being used by companies'
      });
    }

    await Plan.findByIdAndDelete(req.params.id);

    // Log the event
    await logEvent({
      event_type: 'plan_operation',
      event_action: 'plan_deleted',
      event_description: `Plan ${plan.plan_name} deleted by master admin`,
      user_id: req.user.id,
      user_role: req.user.role,
      resource_type: 'plan',
      resource_id: plan._id.toString(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan'
    });
  }
};

// Update master admin profile
const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, current_password, new_password } = req.body;

    const masterAdmin = await MasterAdmin.findById(req.user.id);

    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }

    // Update basic info
    masterAdmin.first_name = first_name;
    masterAdmin.last_name = last_name;
    masterAdmin.email = email;

    // Handle password update
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password'
        });
      }

      const isCurrentPasswordValid = await masterAdmin.comparePassword(current_password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      masterAdmin.password = new_password;
    }

    await masterAdmin.save();

    // Log the event
    await logEvent({
      event_type: 'user_operation',
      event_action: 'profile_updated',
      event_description: 'Master admin profile updated',
      user_id: req.user.id,
      user_role: req.user.role,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Update SMTP settings
const updateSmtpSettings = async (req, res) => {
  try {
    const masterAdmin = await MasterAdmin.findById(req.user.id);

    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }

    masterAdmin.smtp_settings = req.body;
    await masterAdmin.save();

    // Log the event
    await logEvent({
      event_type: 'system_operation',
      event_action: 'smtp_settings_updated',
      event_description: 'SMTP settings updated by master admin',
      user_id: req.user.id,
      user_role: req.user.role,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'SMTP settings updated successfully'
    });
  } catch (error) {
    console.error('Update SMTP settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SMTP settings'
    });
  }
};

// Test SMTP connection
const testSmtp = async (req, res) => {
  try {
    const testResult = await sendEmail(
      'test@example.com',
      'SMTP Test',
      'This is a test email to verify SMTP configuration.',
      req.body
    );

    res.json({
      success: true,
      message: 'SMTP test successful'
    });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({
      success: false,
      message: 'SMTP test failed: ' + error.message
    });
  }
};

// Update AWS settings
const updateAwsSettings = async (req, res) => {
  try {
    const masterAdmin = await MasterAdmin.findById(req.user.id);

    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }

    masterAdmin.aws_settings = req.body;
    await masterAdmin.save();

    // Log the event
    await logEvent({
      event_type: 'system_operation',
      event_action: 'aws_settings_updated',
      event_description: 'AWS settings updated by master admin',
      user_id: req.user.id,
      user_role: req.user.role,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'AWS settings updated successfully'
    });
  } catch (error) {
    console.error('Update AWS settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AWS settings'
    });
  }
};

// Test AWS connection
const testAwsConnection = async (req, res) => {
  try {
    const { SQS } = require("@aws-sdk/client-sqs");
    
    const sqs = new SQS({
      region: req.body.region,
      credentials: {
        accessKeyId: req.body.access_key_id,
        secretAccessKey: req.body.secret_access_key,
      },
    });

    // Test by getting queue attributes
    const params = {
      QueueUrl: req.body.sqs_queue_url,
      AttributeNames: ['All']
    };

    await sqs.getQueueAttributes(params);

    res.json({
      success: true,
      message: 'AWS connection test successful'
    });
  } catch (error) {
    console.error('AWS test error:', error);
    res.status(500).json({
      success: false,
      message: 'AWS connection test failed: ' + error.message
    });
  }
};

// Get AWS settings
const getAwsSettings = async (req, res) => {
  try {
    const masterAdmin = await MasterAdmin.findById(req.user.id);

    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }

    res.json({
      success: true,
      data: masterAdmin.aws_settings || {}
    });
  } catch (error) {
    console.error('Get AWS settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AWS settings'
    });
  }
};

// Get maintenance settings
const getMaintenanceSettings = async (req, res) => {
  try {
    const masterAdmin = await MasterAdmin.findById(req.user.id);
    
    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }

    res.json({
      success: true,
      data: masterAdmin.website_maintenance || {
        is_enabled: false,
        message: 'We are currently performing maintenance on our website. Please check back later.',
        end_time: null,
        modules: []
      }
    });
  } catch (error) {
    console.error('Get maintenance settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance settings'
    });
  }
};

// Update maintenance settings
const updateMaintenanceSettings = async (req, res) => {
  try {
    const masterAdmin = await MasterAdmin.findById(req.user.id);
    
    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }

    masterAdmin.website_maintenance = req.body;
    await masterAdmin.save();

    // Log the event
    await logEvent({
      event_type: 'system_operation',
      event_action: 'maintenance_settings_updated',
      event_description: 'Website maintenance settings updated by master admin',
      user_id: req.user.id,
      user_role: req.user.role,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: masterAdmin.website_maintenance,
      message: 'Maintenance settings updated successfully'
    });
  } catch (error) {
    console.error('Update maintenance settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance settings'
    });
  }
};

module.exports = {
  getDashboard,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  toggleCompanyStatus,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  updateProfile,
  updateSmtpSettings,
  testSmtp,
  updateAwsSettings,
  testAwsConnection,
  getAwsSettings,
  getMaintenanceSettings,
  updateMaintenanceSettings
};
