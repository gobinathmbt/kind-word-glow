import React, { useEffect } from 'react';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { masterServices } from '@/api/services';
import MaintenancePage from './MaintenancePage';
import { useAuth } from '@/auth/AuthContext';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
  requiredModule?: string;
}

const MaintenanceWrapper: React.FC<MaintenanceWrapperProps> = ({ 
  children, 
  requiredModule 
}) => {
  const { user } = useAuth();
  const { 
    maintenanceSettings, 
    setMaintenanceSettings, 
    isWebsiteUnderMaintenance, 
    isModuleUnderMaintenance 
  } = useMaintenanceStore();

  // Fetch maintenance settings on mount and periodically
  useEffect(() => {
    const fetchMaintenanceSettings = async () => {
      try {
        // Only fetch maintenance settings for company users (not master admin)
        if (user?.role && user.role !== 'master_admin') {
          const response = await masterServices.getPublicMaintenanceSettings();
          setMaintenanceSettings(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch maintenance settings:', error);
      }
    };

    fetchMaintenanceSettings();

    // Check every minute for maintenance updates
    const interval = setInterval(fetchMaintenanceSettings, 60000);

    return () => clearInterval(interval);
  }, [user, setMaintenanceSettings]);

  // Don't show maintenance for master admin
  if (user?.role === 'master_admin') {
    return <>{children}</>;
  }

  // Check for website-wide maintenance
  if (isWebsiteUnderMaintenance()) {
    return (
      <MaintenancePage 
        type="website"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Check for module-specific maintenance
  if (requiredModule && isModuleUnderMaintenance(requiredModule)) {
    return (
      <MaintenancePage 
        type="module"
        moduleName={requiredModule}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <>{children}</>;
};

export default MaintenanceWrapper;