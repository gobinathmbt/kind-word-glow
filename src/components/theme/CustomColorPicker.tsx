/**
 * CustomColorPicker Component
 * 
 * Provides a dialog interface for selecting preset themes or creating custom themes.
 * Features tab-based interface for dark/light mode customization, preset theme grid,
 * custom color inputs, and real-time preview.
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { themePresets, ThemeColors } from '@/config/themePresets';
import { isValidHex, hexToHSL, getContrastColor } from '@/utils/colorUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface CustomColorPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomColorPicker: React.FC<CustomColorPickerProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    mode,
    currentTheme,
    customTheme,
    glassmorphismEnabled,
    setPresetTheme,
    setCustomTheme,
    toggleGlassmorphism,
    resetToDefault,
  } = useTheme();

  // Active tab state (dark or light mode)
  const [activeTab, setActiveTab] = useState<'dark' | 'light'>('dark');

  // Temporary color state for real-time preview
  const [tempColors, setTempColors] = useState<{
    light: ThemeColors;
    dark: ThemeColors;
  }>({
    light: {
      primary: '#16a34a',
      secondary: '#f5f5f5',
      tertiary: '#1f2937',
    },
    dark: {
      primary: '#22c55e',
      secondary: '#0a0a0a',
      tertiary: '#ffffff',
    },
  });

  // Validation errors for color inputs
  const [validationErrors, setValidationErrors] = useState<{
    light: { primary?: string; secondary?: string; tertiary?: string };
    dark: { primary?: string; secondary?: string; tertiary?: string };
  }>({
    light: {},
    dark: {},
  });

  /**
   * Handles color input change with validation
   */
  const handleColorChange = (
    mode: 'light' | 'dark',
    colorKey: keyof ThemeColors,
    value: string
  ) => {
    // Update temp colors
    setTempColors((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [colorKey]: value,
      },
    }));

    // Validate the color
    if (!isValidHex(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        [mode]: {
          ...prev[mode],
          [colorKey]: 'Invalid hex color format (e.g., #16a34a)',
        },
      }));
    } else {
      // Clear error if valid
      setValidationErrors((prev) => ({
        ...prev,
        [mode]: {
          ...prev[mode],
          [colorKey]: undefined,
        },
      }));
    }
  };

  /**
   * Checks if all colors are valid
   */
  const areAllColorsValid = () => {
    const lightValid =
      isValidHex(tempColors.light.primary) &&
      isValidHex(tempColors.light.secondary) &&
      isValidHex(tempColors.light.tertiary);
    const darkValid =
      isValidHex(tempColors.dark.primary) &&
      isValidHex(tempColors.dark.secondary) &&
      isValidHex(tempColors.dark.tertiary);
    return lightValid && darkValid;
  };

  /**
   * Handles applying the custom theme
   */
  const handleApply = () => {
    if (areAllColorsValid()) {
      setCustomTheme(tempColors.light, tempColors.dark);
      onOpenChange(false);
    }
  };

  /**
   * Handles resetting to default theme
   */
  const handleReset = () => {
    resetToDefault();
    onOpenChange(false);
  };

  // Initialize tempColors from current theme when dialog opens
  useEffect(() => {
    if (open) {
      if (customTheme) {
        setTempColors(customTheme);
      } else if (currentTheme) {
        setTempColors({
          light: currentTheme.light,
          dark: currentTheme.dark,
        });
      }
    }
  }, [open, customTheme, currentTheme]);

  /**
   * Effect for real-time preview - applies tempColors to CSS variables
   * Updates preview without requiring save action
   */
  useEffect(() => {
    if (!open) return;

    // Determine which mode colors to preview
    const effectiveMode = mode === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    
    const colorsToPreview = tempColors[effectiveMode];

    // Only apply if all colors are valid
    if (
      isValidHex(colorsToPreview.primary) &&
      isValidHex(colorsToPreview.secondary) &&
      isValidHex(colorsToPreview.tertiary)
    ) {
      try {
        const root = document.documentElement;

        // Convert and apply colors
        const primaryHSL = hexToHSL(colorsToPreview.primary);
        const secondaryHSL = hexToHSL(colorsToPreview.secondary);
        const tertiaryHSL = hexToHSL(colorsToPreview.tertiary);

        root.style.setProperty('--primary', primaryHSL);
        root.style.setProperty('--primary-foreground', hexToHSL(getContrastColor(colorsToPreview.primary)));
        root.style.setProperty('--secondary', secondaryHSL);
        root.style.setProperty('--background', secondaryHSL);
        root.style.setProperty('--secondary-foreground', hexToHSL(getContrastColor(colorsToPreview.secondary)));
        root.style.setProperty('--foreground', tertiaryHSL);
        root.style.setProperty('--card', secondaryHSL);
        root.style.setProperty('--card-foreground', tertiaryHSL);
      } catch (error) {
        console.error('Failed to apply preview colors:', error);
      }
    }
  }, [tempColors, open, mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Theme Colors</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dark' | 'light')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dark">Dark Mode</TabsTrigger>
            <TabsTrigger value="light">Light Mode</TabsTrigger>
          </TabsList>

          <TabsContent value="dark" className="space-y-4">
            {/* Preset Themes Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Preset Themes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themePresets.map((preset) => {
                  const isSelected = currentTheme?.id === preset.id && !customTheme;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setPresetTheme(preset.id);
                        setTempColors({
                          light: preset.light,
                          dark: preset.dark,
                        });
                      }}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all
                        hover:border-primary/50
                        ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                      `}
                    >
                      <div className="space-y-2">
                        <div className="flex gap-1 h-6">
                          <div
                            className="flex-1 rounded"
                            style={{ backgroundColor: preset.dark.primary }}
                          />
                          <div
                            className="flex-1 rounded"
                            style={{ backgroundColor: preset.dark.secondary }}
                          />
                          <div
                            className="flex-1 rounded"
                            style={{ backgroundColor: preset.dark.tertiary }}
                          />
                        </div>
                        <p className="text-xs font-medium truncate">{preset.name}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 text-primary">
                          <span className="text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Colors Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Custom Colors</h3>
              
              {/* Primary Color */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={tempColors.dark.primary}
                    onChange={(e) => handleColorChange('dark', 'primary', e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tempColors.dark.primary}
                    onChange={(e) => handleColorChange('dark', 'primary', e.target.value)}
                    placeholder="#22c55e"
                    className="flex-1 h-10 px-3 rounded border bg-background text-sm"
                  />
                </div>
                {validationErrors.dark.primary && (
                  <p className="text-xs text-destructive">{validationErrors.dark.primary}</p>
                )}
              </div>

              {/* Secondary Color */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={tempColors.dark.secondary}
                    onChange={(e) => handleColorChange('dark', 'secondary', e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tempColors.dark.secondary}
                    onChange={(e) => handleColorChange('dark', 'secondary', e.target.value)}
                    placeholder="#0a0a0a"
                    className="flex-1 h-10 px-3 rounded border bg-background text-sm"
                  />
                </div>
                {validationErrors.dark.secondary && (
                  <p className="text-xs text-destructive">{validationErrors.dark.secondary}</p>
                )}
              </div>

              {/* Tertiary Color */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Tertiary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={tempColors.dark.tertiary}
                    onChange={(e) => handleColorChange('dark', 'tertiary', e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tempColors.dark.tertiary}
                    onChange={(e) => handleColorChange('dark', 'tertiary', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 h-10 px-3 rounded border bg-background text-sm"
                  />
                </div>
                {validationErrors.dark.tertiary && (
                  <p className="text-xs text-destructive">{validationErrors.dark.tertiary}</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="light" className="space-y-4">
            {/* Preset Themes Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Preset Themes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themePresets.map((preset) => {
                  const isSelected = currentTheme?.id === preset.id && !customTheme;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setPresetTheme(preset.id);
                        setTempColors({
                          light: preset.light,
                          dark: preset.dark,
                        });
                      }}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all
                        hover:border-primary/50
                        ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                      `}
                    >
                      <div className="space-y-2">
                        <div className="flex gap-1 h-6">
                          <div
                            className="flex-1 rounded"
                            style={{ backgroundColor: preset.light.primary }}
                          />
                          <div
                            className="flex-1 rounded"
                            style={{ backgroundColor: preset.light.secondary }}
                          />
                          <div
                            className="flex-1 rounded"
                            style={{ backgroundColor: preset.light.tertiary }}
                          />
                        </div>
                        <p className="text-xs font-medium truncate">{preset.name}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 text-primary">
                          <span className="text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Colors Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Custom Colors</h3>
              
              {/* Primary Color */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={tempColors.light.primary}
                    onChange={(e) => handleColorChange('light', 'primary', e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tempColors.light.primary}
                    onChange={(e) => handleColorChange('light', 'primary', e.target.value)}
                    placeholder="#16a34a"
                    className="flex-1 h-10 px-3 rounded border bg-background text-sm"
                  />
                </div>
                {validationErrors.light.primary && (
                  <p className="text-xs text-destructive">{validationErrors.light.primary}</p>
                )}
              </div>

              {/* Secondary Color */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={tempColors.light.secondary}
                    onChange={(e) => handleColorChange('light', 'secondary', e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tempColors.light.secondary}
                    onChange={(e) => handleColorChange('light', 'secondary', e.target.value)}
                    placeholder="#f5f5f5"
                    className="flex-1 h-10 px-3 rounded border bg-background text-sm"
                  />
                </div>
                {validationErrors.light.secondary && (
                  <p className="text-xs text-destructive">{validationErrors.light.secondary}</p>
                )}
              </div>

              {/* Tertiary Color */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Tertiary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={tempColors.light.tertiary}
                    onChange={(e) => handleColorChange('light', 'tertiary', e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tempColors.light.tertiary}
                    onChange={(e) => handleColorChange('light', 'tertiary', e.target.value)}
                    placeholder="#1f2937"
                    className="flex-1 h-10 px-3 rounded border bg-background text-sm"
                  />
                </div>
                {validationErrors.light.tertiary && (
                  <p className="text-xs text-destructive">{validationErrors.light.tertiary}</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Glassmorphism Toggle Section
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <label htmlFor="glassmorphism-toggle" className="text-sm font-medium cursor-pointer">
              Glassmorphism Effects
            </label>
            <p className="text-xs text-muted-foreground">
              Enable frosted glass appearance with backdrop blur
            </p>
          </div>
          <Switch
            id="glassmorphism-toggle"
            checked={glassmorphismEnabled}
            onCheckedChange={toggleGlassmorphism}
          />
        </div> */}

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button 
            onClick={handleApply}
            disabled={!areAllColorsValid()}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
