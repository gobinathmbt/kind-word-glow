const { logEvent } = require('./logs.controller');
const { logActivity, calculateChanges } = require('./vehicleActivityLog.controller');
const axios = require('axios');

// Helper: Find vehicle by ID and company
const findVehicle = async (vehicleId, companyId, req) => {
  const AdVehicle = req.getModel('AdvertiseVehicle');
  const Dealership = req.getModel('Dealership'); // Ensure Dealership model is created
  return await AdVehicle.findOne({
    _id: vehicleId,
    company_id: companyId,
    vehicle_type: 'advertisement'
  }).populate('dealership_id', 'dealership_name');
};

// Helper: Find advertisement by ID
const findAdvertisement = async (advertisementId, vehicleStockId, companyId, req) => {
  const AdvertiseData = req.getModel('AdvertiseData');
  return await AdvertiseData.findOne({
    _id: advertisementId,
    vehicle_stock_id: vehicleStockId,
    company_id: companyId
  });
};

// Helper: Update vehicle advertisement field (unified approach)
const updateVehicleAdField = async (vehicle, provider, adData) => {
  // Initialize advertisement_data array if it doesn't exist
  if (!vehicle.advertisement_data) {
    vehicle.advertisement_data = [];
  }

  // Find existing entry for this provider
  const existingIndex = vehicle.advertisement_data.findIndex(
    (ad) => ad.provider === provider
  );

  if (adData === undefined) {
    // Remove the entry if adData is undefined (for delete operation)
    if (existingIndex !== -1) {
      vehicle.advertisement_data.splice(existingIndex, 1);
    }
  } else {
    // Update or add the entry
    const adEntry = {
      provider,
      ...adData,
    };

    if (existingIndex !== -1) {
      vehicle.advertisement_data[existingIndex] = adEntry;
    } else {
      vehicle.advertisement_data.push(adEntry);
    }
  }

  vehicle.markModified('advertisement_data');
  await vehicle.save();
};

// Helper: Add to advertisement history
const addToHistory = (advertisement, userId) => {
  if (!advertisement.history) {
    advertisement.history = [];
  }
  advertisement.history.push({
    payload: JSON.parse(JSON.stringify(advertisement.payload)),
    updated_by: userId,
    updated_at: new Date()
  });
};

// Helper: Standard error response
const errorResponse = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, message });
};

// @desc    Get all advertisement platforms for a vehicle
// @route   GET /api/adpublishing/:vehicleId/advertisements
// @access  Private
const getVehicleAdvertisements = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);

    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    const AdvertiseData = req.getModel('AdvertiseData');
    const advertisements = await AdvertiseData.find({
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id,
      dealership_id: vehicle.dealership_id,
      vehicle_type: vehicle.vehicle_type
    }).sort({ created_at: -1 });

    res.status(200).json({ success: true, data: advertisements });

  } catch (error) {
    console.error('Get vehicle advertisements error:', error);
    errorResponse(res, 500, 'Error retrieving advertisements');
  }
};

// Helper function to auto-populate payload from vehicle data
function autoPopulatePayload(payload, vehicle, provider) {
  // Only auto-populate for TradeMe
  if (provider !== 'TradeMe') {
    return payload;
  }

  // Ensure payload is an object
  if (!payload || typeof payload !== 'object') {
    payload = {};
  }

  // Auto-populate missing fields from vehicle data
  if (!payload.stockNumber && vehicle.vehicle_stock_id) {
    payload.stockNumber = vehicle.vehicle_stock_id.toString();
  }

  if (!payload.manufacturerId && !payload.make && vehicle.make) {
    payload.manufacturerId = vehicle.make;
  }

  if (!payload.modelId && !payload.model && vehicle.model) {
    payload.modelId = vehicle.model;
  }

  if (!payload.bodyTypeId && !payload.bodyType && vehicle.body_style) {
    payload.bodyTypeId = vehicle.body_style;
  }

  if (!payload.year && vehicle.year) {
    payload.year = vehicle.year;
  }

  if (!payload.odometer && vehicle.vehicle_odometer && vehicle.vehicle_odometer.length > 0) {
    payload.odometer = vehicle.vehicle_odometer[0].reading;
  }

  if (!payload.vin && vehicle.vin) {
    payload.vin = vehicle.vin;
  }

  if (!payload.registrationNumber && vehicle.plate_no) {
    payload.registrationNumber = vehicle.plate_no;
  }

  if (!payload.retailPrice && vehicle.vehicle_other_details && vehicle.vehicle_other_details.length > 0) {
    const otherDetails = vehicle.vehicle_other_details[0];
    const price = otherDetails.retail_price || otherDetails.purchase_price || otherDetails.sold_price;
    if (price && price > 0) {
      payload.retailPrice = price;
    }
  }

  return payload;
}

