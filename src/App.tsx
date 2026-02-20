import { Dialog, DialogContent } from "@/components/ui/dialog";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useState, useEffect } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./auth/ProtectedRoute";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import RegisterCompany from "./pages/RegisterCompany";
import NoAccess from "./pages/NoAccess";
import Unauthorized from "./pages/Unauthorized";
import DynamicDashboard from "./pages/DynamicDashboard";

// Master Admin Pages
import MasterDashboard from "./pages/master_admin/Dashboard";
import MasterCompanies from "./pages/master_admin/Companies";
import MasterPlans from "./pages/master_admin/Plans";
import MasterSettings from "./pages/master_admin/Settings";
import Permissions from './pages/master_admin/Permissions';
import MasterDropdownMaster from "./pages/master_admin/DropdownMaster";
import CustomModuleConfig from "./pages/master_admin/CustomModuleConfig";
import WebsiteMaintenance from "./pages/master_admin/WebsiteMaintenance";
import GlobalLogs from "./pages/master_admin/GlobalLogs";
import VehicleMetadata from "./pages/master_admin/VehicleMetadata";
import TrademeMetadata from "./pages/master_admin/TrademeMetadata";

// Notification Pages
import NotificationConfiguration from "./pages/company/NotificationConfiguration";

// Company Pages  
import CompanyDashboard from "./pages/company/Dashboard";
import AnalyticsDashboard from "./pages/company/AnalyticsDashboard";
import UnifiedDashboard from "./pages/company/UnifiedDashboard";
import Dealerships from "./pages/company/Dealerships";
import CompanyUsers from "./pages/company/Users";
import CompanySettings from "./pages/company/Settings";
import DropdownMaster from "./pages/company/DropdownMaster";
import InspectionConfig from "./pages/company/InspectionConfig";
import TradeinConfig from "./pages/company/TradeinConfig";
import UserPermissions from './pages/company/UserPermissions';
import Integration from './pages/company/Integration';
import CostConfiguration from './pages/company/CostConfiguration';

// Vehicle Pages
import InspectionList from "./pages/vehicles/InspectionList";
import TradeinList from "./pages/vehicles/TradeinList";
import MasterVehicleList from "./pages/vehicles/MasterVehicleList";
import AdPublishingList from "./pages/vehicles/AdPublishingList";
import VehiclePricingList from "./pages/vehicles/VehiclePricingList";

// Workshop Pages
import Workshop from "./pages/company/Workshop";
import WorkshopConfig from "./pages/company/WorkshopConfig";
import WorkflowManagement from "./pages/company/WorkflowManagement";

import SupplierManagement from "./pages/company/SupplierManagement";

// Supplier Pages
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import QuotesByStatus from "./pages/supplier/QuotesByStatus";
import SupplierProfile from "./pages/supplier/SupplierProfile";

// Tender Pages
import TenderModule from "./pages/tender/TenderModule";
import TenderDashboard from "./pages/tender/TenderDashboard";

// Service Bay Pages
import ServiceBays from "./pages/company/ServiceBays";
import BayCalendar from "./pages/company/BayCalendar";

// Supplier Layout
import SupplierLayout from "./components/layout/SupplierLayout";

// Master Inspection Component
import MasterInspection from "./components/inspection/MasterInspection";

import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const handleRefresh = async () => {
  window.location.reload();
};

