import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Link, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface IntegrationStatusOverviewReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const IntegrationStatusOverviewReport: React.FC<IntegrationStatusOverviewReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getIntegrationStatusOverview(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load integration status overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting integration status overview as ${format}`);
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
          title="Total Integrations"
          value={summary.totalIntegrations || 0}
          icon={<Link className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Integrations"
          value={summary.activeIntegrations || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Healthy Integrations"
          value={summary.healthyIntegrations || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Health Score"
          value={`${summary.avgHealthScore || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusData: PieChartData[] = data.integrationsByStatus?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const healthData = data.integrations?.slice(0, 10).map((integration: any) => ({
      name: integration.integrationName || 'Unknown',
      healthScore: integration.healthScore || 0,
      uptime: integration.uptimePercentage || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Integrations by Status</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Health Score</h4>
            <StackedBarChart
              data={healthData}
              xAxisKey="name"
              series={[
                { dataKey: 'healthScore', name: 'Health Score %', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.integrations && data.integrations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Integration Details</h4>
            <DataTable
              columns={[
                { key: 'integrationName', label: 'Integration' },
                { key: 'type', label: 'Type' },
                { key: 'status', label: 'Status' },
                { key: 'healthScore', label: 'Health Score' },
                { key: 'uptime', label: 'Uptime' },
              ]}
              data={data.integrations.slice(0, 20).map((integration: any) => ({
                integrationName: integration.integrationName || 'N/A',
                type: integration.integrationType || 'N/A',
                status: integration.isActive ? 'Active' : 'Inactive',
                healthScore: `${integration.healthScore || 0}%`,
                uptime: `${integration.uptimePercentage || 0}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.integrations) return null;

    const tableData = data.integrations.map((integration: any) => ({
      integrationName: integration.integrationName || 'Unknown',
      integrationType: integration.integrationType || 'Unknown',
      environment: integration.environment || 'N/A',
      healthScore: `${integration.healthScore || 0}%`,
      uptimePercentage: `${integration.uptimePercentage || 0}%`,
      lastSyncDate: integration.lastSyncDate || 'N/A',
      isActive: integration.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'integrationName', label: 'Integration' },
      { key: 'integrationType', label: 'Type' },
      { key: 'environment', label: 'Environment' },
      { key: 'healthScore', label: 'Health Score' },
      { key: 'uptimePercentage', label: 'Uptime' },
      { key: 'lastSyncDate', label: 'Last Sync' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Integration Status Overview"
      subtitle="Integration health and status monitoring"
      icon={<Link className="h-5 w-5" />}
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

export default IntegrationStatusOverviewReport;
