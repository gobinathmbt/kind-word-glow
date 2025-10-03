import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MaintenanceModule {
  module_name: string;
  is_enabled: boolean;
  message?: string;
  end_time?: string;
}

interface MaintenanceSettings {
  is_enabled: boolean;
  message: string;
  end_time?: string;
  modules: MaintenanceModule[];
}

interface MaintenanceStore {
  maintenanceSettings: MaintenanceSettings | null;
  setMaintenanceSettings: (settings: MaintenanceSettings) => void;
  isModuleUnderMaintenance: (moduleName: string) => boolean;
  isWebsiteUnderMaintenance: () => boolean;
  getMaintenanceMessage: (moduleName?: string) => string;
  getMaintenanceEndTime: (moduleName?: string) => string | null;
  clearMaintenance: () => void;
}

export const useMaintenanceStore = create<MaintenanceStore>()(
  persist(
    (set, get) => ({
      maintenanceSettings: null,

      setMaintenanceSettings: (settings: MaintenanceSettings) => {
        set({ maintenanceSettings: settings });
      },

      isModuleUnderMaintenance: (moduleName: string) => {
        const { maintenanceSettings } = get();
        if (!maintenanceSettings) return false;

        // Check if global maintenance is enabled
        if (maintenanceSettings.is_enabled) {
          const now = new Date();
          const endTime = maintenanceSettings.end_time ? new Date(maintenanceSettings.end_time) : null;
          
          // If no end time or end time hasn't passed, maintenance is active
          if (!endTime || now < endTime) {
            return true;
          }
        }

        // Check module-specific maintenance
        const moduleConfig = maintenanceSettings.modules.find(m => m.module_name === moduleName);
        if (moduleConfig?.is_enabled) {
          const now = new Date();
          const endTime = moduleConfig.end_time ? new Date(moduleConfig.end_time) : null;
          
          // If no end time or end time hasn't passed, maintenance is active
          if (!endTime || now < endTime) {
            return true;
          }
        }

        return false;
      },

      isWebsiteUnderMaintenance: () => {
        const { maintenanceSettings } = get();
        if (!maintenanceSettings) return false;

        if (maintenanceSettings.is_enabled) {
          const now = new Date();
          const endTime = maintenanceSettings.end_time ? new Date(maintenanceSettings.end_time) : null;
          
          // If no end time or end time hasn't passed, maintenance is active
          if (!endTime || now < endTime) {
            return true;
          }
        }

        return false;
      },

      getMaintenanceMessage: (moduleName?: string) => {
        const { maintenanceSettings } = get();
        if (!maintenanceSettings) return '';

        if (moduleName) {
          const moduleConfig = maintenanceSettings.modules.find(m => m.module_name === moduleName);
          if (moduleConfig?.is_enabled && moduleConfig.message) {
            return moduleConfig.message;
          }
        }

        if (maintenanceSettings.is_enabled) {
          return maintenanceSettings.message || 'We are currently performing maintenance. Please check back later.';
        }

        return '';
      },

      getMaintenanceEndTime: (moduleName?: string) => {
        const { maintenanceSettings } = get();
        if (!maintenanceSettings) return null;

        if (moduleName) {
          const moduleConfig = maintenanceSettings.modules.find(m => m.module_name === moduleName);
          if (moduleConfig?.is_enabled) {
            return moduleConfig.end_time || null;
          }
        }

        if (maintenanceSettings.is_enabled) {
          return maintenanceSettings.end_time || null;
        }

        return null;
      },

      clearMaintenance: () => {
        set({ maintenanceSettings: null });
      },
    }),
    {
      name: 'maintenance-store',
      version: 1,
    }
  )
);