const App = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const routesContent = (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register-company" element={<RegisterCompany />} />
      <Route path="/no-access" element={<NoAccess />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Dynamic Dashboard Route - redirects to appropriate dashboard based on user's modules */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['master_admin', 'company_super_admin', 'company_admin']}>
          <DynamicDashboard />
        </ProtectedRoute>
      } />


      {/* Master Admin Routes */}
      <Route path="/master/dashboard" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <MasterDashboard />
        </ProtectedRoute>
      } />
      <Route path="/master/companies" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <MasterCompanies />
        </ProtectedRoute>
      } />
      <Route path="/master/plans" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <MasterPlans />
        </ProtectedRoute>
      } />
      <Route path="/master/permissions" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <Permissions />
        </ProtectedRoute>
      } />

      <Route path="/master/global-logs" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <GlobalLogs />
        </ProtectedRoute>
      } />

      <Route path="/master/dropdowns" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <MasterDropdownMaster />
        </ProtectedRoute>
      } />
      <Route path="/master/custom-modules" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <CustomModuleConfig />
        </ProtectedRoute>
      } />
      <Route path="/master/maintenance" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <WebsiteMaintenance />
        </ProtectedRoute>
      } />
      <Route path="/master/vehicle-metadata" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <VehicleMetadata />
        </ProtectedRoute>
      } />
      <Route path="/master/trademe-metadata" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <TrademeMetadata />
        </ProtectedRoute>
      } />
      <Route path="/master/settings" element={
        <ProtectedRoute allowedRoles={['master_admin']}>
          <MasterSettings />
        </ProtectedRoute>
      } />

      {/* Dynamic Dashboard Route - redirects to appropriate dashboard based on user's modules */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['master_admin', 'company_super_admin', 'company_admin']}>
          <DynamicDashboard />
        </ProtectedRoute>
      } />

      {/* Company Dashboard Route */}
      <Route path="/company/dashboard" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="vehicle_main_dashboard">
          <UnifiedDashboard />
        </ProtectedRoute>
      } />

      {/* Company Routes */}
      <Route path="/company/dealerships" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="multi_dealership">
          <Dealerships />
        </ProtectedRoute>
      } />
      <Route path="/company/users" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="vehicle_user">
          <CompanyUsers />
        </ProtectedRoute>
      } />
      <Route path="/company/permissions" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="vehicle_permission">
          <UserPermissions />
        </ProtectedRoute>
      } />
      <Route path="/company/cost-configuration" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="vehicle_cost_module">
          <CostConfiguration />
        </ProtectedRoute>
      } />
      <Route path="/company/settings" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="company_settings">
          <CompanySettings />
        </ProtectedRoute>
      } />
      <Route path="/company/dropdown-master" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="dropdown_master">
          <DropdownMaster />
        </ProtectedRoute>
      } />
      <Route path="/company/inspection-config" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="vehicle_inspection">
          <InspectionConfig />
        </ProtectedRoute>
      } />
      <Route path="/company/tradein-config" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="vehicle_tradein">
          <TradeinConfig />
        </ProtectedRoute>
      } />

      {/* Vehicle Routes with Module Requirements */}
      <Route path="/vehicles/inspection" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="vehicle_inspection">
          <InspectionList />
        </ProtectedRoute>
      } />
      <Route path="/vehicles/tradein" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="vehicle_tradein">
          <TradeinList />
        </ProtectedRoute>
      } />

      {/* Master Vehicle Routes */}
      <Route path="/vehicles/mastervehicle" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="master_vehicle">
          <MasterVehicleList />
        </ProtectedRoute>
      } />

      {/* Ad Publishing Routes */}
      <Route path="/vehicles/adpublishing" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="ad_publishing">
          <AdPublishingList />
        </ProtectedRoute>
      } />

      {/* Vehicle Pricing Routes */}
      <Route path="/vehicles/pricing" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="vehicle_pricing">
          <VehiclePricingList />
        </ProtectedRoute>
      } />

      {/* Workshop Routes */}
      <Route path="/company/workshop" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="work_shop">
          <Workshop />
        </ProtectedRoute>
      } />
      <Route path="/company/suppliers" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="work_shop">
          <SupplierManagement />
        </ProtectedRoute>
      } />
      <Route path="/company/workshop-config/:vehicleId/:vehicleType" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="work_shop">
          <WorkshopConfig />
        </ProtectedRoute>
      } />
      <Route path="/company/workflows" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="workflow_automation">
          <WorkflowManagement />
        </ProtectedRoute>
      } />
      <Route path="/company/notifications" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="company_notifications">
          <NotificationConfiguration />
        </ProtectedRoute>
      } />
      <Route path="/company/integrations" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="vehicle_integration">
          <Integration />
        </ProtectedRoute>
      } />
      <Route path="/company/service-bays" element={
        <ProtectedRoute allowedRoles={['company_super_admin']} requiredModule="vehicle_bay">
          <ServiceBays />
        </ProtectedRoute>
      } />
      <Route path="/company/bay-calendar" element={
        <ProtectedRoute allowedRoles={['company_admin']} requiredModule="vehicle_bay">
          <BayCalendar />
        </ProtectedRoute>
      } />

      {/* Tender Routes */}
      <Route path="/tender/dashboard" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="tender_main_dashboard">
          <TenderDashboard />
        </ProtectedRoute>
      } />
      <Route path="/tender/module" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="tender_module">
          <TenderModule />
        </ProtectedRoute>
      } />
      <Route path="/tender/settings" element={
        <ProtectedRoute allowedRoles={['company_super_admin', 'company_admin']} requiredModule="tender_company_settings">
          <CompanySettings />
        </ProtectedRoute>
      } />



      <Route path="/supplier/dashboard" element={
        <SupplierLayout title="Dashboard">
          <SupplierDashboard />
        </SupplierLayout>
      } />

      <Route path="/supplier/quotes/:status" element={
        <SupplierLayout title="Quotes">
          <QuotesByStatus />
        </SupplierLayout>
      } />
      <Route path="/supplier/profile" element={
        <SupplierLayout title="Profile">
          <SupplierProfile />
        </SupplierLayout>
      } />

      {/* Master Inspection Routes */}
      <Route
        path="/vehicle/master/:company_id/:vehicle_stock_id/:vehicle_type/:mode"
        element={
          <Dialog open={true} onOpenChange={() => window.history.back()}>
            <DialogContent className="max-w-[80vw] max-h-[80vh] w-[80vw] h-[80vh] p-0 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <MasterInspection />
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {/* Documentation */}
      <Route path="/docs" element={
        <ProtectedRoute allowedRoles={['master_admin', 'company_super_admin', 'company_admin']}>
          <Documentation />
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {isMobile ? (
                <PullToRefresh onRefresh={handleRefresh}>
                  {routesContent}
                </PullToRefresh>
              ) : (
                routesContent
              )}
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;