// @desc    Create or Update advertisement for a platform (Upsert based on unique combination)
// @route   POST /api/adpublishing/:vehicleId/advertisements
// @access  Private
const createAdvertisement = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const advertisementData = req.body;
    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);

    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    advertisementData.payload = autoPopulatePayload(
      advertisementData.payload,
      vehicle,
      advertisementData.provider
    );

    const AdvertiseData = req.getModel('AdvertiseData');
    const existingAd = await AdvertiseData.findOne({
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id,
      dealership_id: vehicle.dealership_id,
      vehicle_type: vehicle.vehicle_type,
      provider: advertisementData.provider
    });

    let oldAdSnapshot = null;
    let advertisement;
    let isNew = !existingAd;

    if (existingAd) {
      oldAdSnapshot = existingAd.toObject();
      addToHistory(existingAd, req.user.id);
      existingAd.payload = advertisementData.payload;
      existingAd.updated_by = req.user.id;
      existingAd.status = 'draft';
      advertisement = await existingAd.save();
    } else {
      advertisement = await new AdvertiseData({
        vehicle_stock_id: vehicle.vehicle_stock_id,
        company_id: req.user.company_id,
        dealership_id: vehicle.dealership_id,
        vehicle_type: vehicle.vehicle_type,
        provider: advertisementData.provider,
        status: 'draft',
        is_active: true,
        payload: advertisementData.payload,
        created_by: req.user.id
      }).save();
    }

    await updateVehicleAdField(vehicle, advertisementData.provider, {
      advertise_data_id: advertisement._id,
      status: advertisement.status,
      published_at: advertisement.published_at,
      external_listing_id: advertisement.external_listing_id,
      last_updated: new Date()
    });

    // Log Activity
    const changes = isNew ? [] : calculateChanges(oldAdSnapshot, advertisement);
    
    // Determine the most appropriate module name based on what changed
    let moduleName = 'Advertisement';
    
    if (!isNew && changes.length > 0) {
      // Define field categories for better grouping
      const payloadFields = ['payload'];
      const statusFields = ['status', 'published_at', 'external_listing_id'];
      const providerFields = ['provider'];
      const metadataFields = ['final_payload', 'api_response'];
      
      // Check which category of fields changed
      const hasPayloadChanges = changes.some(change => 
        payloadFields.some(field => change.field.includes(field))
      );
      const hasStatusChanges = changes.some(change => 
        statusFields.some(field => change.field.includes(field))
      );
      const hasProviderChanges = changes.some(change => 
        providerFields.some(field => change.field.includes(field))
      );
      const hasMetadataChanges = changes.some(change => 
        metadataFields.some(field => change.field.includes(field))
      );

      // Determine module name based on priority
      if (hasPayloadChanges) {
        moduleName = 'Advertisement Content';
      } else if (hasStatusChanges) {
        moduleName = 'Advertisement Status';
      } else if (hasProviderChanges) {
        moduleName = 'Advertisement Provider';
      } else if (hasMetadataChanges) {
        moduleName = 'Advertisement Response';
      }
    } else if (isNew) {
      moduleName = 'Advertisement Creation';
    }

    await logActivity({
      company_id: req.user.company_id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      vehicle_type: 'advertisement',
      module_name: moduleName,
      action: isNew ? 'create' : 'update',
      user_id: req.user.id,
      changes: isNew ? calculateChanges({}, advertisement) : changes,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        provider: advertisementData.provider,
        advertisement_id: advertisement._id
      }
    });

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
    errorResponse(res, 500, 'Error creating/updating advertisement');
  }
};

// Helper: Handle provider change logic
const handleProviderChange = async (vehicle, currentAd, updateData, userId, companyId, userRole, req) => {
  const AdvertiseData = req.getModel('AdvertiseData');
  const newProviderAd = await AdvertiseData.findOne({
    vehicle_stock_id: vehicle.vehicle_stock_id,
    company_id: companyId,
    dealership_id: vehicle.dealership_id,
    vehicle_type: vehicle.vehicle_type,
    provider: updateData.provider
  });

  let advertisement, statusCode, message;

  if (newProviderAd) {
    addToHistory(newProviderAd, userId);
    newProviderAd.payload = updateData.payload;
    newProviderAd.updated_by = userId;
    newProviderAd.status = 'draft';
    advertisement = await newProviderAd.save();
    statusCode = 200;
    message = 'Advertisement updated with new provider';
  } else {
    advertisement = await new AdvertiseData({
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: companyId,
      dealership_id: vehicle.dealership_id,
      vehicle_type: vehicle.vehicle_type,
      provider: updateData.provider,
      status: 'draft',
      is_active: true,
      payload: updateData.payload,
      created_by: userId
    }).save();
    statusCode = 201;
    message = 'Advertisement created with new provider';
  }

  await logEvent({
    event_type: 'ad_publishing',
    event_action: 'advertisement_provider_changed',
    event_description: `Advertisement provider changed from ${currentAd.provider} to ${updateData.provider}${newProviderAd ? '' : '. New advertisement created'}`,
    user_id: userId,
    company_id: companyId,
    user_role: userRole,
    resource_type: 'advertisement',
    resource_id: advertisement._id.toString(),
    severity: 'info',
    status: 'success',
    metadata: {
      vehicle_stock_id: vehicle.vehicle_stock_id,
      old_provider: currentAd.provider,
      new_provider: updateData.provider,
      advertisement_id: advertisement._id.toString()
    }
  });

  return { advertisement, statusCode, message };
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

    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);
    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    const currentAd = await findAdvertisement(advertisementId, vehicle.vehicle_stock_id, req.user.company_id, req);
    if (!currentAd) {
      return errorResponse(res, 404, 'Advertisement not found');
    }

    const providerChanged = updateData.provider && updateData.provider !== currentAd.provider;

    if (providerChanged) {
      const { advertisement, statusCode, message } = await handleProviderChange(
        vehicle, currentAd, updateData, req.user.id, req.user.company_id, req.user.role, req
      );
      return res.status(statusCode).json({ success: true, message, data: advertisement });
    }

    // Provider unchanged - update current advertisement
    const oldAdSnapshot = currentAd.toObject();
    addToHistory(currentAd, req.user.id);
    currentAd.payload = updateData.payload;
    currentAd.updated_by = req.user.id;
    await currentAd.save();

    const changes = calculateChanges(oldAdSnapshot, currentAd);

    if (changes.length > 0) {
      // Determine the most appropriate module name based on what changed
      let moduleName = 'Advertisement Update';
      
      // Define field categories for better grouping
      const payloadFields = ['payload'];
      const statusFields = ['status', 'published_at', 'external_listing_id'];
      const providerFields = ['provider'];
      const metadataFields = ['final_payload', 'api_response'];
      
      // Check which category of fields changed
      const hasPayloadChanges = changes.some(change => 
        payloadFields.some(field => change.field.includes(field))
      );
      const hasStatusChanges = changes.some(change => 
        statusFields.some(field => change.field.includes(field))
      );
      const hasProviderChanges = changes.some(change => 
        providerFields.some(field => change.field.includes(field))
      );
      const hasMetadataChanges = changes.some(change => 
        metadataFields.some(field => change.field.includes(field))
      );

      // Determine module name based on priority
      if (hasPayloadChanges) {
        moduleName = 'Advertisement Content';
      } else if (hasStatusChanges) {
        moduleName = 'Advertisement Status';
      } else if (hasProviderChanges) {
        moduleName = 'Advertisement Provider';
      } else if (hasMetadataChanges) {
        moduleName = 'Advertisement Response';
      }
      
      await logActivity({
        company_id: req.user.company_id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: 'advertisement',
        module_name: moduleName,
        action: 'update',
        user_id: req.user.id,
        changes: changes,
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          provider: currentAd.provider
        }
      });
    }

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

    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      data: currentAd
    });

  } catch (error) {
    console.error('Update advertisement error:', error);
    errorResponse(res, 500, 'Error updating advertisement');
  }
};

