import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/auth/AuthContext';
import {
  DashboardContainer,
  DashboardHeader,
  FilterPanel,
  GlobalActions,
  ReportSection,
  ReportFilters,
} from '@/components/dashboard/layout';

// Vehicle Reports
import {
  VehicleOverviewByTypeReport,
  VehiclePricingAnalysisReport,
  VehicleStatusDistributionReport,
  VehicleWorkshopIntegrationReport,
  VehicleAttachmentAnalysisReport,
  VehicleRegistrationComplianceReport,
  VehicleImportTimelineReport,
  VehicleEngineSpecificationsReport,
  VehicleOdometerTrendsReport,
  VehicleOwnershipHistoryReport,
  VehicleQueueProcessingReport,
  VehicleCostDetailsReport,
} from '@/components/dashboard/reports/vehicle';

// Master Vehicle Reports
import {
  MasterVehicleInventoryReport,
  MasterVehicleSpecificationsReport,
  MasterVehicleSourceAnalysisReport,
  MasterVehicleWorkshopStatusReport,
  MasterVehiclePricingStrategyReport,
} from '@/components/dashboard/reports/master-vehicle';

// Advertise Vehicle Reports
import {
  AdvertisementPerformanceReport,
  AdvertisementPricingAnalysisReport,
  AdvertisementAttachmentQualityReport,
  AdvertisementStatusTrackingReport,
  AdvertisementConversionRatesReport,
} from '@/components/dashboard/reports/advertise-vehicle';

// Workshop Reports
import {
  QuoteOverviewByStatusReport,
  QuoteLifecycleAnalysisReport,
  QuoteSupplierPerformanceReport,
  QuoteCostAnalysisReport,
  QuoteApprovalRatesReport,
  QuoteResponseTimeAnalysisReport,
  QuoteTypeDistributionReport,
  QuoteBayBookingAnalysisReport,
  QuoteWorkEntryAnalysisReport,
  QuoteInvoiceAccuracyReport,
  QuoteReworkPatternsReport,
  QuoteConversationMetricsReport,
  WorkshopReportOverviewReport,
  WorkshopCostBreakdownReport,
  WorkshopQualityMetricsReport,
  WorkshopTechnicianPerformanceReport,
  WorkshopSupplierScorecardReport,
  WorkshopWarrantyTrackingReport,
  WorkshopCompletionTimeAnalysisReport,
  WorkshopRevenueAnalysisReport,
} from '@/components/dashboard/reports/workshop';

// Dealership, User, Supplier Reports
import {
  DealershipOverviewReport,
  DealershipVehicleDistributionReport,
  DealershipWorkshopPerformanceReport,
  DealershipUserActivityReport,
  DealershipRevenueComparisonReport,
  DealershipServiceBayUtilizationReport,
} from '@/components/dashboard/reports/dealership';

import {
  UserPerformanceMetricsReport,
  UserLoginPatternsReport,
  UserRoleDistributionReport,
  UserDealershipAssignmentReport,
  UserPermissionUtilizationReport,
} from '@/components/dashboard/reports/user';

import {
  SupplierOverviewReport,
  SupplierPerformanceRankingReport,
  SupplierTagAnalysisReport,
  SupplierRelationshipMetricsReport,
} from '@/components/dashboard/reports/supplier';

// Service Bay and Conversation Reports
import {
  ServiceBayUtilizationReport,
  ServiceBayBookingPatternsReport,
  ServiceBayUserAssignmentReport,
  ServiceBayHolidayImpactReport,
} from '@/components/dashboard/reports/service-bay';

import {
  ConversationVolumeAnalysisReport,
  ConversationResponseTimesReport,
  ConversationEngagementMetricsReport,
} from '@/components/dashboard/reports/conversation';

// Configuration Reports
import {
  CostTypeUtilizationReport,
  CostSetterEffectivenessReport,
  CostCurrencyDistributionReport,
  DropdownUsageAnalysisReport,
  DropdownValueDistributionReport,
  DropdownConfigurationHealthReport,
  InspectionConfigUsageReport,
  InspectionFieldAnalysisReport,
  InspectionCategoryEffectivenessReport,
  TradeinConfigUsageReport,
  TradeinFieldAnalysisReport,
  TradeinCategoryEffectivenessReport,
  IntegrationStatusOverviewReport,
  IntegrationEnvironmentUsageReport,
  IntegrationTypeDistributionReport,
  NotificationEngagementMetricsReport,
  NotificationTriggerAnalysisReport,
  NotificationChannelPerformanceReport,
  GroupPermissionUsageReport,
  GroupPermissionEffectivenessReport,
  WorkflowExecutionMetricsReport,
  WorkflowTypeDistributionReport,
  WorkflowSuccessRatesReport,
} from '@/components/dashboard/reports/configuration';

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

