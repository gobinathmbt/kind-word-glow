const env = require('../../config/env');

/**
 * PDF Service for HTML-to-PDF and PDF-to-HTML conversion
 * 
 * This service provides an abstraction layer for PDF operations.
 * Implementation options:
 * 1. Puppeteer/Playwright (Node.js) - Recommended for production
 * 2. External Python service with WeasyPrint
 * 3. Cloud service (AWS Lambda, Google Cloud Functions)
 * 
 * Configuration:
 * - PDF_SERVICE_TYPE: 'puppeteer' | 'python' | 'cloud'
 * - PDF_SERVICE_URL: URL for external service (if applicable)
 * - PDF_SERVICE_TIMEOUT: Timeout in milliseconds (default: 30000)
 * - PDF_SERVICE_MAX_RETRIES: Maximum retry attempts (default: 2)
 */

const PDF_SERVICE_CONFIG = {
  type: env.PDF_SERVICE_TYPE || 'puppeteer',
  url: env.PDF_SERVICE_URL || 'http://localhost:3001',
  timeout: env.PDF_SERVICE_TIMEOUT || 30000,
  maxRetries: env.PDF_SERVICE_MAX_RETRIES || 2,
};

/**
 * Convert HTML to PDF
 * @param {string} htmlContent - HTML content to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} PDF buffer
 */
const htmlToPdf = async (htmlContent, options = {}) => {
  const {
    format = 'A4',
    margin = { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    printBackground = true,
    displayHeaderFooter = false,
    headerTemplate = '',
    footerTemplate = '',
  } = options;

  try {
    // TODO: Implement based on PDF_SERVICE_CONFIG.type
    // For now, throw an error indicating the service needs to be implemented
    throw new Error(
      'PDF service not yet implemented. Please install Puppeteer or configure an external PDF service.'
    );

    // Example implementation with Puppeteer (to be uncommented when Puppeteer is installed):
    /*
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format,
      margin,
      printBackground,
      displayHeaderFooter,
      headerTemplate,
      footerTemplate,
    });
    
    await browser.close();
    
    return pdfBuffer;
    */
  } catch (error) {
    console.error('HTML to PDF conversion error:', error);
    throw new Error(`Failed to convert HTML to PDF: ${error.message}`);
  }
};

/**
 * Convert PDF to HTML (for template editing)
 * @param {Buffer} pdfBuffer - PDF buffer to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} HTML content
 */
const pdfToHtml = async (pdfBuffer, options = {}) => {
  try {
    // TODO: Implement PDF to HTML conversion
    // This is more complex and may require external libraries like pdf2htmlEX or pdf.js
    throw new Error(
      'PDF to HTML conversion not yet implemented. This feature requires additional libraries.'
    );

    // Example implementation approach:
    /*
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    
    let htmlContent = '<html><body>';
    
    // Extract text and structure from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      htmlContent += `<div class="page" data-page="${pageNum}">`;
      
      textContent.items.forEach(item => {
        htmlContent += `<span style="position:absolute; left:${item.transform[4]}px; top:${item.transform[5]}px;">${item.str}</span>`;
      });
      
      htmlContent += '</div>';
    }
    
    htmlContent += '</body></html>';
    
    return htmlContent;
    */
  } catch (error) {
    console.error('PDF to HTML conversion error:', error);
    throw new Error(`Failed to convert PDF to HTML: ${error.message}`);
  }
};

/**
 * Convert PDF to HTML (alias for pdfToHtml)
 * @param {Buffer} pdfBuffer - PDF buffer to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} HTML content
 */
const convertPdfToHtml = async (pdfBuffer, options = {}) => {
  return pdfToHtml(pdfBuffer, options);
};

/**
 * Generate PDF with retry logic
 * @param {string} htmlContent - HTML content to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePdfWithRetry = async (htmlContent, options = {}) => {
  let lastError;
  
  for (let attempt = 1; attempt <= PDF_SERVICE_CONFIG.maxRetries + 1; attempt++) {
    try {
      console.log(`PDF generation attempt ${attempt}/${PDF_SERVICE_CONFIG.maxRetries + 1}`);
      
      const pdfBuffer = await htmlToPdf(htmlContent, options);
      
      console.log(`PDF generated successfully on attempt ${attempt}`);
      return pdfBuffer;
    } catch (error) {
      lastError = error;
      console.error(`PDF generation attempt ${attempt} failed:`, error.message);
      
      if (attempt <= PDF_SERVICE_CONFIG.maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`PDF generation failed after ${PDF_SERVICE_CONFIG.maxRetries + 1} attempts: ${lastError.message}`);
};

/**
 * Validate HTML content before conversion
 * @param {string} htmlContent - HTML content to validate
 * @returns {boolean} True if valid
 */
const validateHtmlContent = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new Error('Invalid HTML content: must be a non-empty string');
  }
  
  if (htmlContent.length > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('HTML content too large: maximum size is 10MB');
  }
  
  return true;
};

/**
 * Get PDF service health status
 * @returns {Promise<Object>} Health status
 */
const checkPdfServiceHealth = async () => {
  try {
    // TODO: Implement health check based on service type
    return {
      status: 'not_implemented',
      message: 'PDF service not yet configured',
      type: PDF_SERVICE_CONFIG.type,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
    };
  }
};

module.exports = {
  htmlToPdf,
  pdfToHtml,
  convertPdfToHtml,
  generatePdfWithRetry,
  validateHtmlContent,
  checkPdfServiceHealth,
  PDF_SERVICE_CONFIG,
};
