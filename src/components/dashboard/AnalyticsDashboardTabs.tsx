import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2 } from 'lucide-react';
import {
  DashboardContainer,
  DashboardHeader,
  FilterPanel,
  GlobalActions,
  ReportSection,
  ReportFilters,
} from '@/components/dashboard/layout';

// Import all report components
import * as VehicleReports from '@/components/dashboard/reports/vehicle';
import * as MasterVehicleReports from '@/components/dashboard/reports/master-vehicle';
import * as AdvertiseVehicleReports from '@/components/dashboard/reports/advertise-vehicle';
import * as WorkshopReports from '@/components/dashboard/reports/workshop';
import * as DealershipReports from '@/components/dashboard/reports/dealership';
import * as UserReports from '@/components/dashboard/reports/user';
import * as SupplierReports from '@/components/dashboard/reports/supplier';
import * as ServiceBayReports from '@/components/dashboard/reports/service-bay';
import * as ConversationReports from '@/components/dashboard/reports/conversation';
import * as ConfigurationReports from '@/components/dashboard/reports/configuration';

import { 
  Car, 
  Wrench, 
  Building2, 
  Users, 
  Package, 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  List, 
  FileCheck, 
  Settings, 
  Bell, 
  Shield, 
  Workflow 
} from 'lucide-react';

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// Define report sections
interface ReportItem {
  id: string;
  label: string;
  component: React.ComponentType<any>;
}

interface ReportSectionConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  reports: ReportItem[];
}

