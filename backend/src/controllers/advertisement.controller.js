const AdVehicle = require('../models/AdvertiseVehicle');
const { logEvent } = require('./logs.controller');
const axios = require('axios');

// @desc    Get all advertisement platforms for a vehicle
// @route   GET /api/adpublishing/:vehicleId/advertisements
// @access  Private
const getVehicleAdvertisements = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    }).populate('dealership_id', 'dealership_name');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle.advertisement_platforms || []
    });

  } catch (error) {
    console.error('Get vehicle advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving advertisements'
    });
  }
};

// @desc    Create advertisement for a platform
// @route   POST /api/adpublishing/:vehicleId/advertisements
// @access  Private
const createAdvertisement = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const advertisementData = req.body;

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    }).populate('dealership_id', 'dealership_name');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Allow multiple advertisements per provider - no check for existing platform

    // Create new advertisement entry
    const newAdvertisement = {
      provider: advertisementData.provider,
      status: 'draft',
      is_active: true,
      payload: advertisementData.payload,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Initialize advertisement_platforms if it doesn't exist
    if (!vehicle.advertisement_platforms) {
      vehicle.advertisement_platforms = [];
    }

    vehicle.advertisement_platforms.push(newAdvertisement);
    await vehicle.save();

    // Log the payload for debugging
    console.log('='.repeat(80));
    console.log('ADVERTISEMENT PAYLOAD - DRAFT CREATED');

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'advertisement_draft_created',
      event_description: `Advertisement draft created for ${advertisementData.provider}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider: advertisementData.provider
      }
    });

    res.status(201).json({
      success: true,
      message: 'Advertisement draft created successfully',
      data: newAdvertisement
    });

  } catch (error) {
    console.error('Create advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating advertisement'
    });
  }
};

// @desc    Update advertisement
// @route   PUT /api/adpublishing/:vehicleId/advertisements/:advertisementId
// @access  Private
const updateAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const updateData = req.body;

    console.log('Update Advertisement Request:', {
      vehicleId,
      advertisementId,
      hasPayload: !!updateData.payload
    });

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    }).populate('dealership_id', 'dealership_name');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const advertisementIndex = vehicle.advertisement_platforms?.findIndex(
      ad => ad._id.toString() === advertisementId
    );

    console.log('Advertisement Index:', advertisementIndex);
    console.log('Total Advertisements:', vehicle.advertisement_platforms?.length);

    if (advertisementIndex === -1 || advertisementIndex === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    const provider = vehicle.advertisement_platforms[advertisementIndex].provider;

    // Update the advertisement - use direct property assignment for Mongoose subdocuments
    const advertisement = vehicle.advertisement_platforms[advertisementIndex];
    
    // Save current payload to history before updating
    if (!advertisement.history) {
      advertisement.history = [];
    }
    
    advertisement.history.push({
      payload: JSON.parse(JSON.stringify(advertisement.payload)), // Deep clone the current payload
      updated_by: req.user.id,
      updated_at: new Date()
    });
    
    // Update with new payload
    advertisement.payload = updateData.payload;
    advertisement.updated_at = new Date();
    advertisement.updated_by = req.user.id;
    
    // Mark the subdocument as modified
    vehicle.markModified('advertisement_platforms');
    
    await vehicle.save();

    // Log the updated payload
    console.log('='.repeat(80));
    console.log('ADVERTISEMENT PAYLOAD - UPDATED');

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'advertisement_updated',
      event_description: `Advertisement updated for ${provider}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider
      }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      data: vehicle.advertisement_platforms[advertisementIndex]
    });

  } catch (error) {
    console.error('Update advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating advertisement'
    });
  }
};

