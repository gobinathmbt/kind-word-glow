/**
 * ThemeToggleDropdown Component
 * 
 * Provides a dropdown menu for theme mode selection and access to theme customization.
 * Displays dynamic icon based on current theme mode (Sun/Moon/Monitor).
 */

import React, { useState } from 'react';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomColorPicker } from './CustomColorPicker';

interface ThemeToggleDropdownProps {
  className?: string;
}

export const ThemeToggleDropdown: React.FC<ThemeToggleDropdownProps> = ({ className }) => {
  const { mode, setMode, currentTheme, isCustomTheme } = useTheme();
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  /**
   * Get the appropriate icon based on current theme mode
   */
  const getModeIcon = () => {
    switch (mode) {
      case 'light':
        return <Sun className="h-5 w-5" />;
      case 'dark':
        return <Moon className="h-5 w-5" />;
      case 'system':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  /**
   * Get the display name for the current theme
   */
  const getThemeName = () => {
    if (isCustomTheme) {
      return 'Custom Theme';
    }
    return currentTheme?.name || 'Default Theme';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label="Toggle theme"
          >
            {getModeIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Theme Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Theme Mode Selection */}
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Theme Mode
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => setMode('light')}
            className="cursor-pointer"
          >
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
            {mode === 'light' && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setMode('dark')}
            className="cursor-pointer"
          >
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
            {mode === 'dark' && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setMode('system')}
            className="cursor-pointer"
          >
            <Monitor className="mr-2 h-4 w-4" />
            <span>System</span>
            {mode === 'system' && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Current Theme Display */}
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Current Theme
          </DropdownMenuLabel>
          <div className="px-2 py-1.5 text-sm">
            {getThemeName()}
          </div>

          <DropdownMenuSeparator />

          {/* Customize Colors Button */}
          <DropdownMenuItem
            onClick={() => setIsColorPickerOpen(true)}
            className="cursor-pointer"
          >
            <Palette className="mr-2 h-4 w-4" />
            <span>Customize Colors</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* CustomColorPicker Dialog */}
      <CustomColorPicker
        open={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
      />
    </>
  );
};