const AnalyticsDashboard: React.FC = () => {
  const { completeUser } = useAuth();
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date()
    }
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);

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

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <DashboardLayout title="Advanced Analytics">
      <DashboardContainer>
        <DashboardHeader>
          <FilterPanel onFiltersChange={setReportFilters} />
          <GlobalActions onRefresh={handleRefresh} loading={loading} />
        </DashboardHeader>

        {/* Vehicle Analytics Section (12 components) */}
        <ReportSection title="Vehicle Analytics" icon={<Car className="h-6 w-6" />}>
          <VehicleOverviewByTypeReport {...commonProps} />
          <VehiclePricingAnalysisReport {...commonProps} />
          <VehicleStatusDistributionReport {...commonProps} />
          <VehicleWorkshopIntegrationReport {...commonProps} />
          <VehicleAttachmentAnalysisReport {...commonProps} />
          <VehicleRegistrationComplianceReport {...commonProps} />
          <VehicleImportTimelineReport {...commonProps} />
          <VehicleEngineSpecificationsReport {...commonProps} />
          <VehicleOdometerTrendsReport {...commonProps} />
          <VehicleOwnershipHistoryReport {...commonProps} />
          <VehicleQueueProcessingReport {...commonProps} />
          <VehicleCostDetailsReport {...commonProps} />
        </ReportSection>

        {/* Master Vehicle Analytics Section (5 components) */}
        <ReportSection title="Master Vehicle Analytics" icon={<Car className="h-6 w-6" />}>
          <MasterVehicleInventoryReport {...commonProps} />
          <MasterVehicleSpecificationsReport {...commonProps} />
          <MasterVehicleSourceAnalysisReport {...commonProps} />
          <MasterVehicleWorkshopStatusReport {...commonProps} />
          <MasterVehiclePricingStrategyReport {...commonProps} />
        </ReportSection>

        {/* Advertisement Vehicle Analytics Section (5 components) */}
        <ReportSection title="Advertisement Vehicle Analytics" icon={<Car className="h-6 w-6" />}>
          <AdvertisementPerformanceReport {...commonProps} />
          <AdvertisementPricingAnalysisReport {...commonProps} />
          <AdvertisementAttachmentQualityReport {...commonProps} />
          <AdvertisementStatusTrackingReport {...commonProps} />
          <AdvertisementConversionRatesReport {...commonProps} />
        </ReportSection>

        {/* Workshop Quote Analytics Section (12 components) */}
        <ReportSection title="Workshop Quote Analytics" icon={<Wrench className="h-6 w-6" />}>
          <QuoteOverviewByStatusReport {...commonProps} />
          <QuoteLifecycleAnalysisReport {...commonProps} />
          <QuoteSupplierPerformanceReport {...commonProps} />
          <QuoteCostAnalysisReport {...commonProps} />
          <QuoteApprovalRatesReport {...commonProps} />
          <QuoteResponseTimeAnalysisReport {...commonProps} />
          <QuoteTypeDistributionReport {...commonProps} />
          <QuoteBayBookingAnalysisReport {...commonProps} />
          <QuoteWorkEntryAnalysisReport {...commonProps} />
          <QuoteInvoiceAccuracyReport {...commonProps} />
          <QuoteReworkPatternsReport {...commonProps} />
          <QuoteConversationMetricsReport {...commonProps} />
        </ReportSection>

        {/* Workshop Report Analytics Section (8 components) */}
        <ReportSection title="Workshop Report Analytics" icon={<Wrench className="h-6 w-6" />}>
          <WorkshopReportOverviewReport {...commonProps} />
          <WorkshopCostBreakdownReport {...commonProps} />
          <WorkshopQualityMetricsReport {...commonProps} />
          <WorkshopTechnicianPerformanceReport {...commonProps} />
          <WorkshopSupplierScorecardReport {...commonProps} />
          <WorkshopWarrantyTrackingReport {...commonProps} />
          <WorkshopCompletionTimeAnalysisReport {...commonProps} />
          <WorkshopRevenueAnalysisReport {...commonProps} />
        </ReportSection>

        {/* Dealership Analytics Section (6 components) */}
        <ReportSection title="Dealership Analytics" icon={<Building2 className="h-6 w-6" />}>
          <DealershipOverviewReport {...commonProps} />
          <DealershipVehicleDistributionReport {...commonProps} />
          <DealershipWorkshopPerformanceReport {...commonProps} />
          <DealershipUserActivityReport {...commonProps} />
          <DealershipRevenueComparisonReport {...commonProps} />
          <DealershipServiceBayUtilizationReport {...commonProps} />
        </ReportSection>

        {/* User Analytics Section (5 components) */}
        <ReportSection title="User Analytics" icon={<Users className="h-6 w-6" />}>
          <UserPerformanceMetricsReport {...commonProps} />
          <UserLoginPatternsReport {...commonProps} />
          <UserRoleDistributionReport {...commonProps} />
          <UserDealershipAssignmentReport {...commonProps} />
          <UserPermissionUtilizationReport {...commonProps} />
        </ReportSection>

        {/* Supplier Analytics Section (4 components) */}
        <ReportSection title="Supplier Analytics" icon={<Package className="h-6 w-6" />}>
          <SupplierOverviewReport {...commonProps} />
          <SupplierPerformanceRankingReport {...commonProps} />
          <SupplierTagAnalysisReport {...commonProps} />
          <SupplierRelationshipMetricsReport {...commonProps} />
        </ReportSection>

        {/* Service Bay Analytics Section (4 components) */}
        <ReportSection title="Service Bay Analytics" icon={<Calendar className="h-6 w-6" />}>
          <ServiceBayUtilizationReport {...commonProps} />
          <ServiceBayBookingPatternsReport {...commonProps} />
          <ServiceBayUserAssignmentReport {...commonProps} />
          <ServiceBayHolidayImpactReport {...commonProps} />
        </ReportSection>

        {/* Communication Analytics Section (3 components) */}
        <ReportSection title="Communication Analytics" icon={<MessageSquare className="h-6 w-6" />}>
          <ConversationVolumeAnalysisReport {...commonProps} />
          <ConversationResponseTimesReport {...commonProps} />
          <ConversationEngagementMetricsReport {...commonProps} />
        </ReportSection>

        {/* Cost Configuration Analytics Section (3 components) */}
        <ReportSection title="Cost Configuration Analytics" icon={<DollarSign className="h-6 w-6" />}>
          <CostTypeUtilizationReport {...commonProps} />
          <CostSetterEffectivenessReport {...commonProps} />
          <CostCurrencyDistributionReport {...commonProps} />
        </ReportSection>

        {/* Dropdown Configuration Analytics Section (3 components) */}
        <ReportSection title="Dropdown Configuration Analytics" icon={<List className="h-6 w-6" />}>
          <DropdownUsageAnalysisReport {...commonProps} />
          <DropdownValueDistributionReport {...commonProps} />
          <DropdownConfigurationHealthReport {...commonProps} />
        </ReportSection>

        {/* Inspection Configuration Analytics Section (3 components) */}
        <ReportSection title="Inspection Configuration Analytics" icon={<FileCheck className="h-6 w-6" />}>
          <InspectionConfigUsageReport {...commonProps} />
          <InspectionFieldAnalysisReport {...commonProps} />
          <InspectionCategoryEffectivenessReport {...commonProps} />
        </ReportSection>

        {/* Trade-in Configuration Analytics Section (3 components) */}
        <ReportSection title="Trade-in Configuration Analytics" icon={<FileCheck className="h-6 w-6" />}>
          <TradeinConfigUsageReport {...commonProps} />
          <TradeinFieldAnalysisReport {...commonProps} />
          <TradeinCategoryEffectivenessReport {...commonProps} />
        </ReportSection>

        {/* Integration Analytics Section (3 components) */}
        <ReportSection title="Integration Analytics" icon={<Settings className="h-6 w-6" />}>
          <IntegrationStatusOverviewReport {...commonProps} />
          <IntegrationEnvironmentUsageReport {...commonProps} />
          <IntegrationTypeDistributionReport {...commonProps} />
        </ReportSection>

        {/* Notification Analytics Section (3 components) */}
        <ReportSection title="Notification Analytics" icon={<Bell className="h-6 w-6" />}>
          <NotificationEngagementMetricsReport {...commonProps} />
          <NotificationTriggerAnalysisReport {...commonProps} />
          <NotificationChannelPerformanceReport {...commonProps} />
        </ReportSection>

        {/* Permission Analytics Section (2 components) */}
        <ReportSection title="Permission Analytics" icon={<Shield className="h-6 w-6" />}>
          <GroupPermissionUsageReport {...commonProps} />
          <GroupPermissionEffectivenessReport {...commonProps} />
        </ReportSection>

        {/* Workflow Analytics Section (3 components) */}
        <ReportSection title="Workflow Analytics" icon={<Workflow className="h-6 w-6" />}>
          <WorkflowExecutionMetricsReport {...commonProps} />
          <WorkflowTypeDistributionReport {...commonProps} />
          <WorkflowSuccessRatesReport {...commonProps} />
        </ReportSection>
      </DashboardContainer>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
