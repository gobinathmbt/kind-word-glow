/**
 * Color Utility Functions
 * 
 * Provides utilities for color conversion, validation, and contrast calculation
 * to support the theming system.
 */

/**
 * Validates if a string is a valid hexadecimal color format
 * @param hex - The color string to validate (e.g., "#16a34a")
 * @returns true if the string is a valid hex color, false otherwise
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

/**
 * Converts a hexadecimal color to HSL format for CSS variables
 * @param hex - The hex color string (e.g., "#16a34a")
 * @returns HSL string in format "H S% L%" (e.g., "142 76% 36%")
 */
export function hexToHSL(hex: string): string {
  // Remove the hash if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Find min and max values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Calculate lightness
  let l = (max + min) / 2;

  // Calculate saturation
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  }

  // Calculate hue
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Calculates the relative luminance of a color
 * Used for determining contrast ratios
 * @param hex - The hex color string
 * @returns The relative luminance value (0-1)
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates the contrast ratio between two colors
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @returns The contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines the appropriate contrasting foreground color (white or black)
 * for a given background color to ensure WCAG AA compliance
 * @param backgroundColor - The background hex color
 * @returns "#ffffff" for white or "#000000" for black
 */
export function getContrastColor(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor);
  
  // Use white text for dark backgrounds, black text for light backgrounds
  // Threshold of 0.5 provides good contrast in most cases
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Checks if two colors meet WCAG AA contrast requirements
 * @param foreground - The foreground hex color
 * @param background - The background hex color
 * @returns true if contrast ratio is >= 4.5:1 (WCAG AA standard)
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 4.5;
}
