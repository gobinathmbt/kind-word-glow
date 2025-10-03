
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { authServices } from '@/api/services';
import MaintenanceWrapper from '@/components/maintenance/MaintenanceWrapper';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  requiredModule?: string; // Add optional module requirement
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  requiredModule 
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Fetch user module access
  const { data: userModule, isLoading: moduleLoading } = useQuery({
    queryKey: ['user-module'],
    queryFn: async () => {
      const response = await authServices.getCurrentUserModule();
      return response.data;
    },
    enabled: !!user && !isLoading
  });

  if (isLoading || moduleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check subscription status - handled in DashboardLayout

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check module access for company_admin users
  if (requiredModule && user.role === 'company_admin' || user.role === 'company_super_admin') {
    // If user has no module access at all
    if (!userModule?.data?.module || !Array.isArray(userModule.data.module) || userModule.data.module.length === 0) {
      return <Navigate to="/no-access" replace />;
    }

    // Check if user has the required module
    if (!userModule.data.module.includes(requiredModule)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return (
    <MaintenanceWrapper requiredModule={requiredModule}>
      {children}
    </MaintenanceWrapper>
  );
};

export default ProtectedRoute;
