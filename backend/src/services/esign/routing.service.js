const auditService = require('./audit.service');
const tokenService = require('./token.service');
const notificationService = require('./notification.service');

/**
 * Conditional Routing Service
 * 
 * Evaluates routing rules after each signature submission and executes actions
 * based on delimiter values. Supports dynamic workflow adjustments.
 * 
 * Requirements: 78.1, 78.2, 78.3, 78.4, 78.5, 78.6, 78.7, 78.8, 78.9, 78.10
 */

/**
 * Evaluate routing rules after a recipient signs
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {Object} recipient - Recipient who just signed
 * @returns {Promise<Object>} Evaluation result with actions taken
 */
async function evaluateRoutingRules(req, document, recipient) {
  const template = document.template_snapshot;
  
  // Check if routing rules exist (Req 78.1)
  if (!template.routing_rules || template.routing_rules.length === 0) {
    return {
      evaluated: false,
      reason: 'No routing rules configured',
    };
  }
  
  // Filter rules triggered by this recipient's signature_order (Req 78.4)
  const triggeredRules = template.routing_rules.filter(
    rule => rule.triggered_by === recipient.signature_order
  );
  
  if (triggeredRules.length === 0) {
    return {
      evaluated: false,
      reason: `No routing rules triggered by signature_order ${recipient.signature_order}`,
    };
  }
  
  console.log(`Evaluating ${triggeredRules.length} routing rules for document ${document._id}`);
  
  const results = {
    evaluated: true,
    rules_evaluated: triggeredRules.length,
    actions_taken: [],
  };
  
  // Evaluate all triggered rules in order (Req 78.5)
  for (const rule of triggeredRules) {
    try {
      const conditionMet = evaluateCondition(rule.condition, document.payload);
      
      // Log evaluation result (Req 78.10)
      await auditService.logEvent(req, {
        event_type: 'routing.rule_evaluated',
        actor: { type: 'system' },
        resource: { type: 'document', id: document._id.toString() },
        action: 'Routing rule evaluated',
        metadata: {
          rule,
          condition_met: conditionMet,
          recipient_signature_order: recipient.signature_order,
          delimiter_value: document.payload[rule.condition.delimiter_key],
        },
      });
      
      // Execute action if condition is met (Req 78.6)
      if (conditionMet) {
        const actionResult = await executeAction(req, document, rule.action, template);
        
        results.actions_taken.push({
          rule_index: triggeredRules.indexOf(rule),
          action_type: rule.action.type,
          action_result: actionResult,
        });
        
        // Log action execution (Req 78.10)
        await auditService.logEvent(req, {
          event_type: 'routing.action_executed',
          actor: { type: 'system' },
          resource: { type: 'document', id: document._id.toString() },
          action: `Routing action executed: ${rule.action.type}`,
          metadata: {
            action: rule.action,
            result: actionResult,
          },
        });
      }
    } catch (error) {
      console.error('Error evaluating routing rule:', error);
      
      // Log error but continue with other rules
      await auditService.logEvent(req, {
        event_type: 'routing.rule_error',
        actor: { type: 'system' },
        resource: { type: 'document', id: document._id.toString() },
        action: 'Routing rule evaluation failed',
        metadata: {
          rule,
          error: error.message,
        },
      });
    }
  }
  
  return results;
}

/**
 * Evaluate a routing condition against delimiter values
 * Supports operators: equals, not_equals, greater_than, less_than, contains, is_empty
 * 
 * @param {Object} condition - Condition object with delimiter_key, operator, value
 * @param {Object} payload - Document payload with delimiter values
 * @returns {boolean} True if condition is met
 */
