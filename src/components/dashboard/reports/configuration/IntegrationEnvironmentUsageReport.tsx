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
  shouldLoad?: boolean;
}

export const IntegrationEnvironmentUsageReport: React.FC<IntegrationEnvironmentUsageReportProps> = ({
  dealershipIds,
  dateRange,
  refreshTrigger,
  exportEnabled = true,
  shouldLoad = false}) => {
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
    if (shouldLoad) {
      fetchData();
    }
  }, [shouldLoad, dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting integration environment usage as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    
    // Calculate metrics from environments array
    const validEnvironments = data.environments?.filter((e: any) => e) || [];
    const totalEnvironments = validEnvironments.length;
    const activeEnvironments = validEnvironments.filter((e: any) => (e.activeCount || 0) > 0).length;
    const avgUsage = validEnvironments.length > 0
      ? validEnvironments.reduce((sum: number, e: any) => sum + ((e.activeCount || 0) / (e.integrationCount || 1) * 100), 0) / validEnvironments.length
      : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Integrations"
          value={summary.totalIntegrations || 0}
          icon={<Globe className="h-5 w-5" />}
          subtitle={summary.message || ''}
        />
        <MetricCard
          title="Total Environments"
          value={totalEnvironments}
          icon={<Server className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Environments"
          value={activeEnvironments}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Usage Rate"
          value={`${avgUsage.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Filter valid environments
    const validEnvironments = data.environments?.filter((e: any) => e) || [];
    
    // If no environments, show message
    if (validEnvironments.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{data.summary?.message || 'No integrations found'}</p>
          <p className="text-sm mt-2">Environment data will appear here once integrations are configured</p>
        </div>
      );
    }

    // Color palette for environments
    const environmentColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

    // Calculate environment distribution from environments array
    const hasEnvironmentData = validEnvironments.length > 0 && 
      validEnvironments.some((env: any) => (env.integrationCount || 0) > 0);
    
    const environmentData: PieChartData[] = hasEnvironmentData
      ? validEnvironments
          .map((env: any, index: number) => ({
            name: env.environment || 'Unknown',
            value: env.integrationCount || 0,
            color: environmentColors[index % environmentColors.length],
          }))
          .filter(item => item.value > 0)
      : [
          { name: 'Production', value: 0, color: environmentColors[0] },
          { name: 'Staging', value: 0, color: environmentColors[1] },
          { name: 'Development', value: 0, color: environmentColors[2] },
          { name: 'Testing', value: 0, color: environmentColors[3] },
          { name: 'QA', value: 0, color: environmentColors[4] },
        ];

    const usageData = validEnvironments.map((env: any) => ({
      name: env.environment || 'Unknown',
      integrations: env.integrationCount || 0,
      active: env.activeCount || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Integrations by Environment</h4>
            <InteractivePieChart data={environmentData} height={300} />
            {!hasEnvironmentData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No environment data available
              </p>
            )}
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

        {validEnvironments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Environment Details</h4>
            <DataTable
              columns={[
                { key: 'environment', label: 'Environment' },
                { key: 'integrations', label: 'Integrations' },
                { key: 'active', label: 'Active' },
                { key: 'healthScore', label: 'Health Score' },
              ]}
              data={validEnvironments.map((env: any) => ({
                environment: env.environment || 'N/A',
                integrations: env.integrationCount || 0,
                active: env.activeCount || 0,
                healthScore: `${(env.avgHealthScore || 0).toFixed(1)}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.environments) return null;

    // Filter valid environments
    const validEnvironments = data.environments.filter((e: any) => e);
    
    // If no environments, show message
    if (validEnvironments.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{data.summary?.message || 'No integrations found'}</p>
          <p className="text-sm mt-2">Environment data will appear here once integrations are configured</p>
        </div>
      );
    }

    const tableData = validEnvironments.map((env: any) => ({
      environment: env.environment || 'Unknown',
      integrationCount: env.integrationCount || 0,
      activeCount: env.activeCount || 0,
      inactiveCount: env.inactiveCount || 0,
      avgHealthScore: `${(env.avgHealthScore || 0).toFixed(1)}%`,
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