// Helper: Update advertisement status after publish
const updateAdvertisementStatus = async (advertisement, status, userId, publishResult = null) => {
  advertisement.status = status;

  if (status === 'published') {
    advertisement.published_at = new Date();
    advertisement.published_by = userId;
    advertisement.external_listing_id = publishResult?.listing_id || null;
  }

  await advertisement.save();
};

// Helper: Build final payload with API response
const buildFinalPayload = (apiPayload, success, provider, publishResult = null, error = null) => {
  const response = success ? {
    success: true,
    message: `Successfully published to ${provider}`,
    data: publishResult.response,
    listing_id: publishResult.listing_id,
    photos: apiPayload.Photos || [],
    timestamp: new Date().toISOString()
  } : {
    success: false,
    message: `Failed to publish to ${provider}: ${error.message}`,
    error: {
      type: error.name || 'PublishError',
      message: error.message,
      code: error.code || error.response?.status || null,
      details: error.response?.data || null
    },
    timestamp: new Date().toISOString()
  };

  return { ...apiPayload, api_response: response };
};

// @desc    Publish advertisement
// @route   POST /api/adpublishing/:vehicleId/advertisements/:advertisementId/publish
// @access  Private
const publishAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);

    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    const advertisement = await findAdvertisement(advertisementId, vehicle.vehicle_stock_id, req.user.company_id, req);

    if (!advertisement) {
      return errorResponse(res, 404, 'Advertisement not found');
    }

    const provider = advertisement.provider;
    let payload = advertisement.payload || {};

    const startTime = Date.now();
    let apiPayload;

    try {
      // Prepare API payload
      if (provider === 'OnlyCars') {
        apiPayload = await prepareOnlyCarsPayload(payload, vehicle, req.user.company_id);
      } else if (provider === 'TradeMe') {
        apiPayload = await prepareTradeMePayload(payload, vehicle, req.user.company_id);
      } else {
        throw new Error(`Publishing to ${provider} is not yet implemented`);
      }

      // Make API call
      let publishResult;
      if (provider === 'OnlyCars') {
        publishResult = await callOnlyCarsAPI(apiPayload, req.user.company_id);
      } else if (provider === 'TradeMe') {
        // For TradeMe, photos are already uploaded in prepareTradeMePayload
        // The PhotoIds are included in the apiPayload
        publishResult = await callTradeMeAPI(apiPayload, req.user.company_id);
      }

      const duration = Date.now() - startTime;

      // Update advertisement status
      await updateAdvertisementStatus(advertisement, 'published', req.user.id, publishResult);

      // Build and save final payload
      advertisement.final_payload = buildFinalPayload(apiPayload, true, provider, publishResult);

      // Update payload with dealer info for OnlyCars only
      if (provider === 'OnlyCars' && apiPayload.dealer_name) {
        advertisement.payload = {
          ...advertisement.payload,
          dealer_name: apiPayload.dealer_name,
          yard_id: apiPayload.yard_id
        };
        advertisement.markModified('payload');
      }

      advertisement.markModified('final_payload');
      await advertisement.save();

      // Update vehicle
      await updateVehicleAdField(vehicle, provider, {
        advertise_data_id: advertisement._id,
        status: 'published',
        published_at: advertisement.published_at,
        external_listing_id: publishResult.listing_id,
        last_updated: new Date()
      });

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
      const duration = Date.now() - startTime;

      // Update status to failed
      await updateAdvertisementStatus(advertisement, 'failed', req.user.id);

      // Build and save error payload
      if (apiPayload) {
        advertisement.final_payload = buildFinalPayload(apiPayload, false, provider, null, publishError);
        advertisement.markModified('final_payload');
      }

      // Update payload with dealer info for OnlyCars only
      if (provider === 'OnlyCars' && apiPayload?.dealer_name) {
        advertisement.payload = {
          ...advertisement.payload,
          dealer_name: apiPayload.dealer_name,
          yard_id: apiPayload.yard_id
        };
        advertisement.markModified('payload');
      }

      await advertisement.save();

      // Update vehicle with failed status
      await updateVehicleAdField(vehicle, provider, {
        advertise_data_id: advertisement._id,
        status: 'failed',
        published_at: null,
        external_listing_id: null,
        last_updated: new Date()
      });

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
    errorResponse(res, 500, 'Error publishing advertisement');
  }
};