// @desc    Publish advertisement
// @route   POST /api/adpublishing/:vehicleId/advertisements/:advertisementId/publish
// @access  Private
const publishAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    }).populate('dealership_id', 'dealership_name');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const advertisementIndex = vehicle.advertisement_platforms?.findIndex(
      ad => ad._id.toString() === advertisementId
    );

    if (advertisementIndex === -1 || advertisementIndex === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    const advertisement = vehicle.advertisement_platforms[advertisementIndex];
    const provider = advertisement.provider;
    const payload = advertisement.payload;

    // Log the initial payload
    console.log('='.repeat(80));
    console.log('ADVERTISEMENT PAYLOAD - PREPARING TO PUBLISH');
    console.log('='.repeat(80));
    console.log('Provider:', provider);
    console.log('Vehicle Stock ID:', vehicle.vehicle_stock_id);
    console.log('Initial Payload:', JSON.stringify(payload, null, 2));
    console.log('='.repeat(80));

    try {
      let updatedPayload;

      // Step 1: Prepare the updated payload with yard_id and dealer_name BEFORE API call
      if (provider === 'OnlyCars') {
        updatedPayload = await prepareOnlyCarsPayload(payload, vehicle, req.user.company_id);
      } else if (provider === 'TradeMe') {
        updatedPayload = await prepareTradeMePayload(payload, vehicle, req.user.company_id);
      } else {
        throw new Error(`Publishing to ${provider} is not yet implemented`);
      }

      // Step 2: Save the updated payload to database FIRST
      vehicle.advertisement_platforms[advertisementIndex].payload = updatedPayload;
      vehicle.advertisement_platforms[advertisementIndex].updated_at = new Date();
      vehicle.markModified(`advertisement_platforms.${advertisementIndex}.payload`);
      
      await vehicle.save();

      console.log('='.repeat(80));
      console.log('PAYLOAD SAVED TO DATABASE BEFORE API CALL');
      console.log('='.repeat(80));
      console.log('Yard ID saved:', updatedPayload.yard_id);
      console.log('Dealer Name saved:', updatedPayload.dealer_name);
      console.log('Updated Payload:', JSON.stringify(updatedPayload, null, 2));
      console.log('='.repeat(80));

      // Step 3: Now make the API call with the updated payload
      let publishResult;
      
      if (provider === 'OnlyCars') {
        publishResult = await callOnlyCarsAPI(updatedPayload, req.user.company_id);
      } else if (provider === 'TradeMe') {
        publishResult = await callTradeMeAPI(updatedPayload, req.user.company_id);
      }

      // Step 4: Update status to published after successful API call
      vehicle.advertisement_platforms[advertisementIndex].status = 'published';
      vehicle.advertisement_platforms[advertisementIndex].published_at = new Date();
      vehicle.advertisement_platforms[advertisementIndex].published_by = req.user.id;
      vehicle.advertisement_platforms[advertisementIndex].updated_at = new Date();
      vehicle.advertisement_platforms[advertisementIndex].external_listing_id = 
        publishResult.listing_id || null;
      vehicle.advertisement_platforms[advertisementIndex].error_message = null;

      await vehicle.save();

      console.log('='.repeat(80));
      console.log('ADVERTISEMENT PUBLISHED SUCCESSFULLY');
      console.log('Provider:', provider);
      console.log('External Listing ID:', publishResult.listing_id);
      console.log('='.repeat(80));

      await logEvent({
        event_type: 'ad_publishing',
        event_action: 'advertisement_published',
        event_description: `Advertisement published to ${provider}`,
        user_id: req.user.id,
        company_id: req.user.company_id,
        user_role: req.user.role,
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          provider,
          external_listing_id: publishResult.listing_id
        }
      });

      res.status(200).json({
        success: true,
        message: `Advertisement published to ${provider} successfully`,
        data: vehicle.advertisement_platforms[advertisementIndex]
      });

    } catch (publishError) {
      // Update status to failed (payload is already saved with yard_id from Step 2)
      vehicle.advertisement_platforms[advertisementIndex].status = 'failed';
      vehicle.advertisement_platforms[advertisementIndex].error_message = publishError.message;
      vehicle.advertisement_platforms[advertisementIndex].updated_at = new Date();
      
      await vehicle.save();

      console.error('='.repeat(80));
      console.error('PUBLISH ERROR - Payload already saved with yard_id');
      console.error('='.repeat(80));
      console.error('Error:', publishError.message);
      console.error('='.repeat(80));

      await logEvent({
        event_type: 'ad_publishing',
        event_action: 'advertisement_publish_failed',
        event_description: `Failed to publish to ${provider}: ${publishError.message}`,
        user_id: req.user.id,
        company_id: req.user.company_id,
        user_role: req.user.role,
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          provider,
          error: publishError.message
        }
      });

      return res.status(500).json({
        success: false,
        message: `Failed to publish to ${provider}: ${publishError.message}`
      });
    }

  } catch (error) {
    console.error('Publish advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing advertisement'
    });
  }
};