function evaluateCondition(condition, payload) {
  const { delimiter_key, operator, value } = condition;
  const actualValue = payload[delimiter_key];
  
  // Handle is_empty operator (Req 78.2)
  if (operator === 'is_empty') {
    return actualValue === undefined || actualValue === null || actualValue === '';
  }
  
  // For other operators, if value is empty, condition is false
  if (actualValue === undefined || actualValue === null || actualValue === '') {
    return false;
  }
  
  // Evaluate based on operator (Req 78.2)
  switch (operator) {
    case 'equals':
      return String(actualValue) === String(value);
      
    case 'not_equals':
      return String(actualValue) !== String(value);
      
    case 'greater_than':
      // Try numeric comparison first
      const numActual = Number(actualValue);
      const numValue = Number(value);
      if (!isNaN(numActual) && !isNaN(numValue)) {
        return numActual > numValue;
      }
      // Fall back to string comparison
      return String(actualValue) > String(value);
      
    case 'less_than':
      // Try numeric comparison first
      const numActual2 = Number(actualValue);
      const numValue2 = Number(value);
      if (!isNaN(numActual2) && !isNaN(numValue2)) {
        return numActual2 < numValue2;
      }
      // Fall back to string comparison
      return String(actualValue) < String(value);
      
    case 'contains':
      return String(actualValue).includes(String(value));
      
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Execute a routing action
 * Supports actions: activate_signer, skip_signer, add_signer, complete
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {Object} action - Action object with type, target_order, email
 * @param {Object} template - Template snapshot
 * @returns {Promise<Object>} Action result
 */
async function executeAction(req, document, action, template) {
  const { type, target_order, email } = action;
  
  // Execute based on action type (Req 78.3)
  switch (type) {
    case 'activate_signer':
      return await activateSigner(req, document, target_order, template);
      
    case 'skip_signer':
      return await skipSigner(req, document, target_order, template);
      
    case 'add_signer':
      return await addSigner(req, document, email, template);
      
    case 'complete':
      return await completeDocument(req, document);
      
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

/**
 * Activate a specific signer (out of sequence)
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {number} targetOrder - Signature order to activate
 * @param {Object} template - Template snapshot
 * @returns {Promise<Object>} Result
 */
async function activateSigner(req, document, targetOrder, template) {
  // Find recipient by signature_order
  const targetRecipient = document.recipients.find(
    r => r.signature_order === targetOrder
  );
  
  if (!targetRecipient) {
    throw new Error(`No recipient found with signature_order ${targetOrder}`);
  }
  
  if (targetRecipient.status === 'signed') {
    return {
      success: false,
      reason: 'Recipient has already signed',
    };
  }
  
  if (targetRecipient.status === 'skipped') {
    // Reactivate skipped recipient
    targetRecipient.status = 'active';
  } else if (targetRecipient.status === 'pending') {
    // Activate pending recipient
    targetRecipient.status = 'active';
  }
  
  // Generate new token
  const newToken = tokenService.generateToken({
    documentId: document._id.toString(),
    recipientId: targetRecipient._id.toString(),
    email: targetRecipient.email,
    companyId: document.company_id.toString(),
  }, 'signing', template.link_expiry);
  
  targetRecipient.token = newToken;
  targetRecipient.token_expires_at = tokenService.getTokenExpiry(newToken);
  
  await document.save();
  
  // Send notification
  try {
    await notificationService.sendEsignNotification(
      req.companyDb,
      document.company_id,
      'esign.document.recipient_activated',
      {
        document,
        recipient: targetRecipient,
        token: newToken,
      }
    );
  } catch (error) {
    console.error('Failed to send activation notification:', error);
  }
  
  return {
    success: true,
    recipient_email: targetRecipient.email,
    signature_order: targetOrder,
  };
}

/**
 * Skip a specific signer and activate the next one (Req 78.7)
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {number} targetOrder - Signature order to skip
 * @param {Object} template - Template snapshot
 * @returns {Promise<Object>} Result
 */
async function skipSigner(req, document, targetOrder, template) {
  // Find recipient by signature_order
  const targetRecipient = document.recipients.find(
    r => r.signature_order === targetOrder
  );
  
  if (!targetRecipient) {
    throw new Error(`No recipient found with signature_order ${targetOrder}`);
  }
  
  if (targetRecipient.status === 'signed') {
    return {
      success: false,
      reason: 'Recipient has already signed',
    };
  }
  
  // Mark as skipped (Req 78.7)
  targetRecipient.status = 'skipped';
  targetRecipient.token = null;
  targetRecipient.token_expires_at = null;
  
  // Find next recipient to activate (Req 78.7)
  const nextRecipient = document.recipients.find(
    r => r.signature_order === targetOrder + 1 && r.status === 'pending'
  );
  
  if (nextRecipient) {
    // Activate next recipient
    nextRecipient.status = 'active';
    
    // Generate token for next recipient
    const nextToken = tokenService.generateToken({
      documentId: document._id.toString(),
      recipientId: nextRecipient._id.toString(),
      email: nextRecipient.email,
      companyId: document.company_id.toString(),
    }, 'signing', template.link_expiry);
    
    nextRecipient.token = nextToken;
    nextRecipient.token_expires_at = tokenService.getTokenExpiry(nextToken);
    
    await document.save();
    
    // Send notification to next recipient
    try {
      await notificationService.sendEsignNotification(
        req.companyDb,
        document.company_id,
        'esign.document.recipient_activated',
        {
          document,
          recipient: nextRecipient,
          token: nextToken,
        }
      );
    } catch (error) {
      console.error('Failed to send notification to next recipient:', error);
    }
    
    return {
      success: true,
      skipped_recipient: targetRecipient.email,
      activated_recipient: nextRecipient.email,
    };
  } else {
    await document.save();
    
    return {
      success: true,
      skipped_recipient: targetRecipient.email,
      activated_recipient: null,
    };
  }
}

/**
 * Add a new signer dynamically (Req 78.8)
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {string} email - Email of new signer
 * @param {Object} template - Template snapshot
 * @returns {Promise<Object>} Result
 */
async function addSigner(req, document, email, template) {
  if (!email) {
    throw new Error('Email is required for add_signer action');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }
  
  // Find the highest signature_order
  const maxOrder = Math.max(...document.recipients.map(r => r.signature_order), 0);
  const newOrder = maxOrder + 1;
  
  // Create new recipient (Req 78.8)
  const newRecipient = {
    email,
    name: email.split('@')[0], // Use email prefix as name
    signature_order: newOrder,
    status: 'active',
    recipient_type: 'individual',
    signature_type: 'remote',
  };
  
  // Generate token for new recipient
  const newToken = tokenService.generateToken({
    documentId: document._id.toString(),
    recipientId: newRecipient._id || 'pending', // Will be set after save
    email: newRecipient.email,
    companyId: document.company_id.toString(),
  }, 'signing', template.link_expiry);
  
  newRecipient.token = newToken;
  newRecipient.token_expires_at = tokenService.getTokenExpiry(newToken);
  
  // Add to document
  document.recipients.push(newRecipient);
  await document.save();
  
  // Get the saved recipient with _id
  const savedRecipient = document.recipients[document.recipients.length - 1];
  
  // Check if _id exists (it should after save)
  if (!savedRecipient._id) {
    console.warn('Recipient _id not available after save, using temporary token');
    // Use the initial token if _id is not available
    return {
      success: true,
      recipient_email: email,
      signature_order: newOrder,
    };
  }
  
  // Regenerate token with correct recipient ID
  const finalToken = tokenService.generateToken({
    documentId: document._id.toString(),
    recipientId: savedRecipient._id.toString(),
    email: savedRecipient.email,
    companyId: document.company_id.toString(),
  }, 'signing', template.link_expiry);
  
  savedRecipient.token = finalToken;
  savedRecipient.token_expires_at = tokenService.getTokenExpiry(finalToken);
  
  await document.save();
  
  // Send notification to new recipient (Req 78.8)
  try {
    await notificationService.sendEsignNotification(
      req.companyDb,
      document.company_id,
      'esign.document.created',
      {
        document,
        recipient: savedRecipient,
        token: finalToken,
      }
    );
  } catch (error) {
    console.error('Failed to send notification to new recipient:', error);
  }
  
  return {
    success: true,
    recipient_email: email,
    signature_order: newOrder,
  };
}

/**
 * Complete the document immediately, skipping remaining signers (Req 78.9)
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @returns {Promise<Object>} Result
 */
async function completeDocument(req, document) {
  // Mark all remaining recipients as skipped (Req 78.9)
  const skippedRecipients = [];
  
  document.recipients.forEach(recipient => {
    if (recipient.status === 'pending' || recipient.status === 'active') {
      recipient.status = 'skipped';
      recipient.token = null;
      recipient.token_expires_at = null;
      skippedRecipients.push(recipient.email);
    }
  });
  
  // Mark document as signed (Req 78.9)
  document.status = 'signed';
  
  await document.save();
  
  return {
    success: true,
    skipped_recipients: skippedRecipients,
    document_status: 'signed',
  };
}

module.exports = {
  evaluateRoutingRules,
  evaluateCondition,
  executeAction,
  activateSigner,
  skipSigner,
  addSigner,
  completeDocument,
};
