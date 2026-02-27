const crypto = require('crypto');

/**
 * Short Link Service
 * Generates and manages short links for signing URLs
 */

/**
 * Generate a unique 8-character alphanumeric short code
 * @returns {string} Short code
 */
const generateShortCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let shortCode = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.randomInt(0, characters.length);
    shortCode += characters[randomIndex];
  }
  
  return shortCode;
};

/**
 * Create a short link for a recipient token
 * @param {Object} req - Express request object
 * @param {string} documentId - Document ID
 * @param {string} recipientId - Recipient ID
 * @param {string} fullToken - Full JWT token
 * @param {Date} expiresAt - Expiration date
 * @returns {Promise<string>} Short code
 */
const createShortLink = async (req, documentId, recipientId, fullToken, expiresAt) => {
  try {
    const EsignShortLink = req.getModel('EsignShortLink');
    
    // Generate unique short code
    let shortCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      shortCode = generateShortCode();
      
      // Check if short code already exists
      const existing = await EsignShortLink.findOne({ shortCode });
      
      if (!existing) {
        isUnique = true;
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique short code after maximum attempts');
    }
    
    // Create short link record
    await EsignShortLink.create({
      shortCode,
      fullToken,
      documentId,
      recipientId,
      expiresAt,
    });
    
    return shortCode;
  } catch (error) {
    console.error('Create short link error:', error);
    throw new Error(`Failed to create short link: ${error.message}`);
  }
};

/**
 * Get full token from short code
 * @param {Object} req - Express request object
 * @param {string} shortCode - Short code
 * @returns {Promise<Object|null>} Short link data or null if not found
 */
const getShortLink = async (req, shortCode) => {
  try {
    const EsignShortLink = req.getModel('EsignShortLink');
    
    const shortLink = await EsignShortLink.findOne({ shortCode });
    
    if (!shortLink) {
      return null;
    }
    
    // Check if expired
    if (new Date() > shortLink.expiresAt) {
      return {
        expired: true,
        shortLink,
      };
    }
    
    return {
      expired: false,
      shortLink,
    };
  } catch (error) {
    console.error('Get short link error:', error);
    throw new Error(`Failed to get short link: ${error.message}`);
  }
};

/**
 * Delete short link
 * @param {Object} req - Express request object
 * @param {string} shortCode - Short code
 * @returns {Promise<boolean>} True if deleted
 */
const deleteShortLink = async (req, shortCode) => {
  try {
    const EsignShortLink = req.getModel('EsignShortLink');
    
    const result = await EsignShortLink.deleteOne({ shortCode });
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Delete short link error:', error);
    throw new Error(`Failed to delete short link: ${error.message}`);
  }
};

/**
 * Delete all short links for a document
 * @param {Object} req - Express request object
 * @param {string} documentId - Document ID
 * @returns {Promise<number>} Number of deleted links
 */
const deleteDocumentShortLinks = async (req, documentId) => {
  try {
    const EsignShortLink = req.getModel('EsignShortLink');
    
    const result = await EsignShortLink.deleteMany({ documentId });
    
    return result.deletedCount;
  } catch (error) {
    console.error('Delete document short links error:', error);
    throw new Error(`Failed to delete document short links: ${error.message}`);
  }
};

module.exports = {
  generateShortCode,
  createShortLink,
  getShortLink,
  deleteShortLink,
  deleteDocumentShortLinks,
};
