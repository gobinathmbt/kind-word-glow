import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Settings, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface CostSetterEffectivenessReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const CostSetterEffectivenessReport: React.FC<CostSetterEffectivenessReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getCostSetterEffectiveness(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost setter effectiveness data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting cost setter effectiveness as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Configurations"
          value={summary.totalConfigurations || 0}
          icon={<Settings className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Configurations"
          value={summary.activeConfigurations || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Vehicles Configured"
          value={summary.vehiclesConfigured || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Effectiveness"
          value={`${summary.avgEffectiveness || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const vehicleTypeData: PieChartData[] = data.configurationsByVehicleType?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const effectivenessData = data.configurations?.slice(0, 10).map((config: any) => ({
      name: config.vehiclePurchaseType || 'Unknown',
      effectiveness: config.effectivenessScore || 0,
      usage: config.usageCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Configurations by Vehicle Type</h4>
            <InteractivePieChart data={vehicleTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Effectiveness</h4>
            <StackedBarChart
              data={effectivenessData}
              xAxisKey="name"
              series={[
                { dataKey: 'effectiveness', name: 'Effectiveness %', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.configurations && data.configurations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Configuration Details</h4>
            <DataTable
              columns={[
                { key: 'vehicleType', label: 'Vehicle Type' },
                { key: 'usage', label: 'Usage Count' },
                { key: 'effectiveness', label: 'Effectiveness' },
                { key: 'avgCost', label: 'Avg Cost' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.configurations.slice(0, 20).map((config: any) => ({
                vehicleType: config.vehiclePurchaseType || 'N/A',
                usage: config.usageCount || 0,
                effectiveness: `${config.effectivenessScore || 0}%`,
                avgCost: `${(config.avgCostValue || 0).toLocaleString()}`,
                status: config.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.configurations) return null;

    const tableData = data.configurations.map((config: any) => ({
      vehiclePurchaseType: config.vehiclePurchaseType || 'Unknown',
      usageCount: config.usageCount || 0,
      effectivenessScore: `${config.effectivenessScore || 0}%`,
      avgCostValue: `${(config.avgCostValue || 0).toLocaleString()}`,
      totalCostValue: `${(config.totalCostValue || 0).toLocaleString()}`,
      isActive: config.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'vehiclePurchaseType', label: 'Vehicle Type' },
      { key: 'usageCount', label: 'Usage Count' },
      { key: 'effectivenessScore', label: 'Effectiveness' },
      { key: 'avgCostValue', label: 'Avg Cost' },
      { key: 'totalCostValue', label: 'Total Cost' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Cost Setter Effectiveness"
      subtitle="Configuration analysis and effectiveness metrics"
      icon={<Settings className="h-5 w-5" />}
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

export default CostSetterEffectivenessReport;