// Helper function to prepare OnlyCars payload with yard_id and dealer_name
async function prepareOnlyCarsPayload(payload, vehicle, companyId) {
  const Integration = require('../models/Integration');
  
  // 1. Fetch OnlyCars Integration configuration
  const integration = await Integration.findOne({
    company_id: companyId,
    integration_type: 'onlycars_publish_integration',
    is_active: true
  });

  if (!integration) {
    throw new Error('OnlyCars Publish integration is not configured for this company. Please configure it in the Integration module.');
  }

  // 2. Get active environment configuration
  const activeEnv = integration.active_environment || 'production';
  const envConfig = integration.environments[activeEnv];

  if (!envConfig || !envConfig.is_active) {
    throw new Error(`OnlyCars ${activeEnv} environment is not active. Please activate it in the Integration module.`);
  }

  const config = envConfig.configuration;

  if (!config.api_key || !config.base_url) {
    throw new Error('OnlyCars API credentials (api_key and base_url) are not configured. Please configure them in the Integration module.');
  }

  if (!config.dealers || config.dealers.length === 0) {
    throw new Error('No dealer configurations found. Please add dealer credentials in the Integration module.');
  }

  // 3. Get dealership name from vehicle
  const dealershipName = vehicle.dealership_id?.dealership_name || vehicle.dealership_id;
  
  if (!dealershipName) {
    throw new Error('Vehicle does not have a dealership assigned.');
  }

  console.log('='.repeat(80));
  console.log('LOOKING FOR DEALER CONFIGURATION');
  console.log('='.repeat(80));
  console.log('Vehicle Dealership:', dealershipName);
  console.log('Available Dealers:', config.dealers.map(d => d.dealership_name).join(', '));
  console.log('='.repeat(80));

  // 4. Find matching dealer configuration by dealership_name
  const dealer = config.dealers.find(d => 
    d.dealership_name && 
    d.dealership_name.toLowerCase().trim() === dealershipName.toLowerCase().trim()
  );

  if (!dealer) {
    throw new Error(`No yard configuration found for dealership "${dealershipName}". Please add this dealer in the OnlyCars Integration module.`);
  }

  if (!dealer.yard_id) {
    throw new Error(`Yard ID is missing for dealership "${dealershipName}". Please configure it in the Integration module.`);
  }

  console.log('='.repeat(80));
  console.log('DEALER CONFIGURATION FOUND');
  console.log('='.repeat(80));
  console.log('Dealership Name:', dealer.dealership_name);
  console.log('Yard ID:', dealer.yard_id);
  console.log('='.repeat(80));

  // 5. Prepare payload with yard_id and dealer_name
  const updatedPayload = {
    ...payload,
    dealer_name: dealer.dealership_name,
    yard_id: dealer.yard_id
  };

  return updatedPayload;
}