// Helper: Get integration configuration
const getIntegrationConfig = async (companyId, integrationType) => {
  const Integration = require('../models/Integration');

  const integration = await Integration.findOne({
    company_id: companyId,
    integration_type: integrationType,
    is_active: true
  });

  if (!integration) {
    throw new Error(`${integrationType.replace('_', ' ')} is not configured for this company. Please configure it in the Integration module.`);
  }

  const activeEnv = integration.active_environment || 'production';
  const envConfig = integration.environments[activeEnv];

  if (!envConfig || !envConfig.is_active) {
    throw new Error(`${integrationType} ${activeEnv} environment is not active. Please activate it in the Integration module.`);
  }

  return { config: envConfig.configuration, activeEnv };
};

// Helper: Find dealer configuration
const findDealerConfig = (dealers, dealershipName) => {
  if (!dealers || dealers.length === 0) {
    throw new Error('No dealer configurations found. Please add dealer credentials in the Integration module.');
  }

  const dealer = dealers.find(d =>
    d.dealership_name &&
    d.dealership_name.toLowerCase().trim() === dealershipName.toLowerCase().trim()
  );

  if (!dealer) {
    throw new Error(`No configuration found for dealership "${dealershipName}". Please add this dealer in the Integration module.`);
  }

  return dealer;
};

// Helper function to prepare OnlyCars payload with yard_id and dealer_name
async function prepareOnlyCarsPayload(payload, vehicle, companyId) {
  const { config } = await getIntegrationConfig(companyId, 'onlycars_publish_integration');

  if (!config.api_key || !config.base_url) {
    throw new Error('OnlyCars API credentials (api_key and base_url) are not configured. Please configure them in the Integration module.');
  }

  const dealershipName = vehicle.dealership_id?.dealership_name || vehicle.dealership_id;
  if (!dealershipName) {
    throw new Error('Vehicle does not have a dealership assigned.');
  }

  const dealer = findDealerConfig(config.dealers, dealershipName);

  if (!dealer.yard_id) {
    throw new Error(`Yard ID is missing for dealership "${dealershipName}". Please configure it in the Integration module.`);
  }

  return {
    ...payload,
    dealer_name: dealer.dealership_name,
    yard_id: dealer.yard_id
  };
}

