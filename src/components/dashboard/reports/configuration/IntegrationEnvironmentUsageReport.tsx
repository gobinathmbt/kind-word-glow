import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Server, TrendingUp, Activity, Globe } from 'lucide-react';

interface IntegrationEnvironmentUsageReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const IntegrationEnvironmentUsageReport: React.FC<IntegrationEnvironmentUsageReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getIntegrationEnvironmentUsage(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load integration environment usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting integration environment usage as ${format}`);
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
          title="Total Environments"
          value={summary.totalEnvironments || 0}
          icon={<Server className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Environments"
          value={summary.activeEnvironments || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Integrations"
          value={summary.totalIntegrations || 0}
          icon={<Globe className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Usage Rate"
          value={`${summary.avgUsageRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const environmentData: PieChartData[] = data.integrationsByEnvironment?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const usageData = data.environments?.map((env: any) => ({
      name: env.environment || 'Unknown',
      integrations: env.integrationCount || 0,
      active: env.activeCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Integrations by Environment</h4>
            <InteractivePieChart data={environmentData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Environment Usage</h4>
            <StackedBarChart
              data={usageData}
              xAxisKey="name"
              series={[
                { dataKey: 'integrations', name: 'Total', color: '#3b82f6' },
                { dataKey: 'active', name: 'Active', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.environments && data.environments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Environment Details</h4>
            <DataTable
              columns={[
                { key: 'environment', label: 'Environment' },
                { key: 'integrations', label: 'Integrations' },
                { key: 'active', label: 'Active' },
                { key: 'healthScore', label: 'Health Score' },
              ]}
              data={data.environments.map((env: any) => ({
                environment: env.environment || 'N/A',
                integrations: env.integrationCount || 0,
                active: env.activeCount || 0,
                healthScore: `${env.avgHealthScore || 0}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.environments) return null;

    const tableData = data.environments.map((env: any) => ({
      environment: env.environment || 'Unknown',
      integrationCount: env.integrationCount || 0,
      activeCount: env.activeCount || 0,
      inactiveCount: env.inactiveCount || 0,
      avgHealthScore: `${env.avgHealthScore || 0}%`,
      lastSyncDate: env.lastSyncDate || 'N/A',
    }));

    const columns = [
      { key: 'environment', label: 'Environment' },
      { key: 'integrationCount', label: 'Total Integrations' },
      { key: 'activeCount', label: 'Active' },
      { key: 'inactiveCount', label: 'Inactive' },
      { key: 'avgHealthScore', label: 'Avg Health Score' },
      { key: 'lastSyncDate', label: 'Last Sync' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Integration Environment Usage"
      subtitle="Environment-wise integration usage patterns"
      icon={<Server className="h-5 w-5" />}
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

export default IntegrationEnvironmentUsageReport;