// Helper function to make API call to OnlyCars
async function callOnlyCarsAPI(payload, companyId) {
  const Integration = require('../models/Integration');
  
  // Fetch integration config for API credentials
  const integration = await Integration.findOne({
    company_id: companyId,
    integration_type: 'onlycars_publish_integration',
    is_active: true
  });

  const activeEnv = integration.active_environment || 'production';
  const config = integration.environments[activeEnv].configuration;

  // Prepare API endpoint and headers
  const apiUrl = config.base_url.endsWith('/') 
    ? config.base_url + 'api/import/item' 
    : config.base_url + '/api/import/item';

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.api_key}`
  };

  console.log('='.repeat(80));
  console.log('SENDING TO ONLYCARS API');
  console.log('='.repeat(80));
  console.log('Environment:', activeEnv);
  console.log('URL:', apiUrl);
  console.log('Dealer Name:', payload.dealer_name);
  console.log('Yard ID:', payload.yard_id);
  console.log('Final Payload:', JSON.stringify(payload, null, 2));
  console.log('='.repeat(80));

  try {
    // Make API call to OnlyCars
    const response = await axios.post(apiUrl, payload, {
      headers: authHeaders,
      timeout: 30000 // 30 second timeout
    });

    console.log('='.repeat(80));
    console.log('ONLYCARS API RESPONSE - SUCCESS');
    console.log('='.repeat(80));
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('='.repeat(80));

    return {
      success: true,
      listing_id: response.data?.item_id || payload.item_id,
      response: response.data
    };
  } catch (error) {
    console.error('='.repeat(80));
    console.error('ONLYCARS API ERROR');
    console.error('='.repeat(80));
    console.error('Error:', error.response?.data || error.message);
    console.error('='.repeat(80));
    throw error;
  }
}

// Helper function to prepare TradeMe payload
async function prepareTradeMePayload(payload, vehicle, companyId) {
  // TODO: Implement TradeMe integration similar to OnlyCars
  // 1. Fetch TradeMe Integration configuration
  // 2. Get active environment configuration
  // 3. Match dealer by dealership_name
  // 4. Prepare payload with dealer credentials
  
  throw new Error('TradeMe publishing integration coming soon');
}

// Helper function to make API call to TradeMe
async function callTradeMeAPI(payload, companyId) {
  // TODO: Implement TradeMe API call
  // 1. Fetch TradeMe Integration configuration
  // 2. Get API credentials
  // 3. Make API call to TradeMe
  
  throw new Error('TradeMe publishing integration coming soon');
}

// @desc    Delete advertisement
// @route   DELETE /api/adpublishing/:vehicleId/advertisements/:advertisementId
// @access  Private
const deleteAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    }).populate('dealership_id', 'dealership_name');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const advertisementIndex = vehicle.advertisement_platforms?.findIndex(
      ad => ad._id.toString() === advertisementId
    );

    if (advertisementIndex === -1 || advertisementIndex === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    const provider = vehicle.advertisement_platforms[advertisementIndex].provider;

    // Remove the advertisement
    vehicle.advertisement_platforms.splice(advertisementIndex, 1);
    await vehicle.save();

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'advertisement_deleted',
      event_description: `Advertisement deleted for ${provider}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider
      }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully'
    });

  } catch (error) {
    console.error('Delete advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting advertisement'
    });
  }
};

// @desc    Withdraw advertisement (mark as sold)
// @route   POST /api/adpublishing/:vehicleId/advertisements/:advertisementId/withdraw
// @access  Private
const withdrawAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    }).populate('dealership_id', 'dealership_name');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const advertisementIndex = vehicle.advertisement_platforms?.findIndex(
      ad => ad._id.toString() === advertisementId
    );

    if (advertisementIndex === -1 || advertisementIndex === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    const advertisement = vehicle.advertisement_platforms[advertisementIndex];

    // Update status to sold (withdrawn)
    vehicle.advertisement_platforms[advertisementIndex].status = 'sold';
    vehicle.advertisement_platforms[advertisementIndex].withdrawn_at = new Date();
    vehicle.advertisement_platforms[advertisementIndex].withdrawn_by = req.user.id;
    vehicle.advertisement_platforms[advertisementIndex].updated_at = new Date();
    vehicle.advertisement_platforms[advertisementIndex].is_active = false;

    await vehicle.save();

    console.log('='.repeat(80));
    console.log('ADVERTISEMENT WITHDRAWN');
    console.log('='.repeat(80));
    console.log('Provider:', advertisement.provider);
    console.log('Vehicle Stock ID:', vehicle.vehicle_stock_id);
    console.log('Status: SOLD (WITHDRAWN)');
    console.log('Withdrawn At:', new Date().toISOString());
    console.log('='.repeat(80));

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'advertisement_withdrawn',
      event_description: `Advertisement withdrawn for ${advertisement.provider}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider: advertisement.provider
      }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement withdrawn successfully',
      data: vehicle.advertisement_platforms[advertisementIndex]
    });

  } catch (error) {
    console.error('Withdraw advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing advertisement'
    });
  }
};

// @desc    Get advertisement history
// @route   GET /api/adpublishing/:vehicleId/advertisements/:advertisementId/history
// @access  Private
const getAdvertisementHistory = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    }).populate('advertisement_platforms.history.updated_by', 'name email');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const advertisement = vehicle.advertisement_platforms?.find(
      ad => ad._id.toString() === advertisementId
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: advertisement.history || []
    });

  } catch (error) {
    console.error('Get advertisement history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving advertisement history'
    });
  }
};

module.exports = {
  getVehicleAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  publishAdvertisement,
  deleteAdvertisement,
  withdrawAdvertisement,
  getAdvertisementHistory
};
