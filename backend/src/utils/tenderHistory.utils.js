/**
 * Utility functions for tender history tracking
 */

/**
 * Create a tender history record
 * @param {Object} params - History record parameters
 * @param {ObjectId} params.tender_id - Tender ID
 * @param {String} params.action_type - Action type (created, sent, viewed, etc.)
 * @param {String} params.old_status - Previous status (optional)
 * @param {String} params.new_status - New status (optional)
 * @param {ObjectId} params.performed_by - User ID who performed the action
 * @param {String} params.performed_by_type - Type of user (admin or dealership_user)
 * @param {ObjectId} params.tenderDealership_id - Dealership ID (optional)
 * @param {String} params.notes - Additional notes (optional)
 * @param {Object} params.metadata - Additional metadata (optional)
 * @param {Function} getModel - Function to get model from tenant context
 * @returns {Promise<Object>} Created history record
 */
async function createTenderHistory({
  tender_id,
  action_type,
  old_status = null,
  new_status = null,
  performed_by,
  performed_by_type,
  tenderDealership_id = null,
  notes = null,
  metadata = null
}, getModel) {
  try {
    const TenderHistory = getModel('TenderHistory');
    
    const historyData = {
      tender_id,
      action_type,
      performed_by,
      performed_by_type
    };
    
    // Add optional fields if provided
    if (old_status) historyData.old_status = old_status;
    if (new_status) historyData.new_status = new_status;
    if (tenderDealership_id) historyData.tenderDealership_id = tenderDealership_id;
    if (notes) historyData.notes = notes;
    if (metadata) historyData.metadata = metadata;
    
    const history = await TenderHistory.create(historyData);
    return history;
  } catch (error) {
    console.error('Error creating tender history:', error);
    throw error;
  }
}

module.exports = {
  createTenderHistory
};