const AnalyticsDashboardTabs: React.FC = () => {
  const { completeUser } = useAuth();
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date()
    }
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'tab' | 'custom'>('tab');
  const [activeSection, setActiveSection] = useState<string>('vehicle');
  const [customSelectedReports, setCustomSelectedReports] = useState<string[]>([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  // Determine dealership filtering based on user role
  const isDealershipFiltered = useMemo(
    () => completeUser?.role === 'company_super_admin' && !completeUser?.is_primary_admin,
    [completeUser]
  );

  const dealershipIds = useMemo(() => {
    if (isDealershipFiltered && completeUser?.dealership_ids) {
      return completeUser.dealership_ids.map((d: any) => d._id || d);
    }
    return null;
  }, [isDealershipFiltered, completeUser]);

  // Common props for all report components
  const commonProps = {
    dealershipIds,
    dateRange: reportFilters.dateRange
      ? {
          from: reportFilters.dateRange.from?.toISOString() || '',
          to: reportFilters.dateRange.to?.toISOString() || '',
        }
      : undefined,
    refreshTrigger,
    exportEnabled: true,
  };

  // Define all report sections
  const reportSections: ReportSectionConfig[] = [
    {
      id: 'vehicle',
      title: 'Vehicle Analytics',
      icon: <Car className="h-6 w-6" />,
      reports: [
        { id: 'vehicle_overview', label: 'Vehicle Overview By Type', component: VehicleReports.VehicleOverviewByTypeReport },
        { id: 'vehicle_pricing', label: 'Vehicle Pricing Analysis', component: VehicleReports.VehiclePricingAnalysisReport },
        { id: 'vehicle_status', label: 'Vehicle Status Distribution', component: VehicleReports.VehicleStatusDistributionReport },
        { id: 'vehicle_workshop', label: 'Vehicle Workshop Integration', component: VehicleReports.VehicleWorkshopIntegrationReport },
        { id: 'vehicle_attachment', label: 'Vehicle Attachment Analysis', component: VehicleReports.VehicleAttachmentAnalysisReport },
        { id: 'vehicle_registration', label: 'Vehicle Registration Compliance', component: VehicleReports.VehicleRegistrationComplianceReport },
        { id: 'vehicle_import', label: 'Vehicle Import Timeline', component: VehicleReports.VehicleImportTimelineReport },
        { id: 'vehicle_engine', label: 'Vehicle Engine Specifications', component: VehicleReports.VehicleEngineSpecificationsReport },
        { id: 'vehicle_odometer', label: 'Vehicle Odometer Trends', component: VehicleReports.VehicleOdometerTrendsReport },
        { id: 'vehicle_ownership', label: 'Vehicle Ownership History', component: VehicleReports.VehicleOwnershipHistoryReport },
        { id: 'vehicle_queue', label: 'Vehicle Queue Processing', component: VehicleReports.VehicleQueueProcessingReport },
        { id: 'vehicle_cost', label: 'Vehicle Cost Details', component: VehicleReports.VehicleCostDetailsReport },
      ]
    },
    {
      id: 'master_vehicle',
      title: 'Master Vehicle Analytics',
      icon: <Car className="h-6 w-6" />,
      reports: [
        { id: 'master_inventory', label: 'Master Vehicle Inventory', component: MasterVehicleReports.MasterVehicleInventoryReport },
        { id: 'master_specifications', label: 'Master Vehicle Specifications', component: MasterVehicleReports.MasterVehicleSpecificationsReport },
        { id: 'master_source', label: 'Master Vehicle Source Analysis', component: MasterVehicleReports.MasterVehicleSourceAnalysisReport },
        { id: 'master_workshop_status', label: 'Master Vehicle Workshop Status', component: MasterVehicleReports.MasterVehicleWorkshopStatusReport },
        { id: 'master_pricing', label: 'Master Vehicle Pricing Strategy', component: MasterVehicleReports.MasterVehiclePricingStrategyReport },
      ]
    },
    {
      id: 'advertisement',
      title: 'Advertisement Vehicle Analytics',
      icon: <Car className="h-6 w-6" />,
      reports: [
        { id: 'ad_performance', label: 'Advertisement Performance', component: AdvertiseVehicleReports.AdvertisementPerformanceReport },
        { id: 'ad_pricing', label: 'Advertisement Pricing Analysis', component: AdvertiseVehicleReports.AdvertisementPricingAnalysisReport },
        { id: 'ad_attachment', label: 'Advertisement Attachment Quality', component: AdvertiseVehicleReports.AdvertisementAttachmentQualityReport },
        { id: 'ad_status', label: 'Advertisement Status Tracking', component: AdvertiseVehicleReports.AdvertisementStatusTrackingReport },
        { id: 'ad_conversion', label: 'Advertisement Conversion Rates', component: AdvertiseVehicleReports.AdvertisementConversionRatesReport },
      ]
    },
    {
      id: 'workshop_quote',
      title: 'Workshop Quote Analytics',
      icon: <Wrench className="h-6 w-6" />,
      reports: [
        { id: 'quote_overview', label: 'Quote Overview By Status', component: WorkshopReports.QuoteOverviewByStatusReport },
        { id: 'quote_lifecycle', label: 'Quote Lifecycle Analysis', component: WorkshopReports.QuoteLifecycleAnalysisReport },
        { id: 'quote_supplier', label: 'Quote Supplier Performance', component: WorkshopReports.QuoteSupplierPerformanceReport },
        { id: 'quote_cost', label: 'Quote Cost Analysis', component: WorkshopReports.QuoteCostAnalysisReport },
        { id: 'quote_approval', label: 'Quote Approval Rates', component: WorkshopReports.QuoteApprovalRatesReport },
        { id: 'quote_response', label: 'Quote Response Time Analysis', component: WorkshopReports.QuoteResponseTimeAnalysisReport },
        { id: 'quote_type', label: 'Quote Type Distribution', component: WorkshopReports.QuoteTypeDistributionReport },
        { id: 'quote_bay', label: 'Quote Bay Booking Analysis', component: WorkshopReports.QuoteBayBookingAnalysisReport },
        { id: 'quote_work', label: 'Quote Work Entry Analysis', component: WorkshopReports.QuoteWorkEntryAnalysisReport },
        { id: 'quote_invoice', label: 'Quote Invoice Accuracy', component: WorkshopReports.QuoteInvoiceAccuracyReport },
        { id: 'quote_rework', label: 'Quote Rework Patterns', component: WorkshopReports.QuoteReworkPatternsReport },
        { id: 'quote_conversation', label: 'Quote Conversation Metrics', component: WorkshopReports.QuoteConversationMetricsReport },
      ]
    },
    {
      id: 'workshop_report',
      title: 'Workshop Report Analytics',
      icon: <Wrench className="h-6 w-6" />,
      reports: [
        { id: 'workshop_overview', label: 'Workshop Report Overview', component: WorkshopReports.WorkshopReportOverviewReport },
        { id: 'workshop_cost', label: 'Workshop Cost Breakdown', component: WorkshopReports.WorkshopCostBreakdownReport },
        { id: 'workshop_quality', label: 'Workshop Quality Metrics', component: WorkshopReports.WorkshopQualityMetricsReport },
        { id: 'workshop_technician', label: 'Workshop Technician Performance', component: WorkshopReports.WorkshopTechnicianPerformanceReport },
        { id: 'workshop_supplier', label: 'Workshop Supplier Scorecard', component: WorkshopReports.WorkshopSupplierScorecardReport },
        { id: 'workshop_warranty', label: 'Workshop Warranty Tracking', component: WorkshopReports.WorkshopWarrantyTrackingReport },
        { id: 'workshop_completion', label: 'Workshop Completion Time Analysis', component: WorkshopReports.WorkshopCompletionTimeAnalysisReport },
        { id: 'workshop_revenue', label: 'Workshop Revenue Analysis', component: WorkshopReports.WorkshopRevenueAnalysisReport },
      ]
    },
    {
      id: 'dealership',
      title: 'Dealership Analytics',
      icon: <Building2 className="h-6 w-6" />,
      reports: [
        { id: 'dealership_overview', label: 'Dealership Overview', component: DealershipReports.DealershipOverviewReport },
        { id: 'dealership_vehicle', label: 'Dealership Vehicle Distribution', component: DealershipReports.DealershipVehicleDistributionReport },
        { id: 'dealership_workshop', label: 'Dealership Workshop Performance', component: DealershipReports.DealershipWorkshopPerformanceReport },
        { id: 'dealership_user', label: 'Dealership User Activity', component: DealershipReports.DealershipUserActivityReport },
        { id: 'dealership_revenue', label: 'Dealership Revenue Comparison', component: DealershipReports.DealershipRevenueComparisonReport },
        { id: 'dealership_bay', label: 'Dealership Service Bay Utilization', component: DealershipReports.DealershipServiceBayUtilizationReport },
      ]
    },
    {
      id: 'user',
      title: 'User Analytics',
      icon: <Users className="h-6 w-6" />,
      reports: [
        { id: 'user_performance', label: 'User Performance Metrics', component: UserReports.UserPerformanceMetricsReport },
        { id: 'user_login', label: 'User Login Patterns', component: UserReports.UserLoginPatternsReport },
        { id: 'user_role', label: 'User Role Distribution', component: UserReports.UserRoleDistributionReport },
        { id: 'user_dealership', label: 'User Dealership Assignment', component: UserReports.UserDealershipAssignmentReport },
        { id: 'user_permission', label: 'User Permission Utilization', component: UserReports.UserPermissionUtilizationReport },
      ]
    },
    {
      id: 'supplier',
      title: 'Supplier Analytics',
      icon: <Package className="h-6 w-6" />,
      reports: [
        { id: 'supplier_overview', label: 'Supplier Overview', component: SupplierReports.SupplierOverviewReport },
        { id: 'supplier_ranking', label: 'Supplier Performance Ranking', component: SupplierReports.SupplierPerformanceRankingReport },
        { id: 'supplier_tag', label: 'Supplier Tag Analysis', component: SupplierReports.SupplierTagAnalysisReport },
        { id: 'supplier_relationship', label: 'Supplier Relationship Metrics', component: SupplierReports.SupplierRelationshipMetricsReport },
      ]
    },
    {
      id: 'service_bay',
      title: 'Service Bay Analytics',
      icon: <Calendar className="h-6 w-6" />,
      reports: [
        { id: 'bay_utilization', label: 'Service Bay Utilization', component: ServiceBayReports.ServiceBayUtilizationReport },
        { id: 'bay_booking', label: 'Service Bay Booking Patterns', component: ServiceBayReports.ServiceBayBookingPatternsReport },
        { id: 'bay_user', label: 'Service Bay User Assignment', component: ServiceBayReports.ServiceBayUserAssignmentReport },
        { id: 'bay_holiday', label: 'Service Bay Holiday Impact', component: ServiceBayReports.ServiceBayHolidayImpactReport },
      ]
    },
    {
      id: 'communication',
      title: 'Communication Analytics',
      icon: <MessageSquare className="h-6 w-6" />,
      reports: [
        { id: 'conversation_volume', label: 'Conversation Volume Analysis', component: ConversationReports.ConversationVolumeAnalysisReport },
        { id: 'conversation_response', label: 'Conversation Response Times', component: ConversationReports.ConversationResponseTimesReport },
        { id: 'conversation_engagement', label: 'Conversation Engagement Metrics', component: ConversationReports.ConversationEngagementMetricsReport },
      ]
    },
    {
      id: 'cost_config',
      title: 'Cost Configuration Analytics',
      icon: <DollarSign className="h-6 w-6" />,
      reports: [
        { id: 'cost_type', label: 'Cost Type Utilization', component: ConfigurationReports.CostTypeUtilizationReport },
        { id: 'cost_setter', label: 'Cost Setter Effectiveness', component: ConfigurationReports.CostSetterEffectivenessReport },
        { id: 'cost_currency', label: 'Cost Currency Distribution', component: ConfigurationReports.CostCurrencyDistributionReport },
      ]
    },
    {
      id: 'dropdown_config',
      title: 'Dropdown Configuration Analytics',
      icon: <List className="h-6 w-6" />,
      reports: [
        { id: 'dropdown_usage', label: 'Dropdown Usage Analysis', component: ConfigurationReports.DropdownUsageAnalysisReport },
        { id: 'dropdown_value', label: 'Dropdown Value Distribution', component: ConfigurationReports.DropdownValueDistributionReport },
        { id: 'dropdown_health', label: 'Dropdown Configuration Health', component: ConfigurationReports.DropdownConfigurationHealthReport },
      ]
    },
    {
      id: 'inspection_config',
      title: 'Inspection Configuration Analytics',
      icon: <FileCheck className="h-6 w-6" />,
      reports: [
        { id: 'inspection_usage', label: 'Inspection Config Usage', component: ConfigurationReports.InspectionConfigUsageReport },
        { id: 'inspection_field', label: 'Inspection Field Analysis', component: ConfigurationReports.InspectionFieldAnalysisReport },
        { id: 'inspection_category', label: 'Inspection Category Effectiveness', component: ConfigurationReports.InspectionCategoryEffectivenessReport },
      ]
    },
    {
      id: 'tradein_config',
      title: 'Trade-in Configuration Analytics',
      icon: <FileCheck className="h-6 w-6" />,
      reports: [
        { id: 'tradein_usage', label: 'Trade-in Config Usage', component: ConfigurationReports.TradeinConfigUsageReport },
        { id: 'tradein_field', label: 'Trade-in Field Analysis', component: ConfigurationReports.TradeinFieldAnalysisReport },
        { id: 'tradein_category', label: 'Trade-in Category Effectiveness', component: ConfigurationReports.TradeinCategoryEffectivenessReport },
      ]
    },
    {
      id: 'integration',
      title: 'Integration Analytics',
      icon: <Settings className="h-6 w-6" />,
      reports: [
        { id: 'integration_status', label: 'Integration Status Overview', component: ConfigurationReports.IntegrationStatusOverviewReport },
        { id: 'integration_environment', label: 'Integration Environment Usage', component: ConfigurationReports.IntegrationEnvironmentUsageReport },
        { id: 'integration_type', label: 'Integration Type Distribution', component: ConfigurationReports.IntegrationTypeDistributionReport },
      ]
    },
    {
      id: 'notification',
      title: 'Notification Analytics',
      icon: <Bell className="h-6 w-6" />,
      reports: [
        { id: 'notification_engagement', label: 'Notification Engagement Metrics', component: ConfigurationReports.NotificationEngagementMetricsReport },
        { id: 'notification_trigger', label: 'Notification Trigger Analysis', component: ConfigurationReports.NotificationTriggerAnalysisReport },
        { id: 'notification_channel', label: 'Notification Channel Performance', component: ConfigurationReports.NotificationChannelPerformanceReport },
      ]
    },
    {
      id: 'permission',
      title: 'Permission Analytics',
      icon: <Shield className="h-6 w-6" />,
      reports: [
        { id: 'permission_usage', label: 'Group Permission Usage', component: ConfigurationReports.GroupPermissionUsageReport },
        { id: 'permission_effectiveness', label: 'Group Permission Effectiveness', component: ConfigurationReports.GroupPermissionEffectivenessReport },
      ]
    },
    {
      id: 'workflow',
      title: 'Workflow Analytics',
      icon: <Workflow className="h-6 w-6" />,
      reports: [
        { id: 'workflow_execution', label: 'Workflow Execution Metrics', component: ConfigurationReports.WorkflowExecutionMetricsReport },
        { id: 'workflow_type', label: 'Workflow Type Distribution', component: ConfigurationReports.WorkflowTypeDistributionReport },
        { id: 'workflow_success', label: 'Workflow Success Rates', component: ConfigurationReports.WorkflowSuccessRatesReport },
      ]
    },
  ];

  // Load saved preferences from cookies
  useEffect(() => {
    const savedView = getCookie('analytics_view_mode');
    if (savedView && (savedView === 'tab' ||  savedView === 'custom')) {
      setActiveView(savedView as 'tab'  | 'custom');
    }

    const savedSection = getCookie('analytics_active_section');
    if (savedSection) {
      setActiveSection(savedSection);
    }

    const savedCustomReports = getCookie('analytics_custom_reports');
    if (savedCustomReports) {
      try {
        setCustomSelectedReports(JSON.parse(savedCustomReports));
      } catch (e) {
        console.error('Error parsing custom reports cookie:', e);
      }
    }
  }, []);

  // Save view mode to cookie
  const handleViewChange = (view: 'tab' |  'custom') => {
    setActiveView(view);
    setCookie('analytics_view_mode', view);
  };

  // Save active section to cookie
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setCookie('analytics_active_section', section);
  };

  // Save custom reports to cookie
  const handleCustomReportsChange = (reports: string[]) => {
    setCustomSelectedReports(reports);
    setCookie('analytics_custom_reports', JSON.stringify(reports));
  };

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setLoading(false), 500);
  };

  // Render report component
  const renderReport = (report: ReportItem) => {
    const ReportComponent = report.component;
    return <ReportComponent key={report.id} {...commonProps} />;
  };

  // Render reports based on view mode
  const renderContent = () => {

    if (activeView === 'custom') {
      // Custom view - show only selected reports
      const selectedReports = reportSections
        .flatMap((section) => section.reports)
        .filter((report) => customSelectedReports.includes(report.id));

      return (
        <DashboardContainer>
          <ReportSection title="Custom Reports" icon={<Settings2 className="h-6 w-6" />}>
            {selectedReports.length > 0 ? (
              selectedReports.map(renderReport)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No reports selected. Click "Configure Custom View" to select reports.
              </div>
            )}
          </ReportSection>
        </DashboardContainer>
      );
    }

    // Tab view - show section tabs
    return (
      <Tabs value={activeSection} onValueChange={handleSectionChange} className="w-full">
        <div className="border-b bg-background sticky top-0 z-10">
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start h-12 bg-transparent p-0 flex-nowrap">
              {reportSections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 whitespace-nowrap"
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
        </div>

        {reportSections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="mt-0">
            <DashboardContainer>
              <ReportSection title={section.title} icon={section.icon}>
                {section.reports.map(renderReport)}
              </ReportSection>
            </DashboardContainer>
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <div className="space-y-4">
      <DashboardContainer>
        <DashboardHeader>
          <FilterPanel onFiltersChange={setReportFilters} />
          <div className="flex items-center gap-2">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={activeView === 'tab' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('tab')}
              >
                Tab View
              </Button>
              <Button
                variant={activeView === 'custom' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('custom')}
              >
                Custom View
              </Button>
            </div>

            {/* Custom View Configuration */}
            {activeView === 'custom' && (
              <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configure Custom View
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Select Reports for Custom View</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      {reportSections.map((section) => (
                        <div key={section.id} className="space-y-3">
                          <div className="flex items-center gap-2 font-semibold">
                            {section.icon}
                            <span>{section.title}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-8">
                            {section.reports.map((report) => (
                              <div key={report.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={report.id}
                                  checked={customSelectedReports.includes(report.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      handleCustomReportsChange([...customSelectedReports, report.id]);
                                    } else {
                                      handleCustomReportsChange(
                                        customSelectedReports.filter((id) => id !== report.id)
                                      );
                                    }
                                  }}
                                />
                                <Label htmlFor={report.id} className="text-sm cursor-pointer">
                                  {report.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}

            <GlobalActions onRefresh={handleRefresh} loading={loading} />
          </div>
        </DashboardHeader>
      </DashboardContainer>

      {renderContent()}
    </div>
  );
};

export default AnalyticsDashboardTabs;