// Helper function to make API call to OnlyCars
async function callOnlyCarsAPI(payload, companyId) {
  const { config, activeEnv } = await getIntegrationConfig(companyId, 'onlycars_publish_integration');

  if (!config.api_key || !config.base_url) {
    throw new Error('OnlyCars API credentials (api_key and base_url) are not configured.');
  }

  console.log('='.repeat(80));
  console.log(`${activeEnv.toUpperCase()} - ONLYCARS API PAYLOAD`);
  console.log('='.repeat(80));
  console.log(JSON.stringify(payload, null, 2));
  console.log('='.repeat(80));

  const response = await axios.post(config.base_url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`
    },
    timeout: 30000
  });

  return {
    success: true,
    listing_id: response.data?.item_id || payload.item_id,
    response: response.data
  };
}

// Helper: Auto-populate TradeMe payload from vehicle data
const autoPopulateTradeMePayload = (payload, vehicle) => {
  const specs = vehicle.vehicle_specifications?.[0] || {};
  const engineTrans = vehicle.vehicle_eng_transmission?.[0] || {};
  const otherDetails = vehicle.vehicle_other_details?.[0] || {};

  // Basic fields
  if (!payload.stockNumber && vehicle.vehicle_stock_id) payload.stockNumber = vehicle.vehicle_stock_id.toString();
  if (!payload.manufacturerId && !payload.make && vehicle.make) payload.manufacturerId = vehicle.make;
  if (!payload.modelId && !payload.model && vehicle.model) payload.modelId = vehicle.model;
  if (!payload.year && vehicle.year) payload.year = vehicle.year;
  if (!payload.odometer && vehicle.vehicle_odometer?.[0]?.reading) payload.odometer = vehicle.vehicle_odometer[0].reading;
  if (!payload.vin && vehicle.vin) payload.vin = vehicle.vin;
  if (!payload.registrationNumber && vehicle.plate_no) payload.registrationNumber = vehicle.plate_no;
  if (!payload.chassis && vehicle.chassis) payload.chassis = vehicle.chassis;
  if (!payload.condition && vehicle.condition) payload.condition = vehicle.condition;

  // Type fields
  if (!payload.bodyTypeId && !payload.bodyType && vehicle.body_type) {
    payload.bodyType = vehicle.body_type;
    payload.bodyTypeId = vehicle.body_type;
  }
  if (!payload.fuelTypeId && !payload.fuelType && vehicle.fuel_type) {
    payload.fuelType = vehicle.fuel_type;
    payload.fuelTypeId = vehicle.fuel_type;
  }
  if (!payload.transmissionId && !payload.transmission && vehicle.transmission) {
    payload.transmission = vehicle.transmission;
    payload.transmissionId = vehicle.transmission;
  }

  // Specifications
  if (!payload.numberOfSeats && !payload.seats && specs.number_of_seats) {
    payload.numberOfSeats = specs.number_of_seats;
    payload.seats = specs.number_of_seats;
  }

  if (!payload.color && !payload.colour) {
    const colours = [specs.exterior_primary_color, specs.exterior_secondary_color, specs.interior_color]
      .filter(c => c).join(', ');
    if (colours) {
      payload.color = colours;
      payload.colour = colours;
    }
  }

  if (!payload.interior_features && !payload.interiorDetails && Array.isArray(specs.interior_features)) {
    payload.interior_features = specs.interior_features;
  }

  // Engine details
  if (!payload.engineSize && !payload.engine_size && engineTrans.engine_size) {
    payload.engineSize = engineTrans.engine_size;
    payload.engine_size = engineTrans.engine_size;
  }
  if (!payload.numberOfCylinders && !payload.cylinders && engineTrans.no_of_cylinders) {
    payload.numberOfCylinders = engineTrans.no_of_cylinders;
    payload.cylinders = engineTrans.no_of_cylinders;
  }

  // Price
  if (payload.PriceDisplay && !payload.retailPrice) {
    payload.retailPrice = payload.PriceDisplay;
  }
  if (!payload.retailPrice) {
    const price = otherDetails.retail_price || otherDetails.purchase_price || otherDetails.sold_price;
    if (price && price > 0) payload.retailPrice = price;
  }

  return payload;
};

// Helper function to upload photos first and get PhotoIds
async function uploadPhotosAndGetIds(photos, companyId) {
  if (!photos || photos.length === 0) {
    return [];
  }

  const FormData = require('form-data');
  const { config } = await getIntegrationConfig(companyId, 'trademe_publish_integration');

  // Validate photo upload URL
  if (!config.photo_upload_url) {
    throw new Error('Trade Me photo upload URL is not configured. Please add photo_upload_url in the Integration module.');
  }

  const credentials = {
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token: config.access_token,
    token_secret: config.token_secret
  };

  const photoIds = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    try {
      console.log(`Uploading photo ${i + 1}/${photos.length} to Trade Me...`);

      // Get image buffer
      const { imageBuffer, filename, contentType } = await getImageBuffer(photo, i + 1);

      if (!imageBuffer) {
        console.warn(`Photo ${i + 1} has no valid data source, skipping`);
        continue;
      }

      // Create FormData
      const form = new FormData();
      form.append('PhotoData', imageBuffer, { filename, contentType });

      // Upload to Trade Me Photos endpoint
      const { generateOAuthHeader } = require('../utils/trademeOAuth');
      const oauthHeader = generateOAuthHeader('POST', config.photo_upload_url, credentials);

      const uploadResponse = await axios({
        method: 'POST',
        url: config.photo_upload_url,
        data: form,
        headers: {
          ...form.getHeaders(),
          'Authorization': oauthHeader
        },
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const photoId = uploadResponse.data?.PhotoId;
      if (photoId) {
        photoIds.push(photoId);
        console.log(`Photo ${i + 1} uploaded successfully. PhotoId: ${photoId}`);
      }
    } catch (error) {
      console.error(`Failed to upload photo ${i + 1}:`, error.message);
      throw new Error(`Photo upload failed for image ${i + 1}: ${error.message}`);
    }
  }

  return photoIds;
}

// Helper function to prepare TradeMe payload
async function prepareTradeMePayload(originalPayload, vehicle, companyId) {
  const { mapMetadataToIds, validateMappedData } = require('../services/trademeMapping.service');

  // Create a deep copy and auto-populate
  const payload = autoPopulateTradeMePayload(JSON.parse(JSON.stringify(originalPayload)), vehicle);

  // Get integration configuration
  const { config } = await getIntegrationConfig(companyId, 'trademe_publish_integration');

  // Validate OAuth credentials
  if (!config.consumer_key || !config.consumer_secret || !config.access_token || !config.token_secret) {
    throw new Error('Trade Me OAuth credentials are incomplete. Please configure all 4 credentials (Consumer Key, Consumer Secret, Access Token, Token Secret) in the Integration module.');
  }

  // Validate photo upload URL
  if (!config.photo_upload_url) {
    throw new Error('Trade Me photo upload URL is not configured. Please add photo_upload_url in the Integration module.');
  }

  // Get dealership configuration
  const dealershipName = vehicle.dealership_id?.dealership_name || vehicle.dealership_id;
  if (!dealershipName) {
    throw new Error('Vehicle does not have a dealership assigned.');
  }

  const dealer = findDealerConfig(config.dealers, dealershipName);

  if (!dealer.api_key) {
    throw new Error(`API Key is missing for dealership "${dealershipName}". Please configure it in the Integration module.`);
  }
  if (!dealer.api_secret) {
    throw new Error(`API Secret is missing for dealership "${dealershipName}". Please configure it in the Integration module.`);
  }

  // STEP 1: Upload photos first and get PhotoIds
  let photoIds = [];
  if (payload.photos && payload.photos.length > 0) {
    console.log(`Starting photo upload for ${payload.photos.length} photos...`);
    photoIds = await uploadPhotosAndGetIds(payload.photos, companyId);
    console.log(`Photo upload complete. Received ${photoIds.length} PhotoIds`);
  }

  // Log and map metadata
  console.log('='.repeat(80));
  console.log('PAYLOAD BEFORE MAPPING:', JSON.stringify({
    make: payload.make, model: payload.model, bodyType: payload.bodyType,
    fuelType: payload.fuelType, transmission: payload.transmission,
    condition: payload.condition, features: payload.features, chassis: payload.chassis
  }, null, 2));
  console.log('='.repeat(80));

  const mappingResult = await mapMetadataToIds(payload);
  if (!mappingResult.success) {
    console.warn('Metadata mapping warnings:', mappingResult.errors);
  }

  const mappedIds = mappingResult.mappedData;
  console.log('='.repeat(80));
  console.log('MAPPED IDS:', JSON.stringify(mappedIds, null, 2));
  console.log('='.repeat(80));

  // Validate mapped data and required fields
  const validation = validateMappedData(mappedIds);
  if (!validation.valid) throw new Error(validation.message);
  if (!payload.stockNumber) throw new Error('Stock number is required');
  if (!payload.year || payload.year < 1900 || payload.year > new Date().getFullYear() + 1) {
    throw new Error('Valid year is required (1900 - current year)');
  }
  if (!payload.retailPrice || payload.retailPrice <= 0) {
    throw new Error(`Retail price must be greater than 0. Current value: ${payload.retailPrice || 'not set'}. Please set a retail price for this vehicle.`);
  }

  // STEP 2: Build Trade Me API payload (structured format) with Photos
  const trademePayload = {
    // Category ID (from model's category_id field)
    ...(mappedIds.categoryId && { CategoryId: mappedIds.categoryId }),

    // Stock Number
    StockNumber: payload.stockNumber,

    // Duration (required by TradeMe API - number of days, default 45)
    Duration: parseInt(payload.duration) || 45,

    // Make Details (nested object)
    MakeDetails: {
      ManufacturerId: mappedIds.make,
      ModelId: mappedIds.model,
      TypeId: mappedIds.bodyType || null
    },

    // Price Details (nested object)
    PriceDetails: {
      PriceType: payload.PriceType || payload.price_type || "",
      RetailPrice: parseFloat(payload.retailPrice),
      SalePrice: parseFloat(payload.price_special || payload.retailPrice),
      ExcludesGst: payload.ExcludesGst || payload.excludes_gst || false
    },

    // Year
    Year: parseInt(payload.year),

    // Photos (from uploaded photos) - Format: [{ "PhotoId": 123456 }]
    ...(photoIds.length > 0 && { Photos: photoIds.map(id => ({ PhotoId: id })) }),

    // Model Details
    modelDetails: mappedIds.modelName || `${payload.year} ${mappedIds.makeName} ${mappedIds.modelName}`,

    // ORC (On Road Costs)
    orcIncluded: payload.orcIncluded || payload.orc_included || false,
    orcAmount: parseFloat(payload.orcAmount || payload.orc_amount) || 0,

    // Condition
    condition: payload.condition || '',

    // Odometer
    Odometer: parseInt(payload.odometer) || 0,

    // Transmission
    TransmissionId: mappedIds.transmission || null,

    // Engine Details (cylinderCapacity from engine_size)
    cylinderCapacity: parseFloat(payload.engineSize || payload.engine_size) || 0,

    // Fuel Type
    FuelId: mappedIds.fuelType || null,

    // Condition
    ConditionId: mappedIds.condition || null,

    // Features
    Features: mappedIds.features || [],

    // Comments (mapped from description)
    Comments: payload.description || payload.Comments || '',

    // Subtitle
    Subtitle: payload.subtitle || '',

    // Color (from colour field in OnlyCars)
    Color: payload.color || payload.colour || '',

    // Seats (from seats field in OnlyCars)
    Seats: parseInt(payload.numberOfSeats || payload.seats) || 0,

    // Interior Details (from interior_features in OnlyCars)
    interiorDetails: Array.isArray(payload.interior_features)
      ? payload.interior_features.join(', ')
      : (payload.interiorDetails || ''),

    // Availability Status
    AvailabilityStatus: payload.status,

    // Show on TradeMe
    ShowOnTradeMe: true,

    // Identification Details (nested object)
    IdentificationDetails: {
      Vin: payload.vin || '',
      Registration: payload.registrationNumber || '',
      Chassis: payload.Chassis || payload.chassis || ''
    },

    // Delivery Details (nested object)
    DeliveryDetails: {
      PickupType: payload.PickupType || payload.pickup_type || '',
      IsShippingToBeArranged: payload.IsShippingToBeArranged || payload.is_shipping_arranged || false,
      ShippingOptions: (payload.ShippingOptions || payload.shipping_options || []).map(option => ({
        type: option.type || 1,
        price: parseFloat(option.price) || 0,
        cost: parseFloat(option.cost) || 0,
        description: option.description || '',
      }))
    },

    // Links (nested object)
    Links: {
      YoutubeUrl: payload.YoutubeUrl || payload.youtube_url || '',
      SiteLink: payload.SiteLink || payload.site_link || ''
    },

    // Auxiliary Details (nested object)
    AuxiliaryDetails: {
      Status: payload.status === 'available' ? 1 : 0
    }
  };

  return trademePayload;
}

// Helper function to make API call to TradeMe
async function callTradeMeAPI(payload, companyId) {
  const { generateOAuthHeader, validateOAuthCredentials } = require('../utils/trademeOAuth');

  const { config, activeEnv } = await getIntegrationConfig(companyId, 'trademe_publish_integration');

  const credentials = {
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token: config.access_token,
    token_secret: config.token_secret
  };

  const credValidation = validateOAuthCredentials(credentials);
  if (!credValidation.valid) throw new Error(credValidation.message);

  const endpoint = payload.listingId ? `/Selling/Edit/${payload.listingId}.json` : '/Selling.json';
  const method = 'POST';
  const apiUrl = `${config.base_url}${endpoint}`;
  const oauthHeader = generateOAuthHeader(method, apiUrl, credentials);

  console.log('='.repeat(80));
  console.log(`${activeEnv.toUpperCase()} - TRADEME API PAYLOAD`);
  console.log('='.repeat(80));
  console.log(JSON.stringify(payload, null, 2));
  console.log('='.repeat(80));

  try {
    const response = await axios({
      method,
      url: apiUrl,
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': oauthHeader
      },
      timeout: 30000
    });

    return {
      success: true,
      listing_id: response.data?.ListingId || payload.listingId,
      response: response.data
    };
  } catch (error) {
    let errorMessage = error.response?.data?.ErrorDescription || error.response?.data?.Message || error.message;
    throw new Error(`Trade Me API Error (${activeEnv} environment): ${errorMessage}`);
  }
}

// Helper: Make TradeMe API request
const makeTradeMeRequest = async (method, endpoint, config, credentials, data = null) => {
  const { generateOAuthHeader } = require('../utils/trademeOAuth');
  const apiUrl = `${config.base_url}${endpoint}`;
  const oauthHeader = generateOAuthHeader(method, apiUrl, credentials);

  return await axios({
    method,
    url: apiUrl,
    data,
    headers: data ? { ...data.getHeaders?.(), 'Authorization': oauthHeader } : { 'Authorization': oauthHeader },
    timeout: data ? 60000 : 30000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
};

// Helper function to get existing photos for a listing
async function getTradeMeListingPhotos(listingId, config, credentials) {
  try {
    const response = await makeTradeMeRequest('GET', `/Selling/${listingId}/Photos.json`, config, credentials);
    return response.data?.Photos || [];
  } catch (error) {
    console.warn('Failed to fetch existing photos:', error.message);
    return [];
  }
}

// Helper function to delete a photo from TradeMe listing
async function deleteTradeMePhoto(listingId, photoId, config, credentials) {
  try {
    await makeTradeMeRequest('DELETE', `/Selling/${listingId}/Photos/${photoId}.json`, config, credentials);
    console.log(`Deleted photo ${photoId} from listing ${listingId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete photo ${photoId}:`, error.message);
    return false;
  }
}

// Helper: Get image buffer from various sources
const getImageBuffer = async (image, position) => {
  let imageBuffer, filename = `image_${position}.jpg`, contentType = 'image/jpeg';

  if (image.url) {
    const imageResponse = await axios.get(image.url, { responseType: 'arraybuffer', timeout: 30000 });
    imageBuffer = Buffer.from(imageResponse.data);

    const urlParts = image.url.split('/');
    const urlFilename = urlParts[urlParts.length - 1];
    if (urlFilename?.includes('.')) {
      filename = urlFilename;
      const ext = urlFilename.split('.').pop().toLowerCase();
      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'webp') contentType = 'image/webp';
    }
  } else if (image.data) {
    const base64Match = image.data.match(/^data:image\/(\w+);base64,/);
    if (base64Match) {
      const imageType = base64Match[1];
      contentType = `image/${imageType}`;
      filename = `image_${position}.${imageType}`;
    }
    const base64Data = image.data.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (image.buffer || Buffer.isBuffer(image)) {
    imageBuffer = Buffer.isBuffer(image) ? image : image.buffer;
    if (image.filename) filename = image.filename;
    if (image.contentType) contentType = image.contentType;
  }

  return { imageBuffer, filename, contentType };
};

// Helper function to upload images to TradeMe
async function uploadTradeMeImages(listingId, images, companyId) {
  const FormData = require('form-data');

  if (!images?.length) {
    console.log('No images to upload');
    return { success: true, uploaded: 0, total: 0, results: [] };
  }

  const { config } = await getIntegrationConfig(companyId, 'trademe_publish_integration');

  const credentials = {
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token: config.access_token,
    token_secret: config.token_secret
  };

  const existingPhotos = await getTradeMeListingPhotos(listingId, config, credentials);
  console.log(`Found ${existingPhotos.length} existing photos on listing ${listingId}`);

  const uploadResults = [];
  let uploadedCount = 0;
  const MAX_RETRIES = 1;

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const position = image.position || (i + 1);
    let retryCount = 0;
    let uploadSuccess = false;

    while (retryCount <= MAX_RETRIES && !uploadSuccess) {
      try {
        const attemptNum = retryCount + 1;
        console.log(`Uploading image at position ${position} (attempt ${attemptNum}/${MAX_RETRIES + 1}) for listing ${listingId}`);

        // Handle position conflicts
        const conflictingPhoto = existingPhotos.find(p => p.Position === position);
        if (conflictingPhoto?.PhotoId) {
          console.log(`Position ${position} conflict detected. Deleting existing photo ${conflictingPhoto.PhotoId}`);
          const deleted = await deleteTradeMePhoto(listingId, conflictingPhoto.PhotoId, config, credentials);
          if (deleted) {
            const index = existingPhotos.findIndex(p => p.PhotoId === conflictingPhoto.PhotoId);
            if (index > -1) existingPhotos.splice(index, 1);
          }
        }

        // Get image buffer
        const { imageBuffer, filename, contentType } = await getImageBuffer(image, position);

        if (!imageBuffer) {
          console.warn(`Image at position ${position} has no valid data source, skipping`);
          uploadResults.push({
            position,
            success: false,
            error: 'No valid image data source provided',
            attempts: attemptNum
          });
          break;
        }

        if (imageBuffer.length === 0) {
          throw new Error('Image buffer is empty or invalid');
        }

        // Create FormData
        const form = new FormData();
        form.append('PhotoData', imageBuffer, { filename, contentType });
        if (position) form.append('Position', position.toString());
        if (image.caption) form.append('Caption', image.caption);

        // Upload to TradeMe
        const uploadResponse = await makeTradeMeRequest('POST', `/Selling/${listingId}/Photos.json`, config, credentials, form);

        uploadedCount++;
        uploadSuccess = true;

        const photoId = uploadResponse.data?.PhotoId || null;
        if (photoId) {
          existingPhotos.push({ PhotoId: photoId, Position: position });
        }

        uploadResults.push({ position, success: true, photoId, attempts: attemptNum });
        console.log(`Successfully uploaded image at position ${position} (attempt ${attemptNum})`);

      } catch (error) {
        console.error(`Failed to upload image at position ${position} (attempt ${retryCount + 1}):`, error.message);

        const isPositionConflict = error.response?.data?.ErrorDescription?.toLowerCase().includes('position') ||
          error.response?.data?.Message?.toLowerCase().includes('position');

        if (isPositionConflict && retryCount < MAX_RETRIES) {
          console.log(`Position conflict detected, will retry after cleanup`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (retryCount >= MAX_RETRIES) {
          uploadResults.push({
            position,
            success: false,
            error: error.message,
            attempts: retryCount + 1,
            errorDetails: error.response?.data || null
          });
          break;
        }

        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return {
    success: uploadedCount > 0,
    uploaded: uploadedCount,
    failed: uploadResults.filter(r => !r.success).length,
    total: images.length,
    results: uploadResults
  };
}

// @desc    Delete advertisement
// @route   DELETE /api/adpublishing/:vehicleId/advertisements/:advertisementId
// @access  Private
const deleteAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);

    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    const AdvertiseData = req.getModel('AdvertiseData');
    const advertisement = await AdvertiseData.findOneAndDelete({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    });

    if (!advertisement) {
      return errorResponse(res, 404, 'Advertisement not found');
    }

    await updateVehicleAdField(vehicle, advertisement.provider, undefined);

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
    errorResponse(res, 500, 'Error deleting advertisement');
  }
};

// @desc    Withdraw advertisement (mark as sold)
// @route   POST /api/adpublishing/:vehicleId/advertisements/:advertisementId/withdraw
// @access  Private
const withdrawAdvertisement = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);

    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    const advertisement = await findAdvertisement(advertisementId, vehicle.vehicle_stock_id, req.user.company_id, req);

    if (!advertisement) {
      return errorResponse(res, 404, 'Advertisement not found');
    }

    advertisement.status = 'withdrawn';
    advertisement.withdrawn_at = new Date();
    advertisement.withdrawn_by = req.user.id;
    advertisement.is_active = false;
    await advertisement.save();

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
    errorResponse(res, 500, 'Error withdrawing advertisement');
  }
};

// @desc    Get advertisement history
// @route   GET /api/adpublishing/:vehicleId/advertisements/:advertisementId/history
// @access  Private
const getAdvertisementHistory = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);

    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    const AdvertiseData = req.getModel('AdvertiseData');
    const advertisement = await AdvertiseData.findOne({
      _id: advertisementId,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      company_id: req.user.company_id
    }).populate('history.updated_by', 'name email');

    if (!advertisement) {
      return errorResponse(res, 404, 'Advertisement not found');
    }

    res.status(200).json({
      success: true,
      data: advertisement.history || []
    });

  } catch (error) {
    console.error('Get advertisement history error:', error);
    errorResponse(res, 500, 'Error retrieving advertisement history');
  }
};

// @desc    Get advertisement activity logs
// @route   GET /api/adpublishing/:vehicleId/advertisements/:advertisementId/logs
// @access  Private
const getAdvertisementLogs = async (req, res) => {
  try {
    const { vehicleId, advertisementId } = req.params;
    const { event_action, limit = 50 } = req.query;
    const vehicle = await findVehicle(vehicleId, req.user.company_id, req);

    if (!vehicle) {
      return errorResponse(res, 404, 'Vehicle not found');
    }

    const advertisement = await findAdvertisement(advertisementId, vehicle.vehicle_stock_id, req.user.company_id, req);

    if (!advertisement) {
      return errorResponse(res, 404, 'Advertisement not found');
    }

    const GlobalLog = require('../models/GlobalLog');

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
    errorResponse(res, 500, 'Error retrieving advertisement logs');
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
