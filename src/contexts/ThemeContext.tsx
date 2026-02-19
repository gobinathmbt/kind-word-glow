/**
 * Theme Context and Provider
 * 
 * Provides centralized theme state management and operations throughout the application.
 * Handles theme mode switching, preset/custom theme selection, localStorage persistence,
 * and CSS variable updates.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { themePresets, defaultTheme, ThemePreset, ThemeColors } from '../config/themePresets';
import { hexToHSL, getContrastColor } from '../utils/colorUtils';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Internal state structure for theme management
 */
interface ThemeState {
  mode: ThemeMode;
  presetId: string | null;
  customColors: {
    light: ThemeColors;
    dark: ThemeColors;
  } | null;
  glassmorphismEnabled: boolean;
}

/**
 * Theme context type providing state and operations
 */
export interface ThemeContextType {
  // State
  mode: ThemeMode;
  currentTheme: ThemePreset | null;
  customTheme: { light: ThemeColors; dark: ThemeColors } | null;
  isCustomTheme: boolean;
  glassmorphismEnabled: boolean;
  
  // Actions
  setMode: (mode: ThemeMode) => void;
  setPresetTheme: (presetId: string) => void;
  setCustomTheme: (light: ThemeColors, dark: ThemeColors) => void;
  toggleGlassmorphism: () => void;
  resetToDefault: () => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [themeState, setThemeState] = useState<ThemeState>(() => {
    return loadThemeFromStorage();
  });

  // ============================================================================
  // Storage Functions
  // ============================================================================

  /**
   * Loads theme preferences from localStorage with error handling
   * Falls back to default theme if storage is unavailable or data is corrupted
   */
  function loadThemeFromStorage(): ThemeState {
    try {
      const stored = localStorage.getItem('theme-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate the structure
        if (
          parsed &&
          typeof parsed.mode === 'string' &&
          ['light', 'dark', 'system'].includes(parsed.mode)
        ) {
          return {
            mode: parsed.mode,
            presetId: parsed.presetId || null,
            customColors: parsed.customColors || null,
            glassmorphismEnabled: parsed.glassmorphismEnabled || false
          };
        }
      }
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error);
    }

