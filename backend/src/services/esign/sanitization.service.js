/**
 * HTML Sanitization Service for E-Sign Templates
 * 
 * This service sanitizes HTML content to prevent XSS attacks while
 * preserving safe formatting tags and styles.
 * 
 * Requirements: 50.1-50.6
 */

/**
 * Sanitize HTML content
 * Removes script tags, event handlers, and iframe tags
 * Allows safe HTML tags and style attributes
 * 
 * @param {string} htmlContent - HTML content to sanitize
 * @returns {string} Sanitized HTML content
 */
const sanitizeHtml = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return htmlContent;
  }

  let sanitized = htmlContent;

  // Req 50.1: Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Also remove inline script tags without closing tags
  sanitized = sanitized.replace(/<script[^>]*>/gi, '');

  // Req 50.3: Remove iframe tags and their content
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Also remove inline iframe tags without closing tags
  sanitized = sanitized.replace(/<iframe[^>]*>/gi, '');

  // Req 50.2: Remove event handlers (onclick, onload, onerror, etc.)
  const eventHandlers = [
    'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmousemove', 'onmouseout', 'onmouseenter', 'onmouseleave',
    'onload', 'onunload', 'onbeforeunload',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
    'onkeydown', 'onkeypress', 'onkeyup',
    'onerror', 'onabort',
    'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop',
    'onscroll', 'onresize',
    'oncontextmenu',
    'oninput', 'oninvalid',
    'onanimationstart', 'onanimationend', 'onanimationiteration',
    'ontransitionend',
    'onwheel',
    'oncopy', 'oncut', 'onpaste'
  ];

  eventHandlers.forEach(handler => {
    // Remove event handler attributes (case-insensitive)
    const regex = new RegExp(`\\s+${handler}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');
    
    // Also handle without quotes
    const regexNoQuotes = new RegExp(`\\s+${handler}\\s*=\\s*[^\\s>]+`, 'gi');
    sanitized = sanitized.replace(regexNoQuotes, '');
  });

  // Remove javascript: protocol from href and src attributes
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');

  // Remove data: protocol from src attributes (can be used for XSS)
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/href\s*=\s*["']vbscript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']vbscript:[^"']*["']/gi, 'src=""');

  // Remove dangerous tags (object, embed, applet, meta, link, base, form, input, button, textarea, select)
  const dangerousTags = ['object', 'embed', 'applet', 'meta', 'link', 'base', 'form', 'input', 'button', 'textarea', 'select'];
  dangerousTags.forEach(tag => {
    // Remove tags with content
    const regexWithContent = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regexWithContent, '');
    
    // Remove self-closing tags
    const regexSelfClosing = new RegExp(`<${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(regexSelfClosing, '');
  });

  // Req 50.4: Allow safe HTML tags
  // Safe tags: div, span, p, h1-h6, table, thead, tbody, tfoot, tr, td, th, img, a, ul, ol, li, br, hr, strong, em, b, i, u, s, sub, sup, blockquote, pre, code
  // These are already allowed by not being removed above

  // Req 50.5: Style attributes are allowed for formatting
  // No action needed - we're not removing style attributes

  return sanitized;
};

/**
 * Validate that HTML content is safe
 * Returns validation result with any issues found
 * 
 * @param {string} htmlContent - HTML content to validate
 * @returns {Object} Validation result { valid: boolean, issues: Array }
 */
const validateHtmlSafety = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return { valid: true, issues: [] };
  }

  const issues = [];

  // Check for script tags
  if (/<script/i.test(htmlContent)) {
    issues.push('HTML contains script tags which will be removed');
  }

  // Check for iframe tags
  if (/<iframe/i.test(htmlContent)) {
    issues.push('HTML contains iframe tags which will be removed');
  }

  // Check for event handlers
  const eventHandlerPattern = /\s+on\w+\s*=/i;
  if (eventHandlerPattern.test(htmlContent)) {
    issues.push('HTML contains event handlers which will be removed');
  }

  // Check for javascript: protocol
  if (/javascript:/i.test(htmlContent)) {
    issues.push('HTML contains javascript: protocol which will be removed');
  }

  // Check for dangerous tags
  const dangerousTags = ['object', 'embed', 'applet', 'meta', 'link', 'base', 'form', 'input', 'button', 'textarea', 'select'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}`, 'i');
    if (regex.test(htmlContent)) {
      issues.push(`HTML contains <${tag}> tags which will be removed`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Sanitize HTML and return both sanitized content and validation result
 * 
 * @param {string} htmlContent - HTML content to sanitize
 * @returns {Object} { sanitized: string, validation: Object }
 */
const sanitizeAndValidate = (htmlContent) => {
  const validation = validateHtmlSafety(htmlContent);
  const sanitized = sanitizeHtml(htmlContent);

  return {
    sanitized,
    validation,
    changed: sanitized !== htmlContent
  };
};

/**
 * List of allowed HTML tags for reference
 * These tags are considered safe and are not removed during sanitization
 */
const ALLOWED_TAGS = [
  // Structure
  'div', 'span', 'p', 'br', 'hr',
  
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'col', 'colgroup',
  
  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  
  // Text formatting
  'strong', 'em', 'b', 'i', 'u', 's', 'strike', 'del', 'ins', 'sub', 'sup', 'small', 'mark',
  
  // Semantic
  'article', 'section', 'nav', 'aside', 'header', 'footer', 'main', 'figure', 'figcaption',
  
  // Code
  'pre', 'code', 'kbd', 'samp', 'var',
  
  // Quotes
  'blockquote', 'q', 'cite',
  
  // Media
  'img',
  
  // Links
  'a',
  
  // Other
  'abbr', 'address', 'time', 'details', 'summary'
];

/**
 * List of allowed attributes for reference
 */
const ALLOWED_ATTRIBUTES = [
  // Universal
  'id', 'class', 'style', 'title', 'lang', 'dir',
  
  // Links
  'href', 'target', 'rel',
  
  // Images
  'src', 'alt', 'width', 'height',
  
  // Tables
  'colspan', 'rowspan', 'headers', 'scope',
  
  // Data attributes
  'data-*'
];

module.exports = {
  sanitizeHtml,
  validateHtmlSafety,
  sanitizeAndValidate,
  ALLOWED_TAGS,
  ALLOWED_ATTRIBUTES
};
