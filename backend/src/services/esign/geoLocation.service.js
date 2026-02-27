/**
 * Geo Location Service
 * Captures geographic location from IP addresses
 * 
 * Uses MaxMind GeoIP2 or similar service for IP geolocation
 * Falls back gracefully if service is unavailable
 */

/**
 * Capture geo location from IP address
 * @param {string} ip_address - IP address
 * @param {number} timeout - Timeout in milliseconds (default: 1000ms)
 * @returns {Promise<Object|null>} Geo location data or null
 */
const captureGeoLocation = async (ip_address, timeout = 1000) => {
  try {
    // Skip for localhost/private IPs
    if (!ip_address || 
        ip_address === '::1' || 
        ip_address === '127.0.0.1' || 
        ip_address.startsWith('192.168.') ||
        ip_address.startsWith('10.') ||
        ip_address.startsWith('172.')) {
      return null;
    }
    
    // TODO: Implement actual geo location lookup
    // Options:
    // 1. MaxMind GeoIP2 (requires license and database)
    // 2. IP-API.com (free tier available)
    // 3. ipapi.co (free tier available)
    // 4. GeoJS (free service)
    
    // For now, return null (geo location not implemented)
    // This allows the system to continue without blocking
    
    // Example implementation with IP-API.com:
    /*
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(`http://ip-api.com/json/${ip_address}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          country: data.country,
          region: data.regionName,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
        };
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
    */
    
    return null;
  } catch (error) {
    // Log error but don't throw - geo location is optional
    console.error('Geo location capture error:', error);
    return null;
  }
};

/**
 * Validate IP address format
 * @param {string} ip_address - IP address
 * @returns {boolean} True if valid
 */
const isValidIPAddress = (ip_address) => {
  if (!ip_address || typeof ip_address !== 'string') {
    return false;
  }
  
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
  
  return ipv4Regex.test(ip_address) || ipv6Regex.test(ip_address);
};

/**
 * Extract IP address from request
 * Handles proxies and load balancers
 * @param {Object} req - Express request object
 * @returns {string|null} IP address or null
 */
const extractIPAddress = (req) => {
  try {
    // Check X-Forwarded-For header (set by proxies/load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      if (ips.length > 0 && isValidIPAddress(ips[0])) {
        return ips[0];
      }
    }
    
    // Check X-Real-IP header (set by some proxies)
    const realIP = req.headers['x-real-ip'];
    if (realIP && isValidIPAddress(realIP)) {
      return realIP;
    }
    
    // Fall back to req.ip (Express built-in)
    if (req.ip && isValidIPAddress(req.ip)) {
      return req.ip;
    }
    
    // Fall back to connection remote address
    if (req.connection?.remoteAddress && isValidIPAddress(req.connection.remoteAddress)) {
      return req.connection.remoteAddress;
    }
    
    return null;
  } catch (error) {
    console.error('Extract IP address error:', error);
    return null;
  }
};

/**
 * Capture geo location with timeout
 * @param {Object} req - Express request object
 * @param {number} timeout - Timeout in milliseconds (default: 1000ms)
 * @returns {Promise<Object|null>} Geo location data or null
 */
const captureGeoLocationFromRequest = async (req, timeout = 1000) => {
  try {
    const ip_address = extractIPAddress(req);
    
    if (!ip_address) {
      return null;
    }
    
    return await captureGeoLocation(ip_address, timeout);
  } catch (error) {
    console.error('Capture geo location from request error:', error);
    return null;
  }
};

module.exports = {
  captureGeoLocation,
  captureGeoLocationFromRequest,
  extractIPAddress,
  isValidIPAddress,
};
