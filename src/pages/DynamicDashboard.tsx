import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authServices } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";

const DynamicDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Fetch user module access
  const { data: userModule, isLoading: moduleLoading } = useQuery({
    queryKey: ['user-module'],
    queryFn: async () => {
      const response = await authServices.getCurrentUserModule();
      return response.data;
    },
    enabled: !!user && !authLoading
  });

  useEffect(() => {


    if (authLoading || moduleLoading) return;

    // Master admin always goes to master dashboard
    if (user?.role === "master_admin") {
      navigate("/master/dashboard", { replace: true });
      return;
    }

    // For company users, find the first _main_dashboard module they have access to
    if (user?.role === "company_super_admin" || user?.role === "company_admin") {
      const modules = userModule?.data?.module || [];
      
      // Find all main dashboard modules
      const mainDashboardModules = modules.filter((module: string) => 
        module.endsWith("_main_dashboard")
      );

      if (mainDashboardModules.length === 0) {
        // No dashboard access, redirect to no-access page
        navigate("/no-access", { replace: true });
        return;
      }

      // Map module names to routes
      const dashboardRoutes: Record<string, string> = {
        "vehicle_main_dashboard": "/company/dashboard",
        "tender_main_dashboard": "/tender/dashboard",
        // Add more dashboard mappings here as needed
      };

      // Find the first available dashboard route
      for (const module of mainDashboardModules) {
        const route = dashboardRoutes[module];
        if (route) {
          navigate(route, { replace: true });
          return;
        }
      }

      // If no matching route found, try the first main dashboard module
      // and construct a generic route
      const firstDashboard = mainDashboardModules[0];
      const dashboardType = firstDashboard.replace("_main_dashboard", "");
      
      if (dashboardType === "vehicle") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate(`/${dashboardType}/dashboard`, { replace: true });
      }
    }
  }, [user, userModule, authLoading, moduleLoading, navigate]);

  // Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
};

export default DynamicDashboard;
