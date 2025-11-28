const AdVehicle = require('../models/AdvertiseVehicle');
const AdvertiseData = require('../models/AdvertiseData');
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

    // Fetch advertisements from AdvertiseData collection based on unique combination
    const advertisements = await AdvertiseData.find({
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id,
      dealership_id: vehicle.dealership_id,
      vehicle_type: vehicle.vehicle_type
    }).sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: advertisements
    });

  } catch (error) {
    console.error('Get vehicle advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving advertisements'
    });
  }
};

// @desc    Create or Update advertisement for a platform (Upsert based on unique combination)
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

    // Find existing advertisement based on unique combination
    const existingAd = await AdvertiseData.findOne({
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id,
      dealership_id: vehicle.dealership_id,
      vehicle_type: vehicle.vehicle_type,
      provider: advertisementData.provider
    });

    let advertisement;
    let isNew = false;

    if (existingAd) {
      // Update existing advertisement
      if (!existingAd.history) {
        existingAd.history = [];
      }
      
      existingAd.history.push({
        payload: JSON.parse(JSON.stringify(existingAd.payload)),
        updated_by: req.user.id,
        updated_at: new Date()
      });

      existingAd.payload = advertisementData.payload;
      existingAd.updated_by = req.user.id;
      existingAd.status = 'draft'; // Reset to draft on update
      
      advertisement = await existingAd.save();
    } else {
      // Create new advertisement
      isNew = true;
      advertisement = new AdvertiseData({
        vehicle_stock_id: vehicle.vehicle_stock_id,
        company_id: req.user.company_id,
        dealership_id: vehicle.dealership_id,
        vehicle_type: vehicle.vehicle_type,
        provider: advertisementData.provider,
        status: 'draft',
        is_active: true,
        payload: advertisementData.payload,
        created_by: req.user.id
      });

      await advertisement.save();
    }

    // Update vehicle with advertisement data (only ID and basic info)
    const adFieldName = advertisementData.provider === 'OnlyCars' ? 'onlycars_advertise_data' : 'trademe_advertise_data';
    vehicle[adFieldName] = {
      advertise_data_id: advertisement._id,
      status: advertisement.status,
      published_at: advertisement.published_at,
      external_listing_id: advertisement.external_listing_id,
      last_updated: new Date()
    };
    await vehicle.save();

    console.log('='.repeat(80));
    console.log(`ADVERTISEMENT PAYLOAD - ${isNew ? 'CREATED' : 'UPDATED'}`);
    console.log('Advertisement ID saved to vehicle:', advertisement._id);
    console.log('='.repeat(80));

    await logEvent({
      event_type: 'ad_publishing',
      event_action: isNew ? 'advertisement_draft_created' : 'advertisement_draft_updated',
      event_description: `Advertisement draft ${isNew ? 'created' : 'updated'} for ${advertisementData.provider}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      resource_type: 'advertisement',
      resource_id: advertisement._id.toString(),
      severity: 'info',
      status: 'success',
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider: advertisementData.provider,
        advertisement_id: advertisement._id.toString()
      }
    });

    res.status(isNew ? 201 : 200).json({
      success: true,
      message: `Advertisement draft ${isNew ? 'created' : 'updated'} successfully`,
      data: advertisement
    });

  } catch (error) {
    console.error('Create/Update advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating/updating advertisement'
    });
  }
};

// @desc    Update advertisement (with provider change support - creates new if provider changed)
// @route   PUT /api/adpublishing/:vehicleId/advertisements/:advertisementId
// @access  Private
const updateAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const updateData = req.body;

    console.log('Update Advertisement Request:', {
      vehicleId,
      advertisementId,
      hasPayload: !!updateData.payload,
      newProvider: updateData.provider
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

    // Find the current advertisement
    const currentAd = await AdvertiseData.findOne({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    });

    if (!currentAd) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Check if provider is being changed
    const providerChanged = updateData.provider && updateData.provider !== currentAd.provider;

    if (providerChanged) {
      // Provider changed - find or create new advertisement with new provider
      const newProviderAd = await AdvertiseData.findOne({
        vehicle_stock_id: vehicle.vehicle_stock_id,
        company_id: req.user.company_id,
        dealership_id: vehicle.dealership_id,
        vehicle_type: vehicle.vehicle_type,
        provider: updateData.provider
      });

      if (newProviderAd) {
        // Update existing advertisement with new provider
        if (!newProviderAd.history) {
          newProviderAd.history = [];
        }
        
        newProviderAd.history.push({
          payload: JSON.parse(JSON.stringify(newProviderAd.payload)),
          updated_by: req.user.id,
          updated_at: new Date()
        });

        newProviderAd.payload = updateData.payload;
        newProviderAd.updated_by = req.user.id;
        newProviderAd.status = 'draft';
        
        await newProviderAd.save();

        console.log('='.repeat(80));
        console.log('PROVIDER CHANGED - UPDATED EXISTING ADVERTISEMENT');
        console.log('Old Provider:', currentAd.provider);
        console.log('New Provider:', updateData.provider);
        console.log('='.repeat(80));

        await logEvent({
          event_type: 'ad_publishing',
          event_action: 'advertisement_provider_changed',
          event_description: `Advertisement provider changed from ${currentAd.provider} to ${updateData.provider}`,
          user_id: req.user.id,
          company_id: req.user.company_id,
          user_role: req.user.role,
          resource_type: 'advertisement',
          resource_id: newProviderAd._id.toString(),
          severity: 'info',
          status: 'success',
          metadata: {
            vehicle_stock_id: vehicle.vehicle_stock_id,
            old_provider: currentAd.provider,
            new_provider: updateData.provider,
            advertisement_id: newProviderAd._id.toString()
          }
        });

        return res.status(200).json({
          success: true,
          message: 'Advertisement updated with new provider',
          data: newProviderAd
        });
      } else {
        // Create new advertisement with new provider
        const newAd = new AdvertiseData({
          vehicle_stock_id: vehicle.vehicle_stock_id,
          company_id: req.user.company_id,
          dealership_id: vehicle.dealership_id,
          vehicle_type: vehicle.vehicle_type,
          provider: updateData.provider,
          status: 'draft',
          is_active: true,
          payload: updateData.payload,
          created_by: req.user.id
        });

        await newAd.save();

        console.log('='.repeat(80));
        console.log('PROVIDER CHANGED - CREATED NEW ADVERTISEMENT');
        console.log('Old Provider:', currentAd.provider);
        console.log('New Provider:', updateData.provider);
        console.log('='.repeat(80));

        await logEvent({
          event_type: 'ad_publishing',
          event_action: 'advertisement_provider_changed',
          event_description: `Advertisement provider changed from ${currentAd.provider} to ${updateData.provider}. New advertisement created`,
          user_id: req.user.id,
          company_id: req.user.company_id,
          user_role: req.user.role,
          resource_type: 'advertisement',
          resource_id: newAd._id.toString(),
          severity: 'info',
          status: 'success',
          metadata: {
            vehicle_stock_id: vehicle.vehicle_stock_id,
            old_provider: currentAd.provider,
            new_provider: updateData.provider,
            advertisement_id: newAd._id.toString()
          }
        });

        return res.status(201).json({
          success: true,
          message: 'Advertisement created with new provider',
          data: newAd
        });
      }
    } else {
      // Provider unchanged - update current advertisement
      if (!currentAd.history) {
        currentAd.history = [];
      }
      
      currentAd.history.push({
        payload: JSON.parse(JSON.stringify(currentAd.payload)),
        updated_by: req.user.id,
        updated_at: new Date()
      });
      
      currentAd.payload = updateData.payload;
      currentAd.updated_by = req.user.id;
      
      await currentAd.save();

      console.log('='.repeat(80));
      console.log('ADVERTISEMENT PAYLOAD - UPDATED');
      console.log('='.repeat(80));

      await logEvent({
        event_type: 'ad_publishing',
        event_action: 'advertisement_updated',
        event_description: `Advertisement updated for ${currentAd.provider}`,
        user_id: req.user.id,
        company_id: req.user.company_id,
        user_role: req.user.role,
        resource_type: 'advertisement',
        resource_id: currentAd._id.toString(),
        severity: 'info',
        status: 'success',
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          provider: currentAd.provider,
          advertisement_id: currentAd._id.toString()
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Advertisement updated successfully',
        data: currentAd
      });
    }

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

    // Find advertisement in AdvertiseData collection
    const advertisement = await AdvertiseData.findOne({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

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

    // Track API call duration
    const startTime = Date.now();
    
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
      advertisement.payload = updatedPayload;
      await advertisement.save();

      console.log('='.repeat(80));
      console.log('PAYLOAD SAVED TO DATABASE BEFORE API CALL');
      console.log('='.repeat(80));
      console.log('Yard ID saved:', updatedPayload.yard_id);
      console.log('Dealer Name saved:', updatedPayload.dealer_name);
      console.log('Updated Payload:', JSON.stringify(updatedPayload, null, 2));
      console.log('='.repeat(80));

      // Step 3: Now make the API call with the updated payload and track duration
      let publishResult;
      
      if (provider === 'OnlyCars') {
        publishResult = await callOnlyCarsAPI(updatedPayload, req.user.company_id);
      } else if (provider === 'TradeMe') {
        publishResult = await callTradeMeAPI(updatedPayload, req.user.company_id);
      }
      
      const duration = Date.now() - startTime;

      // Step 4: Update status to published after successful API call
      advertisement.status = 'published';
      advertisement.published_at = new Date();
      advertisement.published_by = req.user.id;
      advertisement.external_listing_id = publishResult.listing_id || null;
      
      // Store API response inside payload with proper format
      advertisement.payload = {
        ...advertisement.payload,
        api_response: {
          success: true,
          message: `Successfully published to ${provider}`,
          data: publishResult.response,
          listing_id: publishResult.listing_id,
          timestamp: new Date().toISOString()
        }
      };
      advertisement.markModified('payload');

      await advertisement.save();

      // Update vehicle with published status
      const adFieldName = provider === 'OnlyCars' ? 'onlycars_advertise_data' : 'trademe_advertise_data';
      vehicle[adFieldName] = {
        advertise_data_id: advertisement._id,
        status: 'published',
        published_at: advertisement.published_at,
        external_listing_id: publishResult.listing_id,
        last_updated: new Date()
      };
      await vehicle.save();

      console.log('='.repeat(80));
      console.log('ADVERTISEMENT PUBLISHED SUCCESSFULLY');
      console.log('Provider:', provider);
      console.log('External Listing ID:', publishResult.listing_id);
      console.log('='.repeat(80));

      await logEvent({
        event_type: 'ad_publishing',
        event_action: 'advertisement_published',
        event_description: `Advertisement published to ${provider} successfully`,
        user_id: req.user.id,
        company_id: req.user.company_id,
        user_role: req.user.role,
        resource_type: 'advertisement',
        resource_id: advertisement._id.toString(),
        severity: 'info',
        status: 'success',
        response_time_ms: duration,
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          provider,
          external_listing_id: publishResult.listing_id,
          advertisement_id: advertisement._id.toString(),
          api_response: {
            success: true,
            listing_id: publishResult.listing_id,
            response_data: publishResult.response
          }
        }
      });

      res.status(200).json({
        success: true,
        message: `Advertisement published to ${provider} successfully`,
        data: advertisement
      });

    } catch (publishError) {
      // Calculate duration even for failures
      const duration = Date.now() - startTime;
      
      // Update status to failed (payload is already saved with yard_id from Step 2)
      advertisement.status = 'failed';
      
      // Store error response inside payload with proper API response format
      advertisement.payload = {
        ...advertisement.payload,
        api_response: {
          success: false,
          message: `Failed to publish to ${provider}: ${publishError.message}`,
          error: {
            type: publishError.name || 'PublishError',
            message: publishError.message,
            code: publishError.code || publishError.response?.status || null,
            details: publishError.response?.data || null
          },
          timestamp: new Date().toISOString()
        }
      };
      advertisement.markModified('payload');
      
      await advertisement.save();

      // Update vehicle with failed status
      const adFieldName = provider === 'OnlyCars' ? 'onlycars_advertise_data' : 'trademe_advertise_data';
      vehicle[adFieldName] = {
        advertise_data_id: advertisement._id,
        status: 'failed',
        published_at: null,
        external_listing_id: null,
        last_updated: new Date()
      };
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
        resource_type: 'advertisement',
        resource_id: advertisement._id.toString(),
        severity: 'error',
        status: 'failure',
        error_message: publishError.message,
        response_time_ms: duration,
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          provider,
          error: publishError.message,
          advertisement_id: advertisement._id.toString(),
          api_response: {
            success: false,
            error: publishError.message,
            error_details: publishError.response?.data || publishError.toString()
          }
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

  if (!integration) {
    throw new Error('OnlyCars Publish integration is not configured for this company.');
  }

  // Get active environment configuration
  const activeEnv = integration.active_environment || 'production';
  const envConfig = integration.environments[activeEnv];

  if (!envConfig || !envConfig.is_active) {
    throw new Error(`OnlyCars ${activeEnv} environment is not active.`);
  }

  const config = envConfig.configuration;

  if (!config.api_key || !config.base_url) {
    throw new Error('OnlyCars API credentials (api_key and base_url) are not configured.');
  }

  // Use the active environment's API URL and key
  const apiUrl = config.base_url;
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
    // Make API call to OnlyCars with the active environment's endpoint
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

    // Find and delete advertisement from AdvertiseData collection
    const advertisement = await AdvertiseData.findOneAndDelete({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Remove advertisement data from vehicle
    const adFieldName = advertisement.provider === 'OnlyCars' ? 'onlycars_advertise_data' : 'trademe_advertise_data';
    vehicle[adFieldName] = undefined;
    await vehicle.save();

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'advertisement_deleted',
      event_description: `Advertisement deleted for ${advertisement.provider}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      resource_type: 'advertisement',
      resource_id: advertisement._id.toString(),
      severity: 'info',
      status: 'success',
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider: advertisement.provider,
        advertisement_id: advertisement._id.toString()
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

    // Find advertisement in AdvertiseData collection
    const advertisement = await AdvertiseData.findOne({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Update status to sold (withdrawn)
    advertisement.status = 'sold';
    advertisement.withdrawn_at = new Date();
    advertisement.withdrawn_by = req.user.id;
    advertisement.is_active = false;

    await advertisement.save();

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
      event_description: `Advertisement withdrawn from ${advertisement.provider}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      resource_type: 'advertisement',
      resource_id: advertisement._id.toString(),
      severity: 'info',
      status: 'success',
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider: advertisement.provider,
        advertisement_id: advertisement._id.toString()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement withdrawn successfully',
      data: advertisement
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
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Find advertisement in AdvertiseData collection
    const advertisement = await AdvertiseData.findOne({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    }).populate('history.updated_by', 'name email');

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

// @desc    Get advertisement activity logs
// @route   GET /api/adpublishing/:vehicleId/advertisements/:advertisementId/logs
// @access  Private
const getAdvertisementLogs = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const { event_action, limit = 50 } = req.query;

    const vehicle = await AdVehicle.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Find advertisement to verify it exists and belongs to this company
    const advertisement = await AdvertiseData.findOne({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Import GlobalLog model
    const GlobalLog = require('../models/GlobalLog');

    // Build filter for logs
    const filter = {
      event_type: 'ad_publishing',
      company_id: req.user.company_id,
      $or: [
        { resource_id: advertisementId },
        { 'metadata.advertisement_id': advertisementId }
      ]
    };

    if (event_action && event_action !== 'all') {
      filter.event_action = event_action;
    }

    // Fetch logs
    const logs = await GlobalLog.find(filter)
      .populate('user_id', 'username email first_name last_name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('Get advertisement logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving advertisement logs'
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
  getAdvertisementHistory,
  getAdvertisementLogs
};
