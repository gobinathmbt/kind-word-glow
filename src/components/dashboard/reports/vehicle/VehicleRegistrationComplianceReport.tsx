import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { FileCheck } from 'lucide-react';

interface VehicleRegistrationComplianceReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleRegistrationComplianceReport: React.FC<VehicleRegistrationComplianceReportProps> = ({
  dealershipIds,
  dateRange,
  refreshTrigger,
  exportEnabled = true,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (dealershipIds && dealershipIds.length > 0) {
        params.dealership_ids = dealershipIds.join(',');
      }
      if (dateRange) {
        params.from = dateRange.from;
        params.to = dateRange.to;
      }
      const response = await dashboardAnalyticsServices.getVehicleRegistrationCompliance(params);
      console.log('Registration Compliance API Response:', response);
      console.log('Registration Compliance Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load registration compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting registration compliance report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.registrationOverview) return null;
    
    const totalVehicles = data.registrationOverview.reduce((sum: number, item: any) => sum + item.totalVehicles, 0);
    const totalRegisteredLocal = data.registrationOverview.reduce((sum: number, item: any) => sum + item.registeredLocal, 0);
    const totalReRegistered = data.registrationOverview.reduce((sum: number, item: any) => sum + item.reRegistered, 0);
    const totalWithLicenseExpiry = data.registrationOverview.reduce((sum: number, item: any) => sum + item.withLicenseExpiry, 0);
    
    const expiredLicenses = data.expiringLicenses?.expiredLicenses?.reduce((sum: number, item: any) => sum + item.count, 0) || 0;
    const expiredWofCof = data.expiringWofCof?.expiredWofCof?.reduce((sum: number, item: any) => sum + item.count, 0) || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={<FileCheck className="h-5 w-5" />}
          subtitle={`${totalRegisteredLocal} registered local`}
        />
        <MetricCard
          title="License Compliance"
          value={`${((totalWithLicenseExpiry / totalVehicles) * 100).toFixed(1)}%`}
          subtitle={`${totalWithLicenseExpiry} with expiry data`}
        />
        <MetricCard
          title="Expired Licenses"
          value={expiredLicenses}
          subtitle={`${((expiredLicenses / totalVehicles) * 100).toFixed(1)}% of total`}
        />
        <MetricCard
          title="Expired WOF/COF"
          value={expiredWofCof}
          subtitle={`${((expiredWofCof / totalVehicles) * 100).toFixed(1)}% of total`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Registration Status by Type
    const registrationStatusData = data.registrationOverview?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      registeredLocal: item.registeredLocal,
      reRegistered: item.reRegistered,
      withLicenseExpiry: item.withLicenseExpiry,
      withWofCofExpiry: item.withWofCofExpiry,
      localRate: item.localRegistrationRate,
      reRegRate: item.reRegistrationRate,
    })) || [];

    // Local vs Imported Distribution
    const localVsImportedData: PieChartData[] = [];
    let totalLocal = 0;
    let totalImported = 0;
    
    data.localVsImported?.forEach((item: any) => {
      item.registrationBreakdown?.forEach((breakdown: any) => {
        if (breakdown.registeredLocal === true) {
          totalLocal += breakdown.count;
        } else if (breakdown.registeredLocal === false) {
          totalImported += breakdown.count;
        }
      });
    });
    
    if (totalLocal > 0) {
      localVsImportedData.push({ name: 'Local', value: totalLocal, color: '#10b981' });
    }
    if (totalImported > 0) {
      localVsImportedData.push({ name: 'Imported', value: totalImported, color: '#3b82f6' });
    }

    // Country Distribution
    const countryData = data.countryDistribution
      ?.filter((item: any) => item._id && item._id !== '' && item.count > 0)
      .map((item: any) => ({
        country: item._id,
        count: item.count,
      })) || [];

    // Road User Charges
    const rucData = data.roadUserCharges?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      rucApplies: item.rucApplies,
      outstandingRuc: item.outstandingRuc,
      avgRucEndDistance: item.avgRucEndDistance || 0,
      rucApplicableRate: item.rucApplicableRate,
      outstandingRucRate: item.outstandingRucRate,
    })) || [];

    // Dealership Compliance
    const dealershipComplianceData = data.dealershipCompliance
      ?.filter((item: any) => item.totalVehicles > 0)
      .map((item: any) => ({
        dealership: item._id || 'No Dealership',
        totalVehicles: item.totalVehicles,
        validLicenses: item.validLicenses,
        validWofCof: item.validWofCof,
        compliantVehicles: item.compliantVehicles,
        complianceRate: item.complianceRate,
      })) || [];

    // Expired Items by Type
    const expiredLicensesData = data.expiringLicenses?.expiredLicenses?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      count: item.count,
    })) || [];

    const expiredWofCofData = data.expiringWofCof?.expiredWofCof?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      count: item.count,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Local vs Imported</h4>
            <InteractivePieChart data={localVsImportedData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Registration Status by Type</h4>
            <StackedBarChart
              data={registrationStatusData}
              xAxisKey="type"
              series={[
                { dataKey: 'registeredLocal', name: 'Registered Local', color: '#10b981' },
                { dataKey: 'reRegistered', name: 'Re-Registered', color: '#3b82f6' },
                { dataKey: 'withLicenseExpiry', name: 'With License Expiry', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Expired Licenses by Type</h4>
            <StackedBarChart
              data={expiredLicensesData}
              xAxisKey="type"
              series={[
                { dataKey: 'count', name: 'Expired Licenses', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Expired WOF/COF by Type</h4>
            <StackedBarChart
              data={expiredWofCofData}
              xAxisKey="type"
              series={[
                { dataKey: 'count', name: 'Expired WOF/COF', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Road User Charges</h4>
            <StackedBarChart
              data={rucData}
              xAxisKey="type"
              series={[
                { dataKey: 'rucApplies', name: 'RUC Applies', color: '#3b82f6' },
                { dataKey: 'outstandingRuc', name: 'Outstanding RUC', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Dealership Compliance</h4>
            <StackedBarChart
              data={dealershipComplianceData}
              xAxisKey="dealership"
              series={[
                { dataKey: 'compliantVehicles', name: 'Compliant', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.registrationOverview) return null;

    const columns = [
      { key: 'type', label: 'Vehicle Type', sortable: true },
      { key: 'totalVehicles', label: 'Total', sortable: true },
      { key: 'registeredLocal', label: 'Local', sortable: true },
      { key: 'reRegistered', label: 'Re-Registered', sortable: true },
      { key: 'withLicenseExpiry', label: 'License Expiry', sortable: true },
      { key: 'withWofCofExpiry', label: 'WOF/COF Expiry', sortable: true },
      { key: 'localRate', label: 'Local %', sortable: true },
      { key: 'reRegRate', label: 'Re-Reg %', sortable: true },
    ];

    const tableData = data.registrationOverview.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      registeredLocal: item.registeredLocal,
      reRegistered: item.reRegistered,
      withLicenseExpiry: item.withLicenseExpiry,
      withWofCofExpiry: item.withWofCofExpiry,
      localRate: `${item.localRegistrationRate.toFixed(1)}%`,
      reRegRate: `${item.reRegistrationRate.toFixed(1)}%`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Registration Compliance"
      subtitle="Registration status, license expiry, and compliance tracking"
      icon={<FileCheck className="h-5 w-5" />}
      loading={loading}
      error={error}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showViewToggle={true}
      actions={
        <div className="flex gap-2">
          {exportEnabled && <ExportButton onExport={handleExport} />}
          <RefreshButton onRefresh={handleRefresh} loading={loading} />
        </div>
      }
    >
      {renderMetrics()}
      {viewMode === 'chart' ? renderCharts() : renderTable()}
    </ReportCard>
  );
};

export default VehicleRegistrationComplianceReport;
