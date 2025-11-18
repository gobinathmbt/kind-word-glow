import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { FileCheck, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface TradeinConfigUsageReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const TradeinConfigUsageReport: React.FC<TradeinConfigUsageReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getTradeinConfigUsage(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trade-in config usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting trade-in config usage as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;

    // Calculate metrics from configs array
    const configs = data.configs || [];
    const activeConfigs = configs.filter((c: any) => c.isActive).length;
    const totalAppraisals = configs.reduce((sum: number, c: any) => sum + (c.appraisalCount || 0), 0);
    const avgUsageRate = configs.length > 0
      ? configs.reduce((sum: number, c: any) => sum + (c.usageRate || 0), 0) / configs.length
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Configurations"
          value={summary.totalConfigs || 0}
          icon={<FileCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Configurations"
          value={activeConfigs}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Appraisals"
          value={totalAppraisals}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Usage Rate"
          value={`${avgUsageRate.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const configs = data.configs || [];

    // Color palette for pie chart
    const vehicleTypeColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

    // Group configs by vehicle type for pie chart
    const vehicleTypeMap = new Map<string, number>();
    configs.forEach((config: any) => {
      const type = config.vehicleType || 'Unknown';
      vehicleTypeMap.set(type, (vehicleTypeMap.get(type) || 0) + 1);
    });

    const hasVehicleTypeData = vehicleTypeMap.size > 0;
    
    const vehicleTypeData: PieChartData[] = hasVehicleTypeData
      ? Array.from(vehicleTypeMap.entries()).map(([name, value], index) => ({
          name,
          value,
          color: vehicleTypeColors[index % vehicleTypeColors.length],
        }))
      : [
          { name: 'Car', value: 0, color: vehicleTypeColors[0] },
          { name: 'Truck', value: 0, color: vehicleTypeColors[1] },
          { name: 'SUV', value: 0, color: vehicleTypeColors[2] },
          { name: 'Van', value: 0, color: vehicleTypeColors[3] },
          { name: 'Motorcycle', value: 0, color: vehicleTypeColors[4] },
        ];

    const usageData = configs
      .slice(0, 10)
      .map((config: any) => ({
        name: config.configName || 'Unknown',
        usage: config.usageCount || 0,
        appraisals: config.appraisalCount || 0,
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Configurations by Vehicle Type</h4>
            <InteractivePieChart data={vehicleTypeData} height={300} />
            {!hasVehicleTypeData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No vehicle type data available
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Usage</h4>
            <StackedBarChart
              data={usageData}
              xAxisKey="name"
              series={[
                { dataKey: 'appraisals', name: 'Appraisals', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {configs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Configuration Details</h4>
            <DataTable
              columns={[
                { key: 'configName', label: 'Configuration' },
                { key: 'vehicleType', label: 'Vehicle Type' },
                { key: 'usage', label: 'Usage Count' },
                { key: 'appraisals', label: 'Appraisals' },
                { key: 'status', label: 'Status' },
              ]}
              data={configs.slice(0, 20).map((config: any) => ({
                configName: config.configName || 'N/A',
                vehicleType: config.vehicleType || 'N/A',
                usage: config.usageCount || 0,
                appraisals: config.appraisalCount || 0,
                status: config.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    const configs = data?.configs || [];
    if (configs.length === 0) return null;

    const tableData = configs.map((config: any) => ({
      configName: config.configName || 'Unknown',
      vehicleType: config.vehicleType || 'Unknown',
      usageCount: config.usageCount || 0,
      appraisalCount: config.appraisalCount || 0,
      categoryCount: config.categoryCount || 0,
      fieldCount: config.fieldCount || 0,
      isActive: config.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'configName', label: 'Configuration' },
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'usageCount', label: 'Usage Count' },
      { key: 'appraisalCount', label: 'Appraisals' },
      { key: 'categoryCount', label: 'Categories' },
      { key: 'fieldCount', label: 'Fields' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Trade-in Config Usage"
      subtitle="Configuration usage patterns and metrics"
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

export default TradeinConfigUsageReport;