    // Return default theme state
    return {
      mode: 'system',
      presetId: defaultTheme.id,
      customColors: null,
      glassmorphismEnabled: false
    };
  }

  /**
   * Saves theme preferences to localStorage with error handling
   * Falls back to sessionStorage if localStorage is unavailable
   */
  function saveThemeToStorage(state: ThemeState): void {
    try {
      const data = JSON.stringify(state);
      localStorage.setItem('theme-preferences', data);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
      
      // Try sessionStorage as fallback
      try {
        const data = JSON.stringify(state);
        sessionStorage.setItem('theme-preferences', data);
        console.warn('Theme saved to sessionStorage as fallback');
      } catch (sessionError) {
        console.error('Failed to save theme to sessionStorage:', sessionError);
      }
    }
  }

  // ============================================================================
  // CSS Variable Application
  // ============================================================================

  /**
   * Detects the operating system's theme preference
   * @returns 'dark' or 'light' based on system preference
   */
  function getSystemTheme(): 'light' | 'dark' {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (error) {
      console.warn('System theme detection not supported:', error);
    }
    return 'light'; // Default to light if detection fails
  }

  /**
   * Applies theme colors as CSS custom properties on the document root
   * @param colors - The theme colors to apply
   * @param mode - The current theme mode (light or dark)
   */
  function applyCSSVariables(colors: ThemeColors, mode: 'light' | 'dark'): void {
    try {
      const root = document.documentElement;

      // Convert hex colors to HSL format for CSS variables
      const primaryHSL = hexToHSL(colors.primary);
      const secondaryHSL = hexToHSL(colors.secondary);
      const tertiaryHSL = hexToHSL(colors.tertiary);

      // Apply primary color and its foreground
      root.style.setProperty('--primary', primaryHSL);
      const primaryForeground = getContrastColor(colors.primary);
      root.style.setProperty('--primary-foreground', hexToHSL(primaryForeground));

      // Apply secondary/background colors
      root.style.setProperty('--secondary', secondaryHSL);
      root.style.setProperty('--background', secondaryHSL);
      const secondaryForeground = getContrastColor(colors.secondary);
      root.style.setProperty('--secondary-foreground', hexToHSL(secondaryForeground));

      // Apply tertiary/foreground colors
      root.style.setProperty('--foreground', tertiaryHSL);
      root.style.setProperty('--card', secondaryHSL);
      root.style.setProperty('--card-foreground', tertiaryHSL);

      // Apply dark class to html element based on mode
      if (mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch (error) {
      console.error('Failed to apply CSS variables:', error);
    }
  }

  // ============================================================================
  // Derived State
  // ============================================================================

  const currentTheme = themeState.presetId
    ? themePresets.find(preset => preset.id === themeState.presetId) || null
    : null;

  const isCustomTheme = themeState.customColors !== null;

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Effect to apply theme colors when theme state changes
   */
  useEffect(() => {
    // Determine the actual mode to apply (resolve 'system' to 'light' or 'dark')
    const effectiveMode = themeState.mode === 'system' ? getSystemTheme() : themeState.mode;

    // Get the colors to apply
    let colorsToApply: ThemeColors;
    if (isCustomTheme && themeState.customColors) {
      colorsToApply = themeState.customColors[effectiveMode];
    } else if (currentTheme) {
      colorsToApply = currentTheme[effectiveMode];
    } else {
      colorsToApply = defaultTheme[effectiveMode];
    }

    // Apply the CSS variables
    applyCSSVariables(colorsToApply, effectiveMode);

    // Apply glassmorphism class to document root
    const root = document.documentElement;
    if (themeState.glassmorphismEnabled) {
      root.classList.add('glassmorphism-enabled');
    } else {
      root.classList.remove('glassmorphism-enabled');
    }
  }, [themeState, currentTheme, isCustomTheme]);

  /**
   * Effect to listen for OS theme changes when in system mode
   */
  useEffect(() => {
    if (themeState.mode !== 'system') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        // Trigger re-render by updating state (this will trigger the theme application effect)
        setThemeState(prev => ({ ...prev }));
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
      // Legacy browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    } catch (error) {
      console.warn('Failed to listen for system theme changes:', error);
    }
  }, [themeState.mode]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: ThemeContextType = {
    mode: themeState.mode,
    currentTheme,
    customTheme: themeState.customColors,
    isCustomTheme,
    glassmorphismEnabled: themeState.glassmorphismEnabled,
    
    /**
     * Sets the theme mode (light, dark, or system)
     */
    setMode: (mode: ThemeMode) => {
      const newState = { ...themeState, mode };
      setThemeState(newState);
      saveThemeToStorage(newState);
    },
    
    /**
     * Applies a preset theme by ID
     */
    setPresetTheme: (presetId: string) => {
      const preset = themePresets.find(p => p.id === presetId);
      if (!preset) {
        console.error(`Preset theme with id "${presetId}" not found`);
        return;
      }
      
      const newState = {
        ...themeState,
        presetId,
        customColors: null // Clear custom colors when selecting a preset
      };
      setThemeState(newState);
      saveThemeToStorage(newState);
    },
    
    /**
     * Saves a custom theme with colors for both light and dark modes
     */
    setCustomTheme: (light: ThemeColors, dark: ThemeColors) => {
      const newState = {
        ...themeState,
        presetId: null, // Clear preset when using custom colors
        customColors: { light, dark }
      };
      setThemeState(newState);
      saveThemeToStorage(newState);
    },
    
    /**
     * Toggles glassmorphism effects on/off
     */
    toggleGlassmorphism: () => {
      const newState = {
        ...themeState,
        glassmorphismEnabled: !themeState.glassmorphismEnabled
      };
      setThemeState(newState);
      saveThemeToStorage(newState);
    },
    
    /**
     * Resets theme to default (Emerald Glow, system mode)
     */
    resetToDefault: () => {
      const newState = {
        mode: 'system' as ThemeMode,
        presetId: defaultTheme.id,
        customColors: null,
        glassmorphismEnabled: false
      };
      setThemeState(newState);
      saveThemeToStorage(newState);
    }
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================================
// Hook for consuming theme context
// ============================================================================

/**
 * Custom hook to access theme context
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
