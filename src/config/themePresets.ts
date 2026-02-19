/**
 * Theme Preset Configuration
 * 
 * Defines all available theme presets with color schemes for both light and dark modes.
 * Each preset includes primary, secondary, and tertiary colors in hexadecimal format.
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export const themePresets: ThemePreset[] = [
  {
    id: 'emerald-glow',
    name: 'Emerald Glow',
    light: {
      primary: '#16a34a',
      secondary: '#f5f5f5',
      tertiary: '#1f2937'
    },
    dark: {
      primary: '#22c55e',
      secondary: '#0a0a0a',
      tertiary: '#ffffff'
    }
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    light: {
      primary: '#0ea5e9',
      secondary: '#f0f9ff',
      tertiary: '#0c4a6e'
    },
    dark: {
      primary: '#38bdf8',
      secondary: '#082f49',
      tertiary: '#e0f2fe'
    }
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    light: {
      primary: '#9333ea',
      secondary: '#faf5ff',
      tertiary: '#581c87'
    },
    dark: {
      primary: '#a855f7',
      secondary: '#3b0764',
      tertiary: '#f3e8ff'
    }
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    light: {
      primary: '#f97316',
      secondary: '#fff7ed',
      tertiary: '#7c2d12'
    },
    dark: {
      primary: '#fb923c',
      secondary: '#431407',
      tertiary: '#ffedd5'
    }
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    light: {
      primary: '#10b981',
      secondary: '#f0fdf4',
      tertiary: '#064e3b'
    },
    dark: {
      primary: '#34d399',
      secondary: '#022c22',
      tertiary: '#d1fae5'
    }
  },
  {
    id: 'crisp-sky',
    name: 'Crisp Sky',
    light: {
      primary: '#06b6d4',
      secondary: '#ecfeff',
      tertiary: '#164e63'
    },
    dark: {
      primary: '#22d3ee',
      secondary: '#083344',
      tertiary: '#cffafe'
    }
  },
  {
    id: 'graphite-pro',
    name: 'Graphite Pro',
    light: {
      primary: '#64748b',
      secondary: '#f8fafc',
      tertiary: '#0f172a'
    },
    dark: {
      primary: '#94a3b8',
      secondary: '#020617',
      tertiary: '#f1f5f9'
    }
  },
  {
    id: 'rose-blush',
    name: 'Rose Blush',
    light: {
      primary: '#f43f5e',
      secondary: '#fff1f2',
      tertiary: '#881337'
    },
    dark: {
      primary: '#fb7185',
      secondary: '#4c0519',
      tertiary: '#ffe4e6'
    }
  },
  {
    id: 'emerald-noir',
    name: 'Emerald Noir',
    light: {
      primary: '#059669',
      secondary: '#ecfdf5',
      tertiary: '#022c22'
    },
    dark: {
      primary: '#10b981',
      secondary: '#064e3b',
      tertiary: '#d1fae5'
    }
  },
  {
    id: 'amber-glow',
    name: 'Amber Glow',
    light: {
      primary: '#f59e0b',
      secondary: '#fffbeb',
      tertiary: '#78350f'
    },
    dark: {
      primary: '#fbbf24',
      secondary: '#451a03',
      tertiary: '#fef3c7'
    }
  }
];

export const defaultTheme = themePresets[0]; // Emerald Glow
