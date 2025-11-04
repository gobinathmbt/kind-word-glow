import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Grid, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface IntegrationTypeDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const IntegrationTypeDistributionReport: React.FC<IntegrationTypeDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getIntegrationTypeDistribution(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load integration type distribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting integration type distribution as ${format}`);
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
          title="Total Types"
          value={summary.totalTypes || 0}
          icon={<Grid className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Types"
          value={summary.activeTypes || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Integrations"
          value={summary.totalIntegrations || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Used Type"
          value={summary.mostUsedType || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const typeData: PieChartData[] = data.integrationsByType?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const usageData = data.types?.slice(0, 10).map((type: any) => ({
      name: type.integrationType || 'Unknown',
      integrations: type.integrationCount || 0,
      active: type.activeCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Integrations by Type</h4>
            <InteractivePieChart data={typeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Types by Usage</h4>
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

        {data.types && data.types.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Type Details</h4>
            <DataTable
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'integrations', label: 'Integrations' },
                { key: 'active', label: 'Active' },
                { key: 'healthScore', label: 'Health Score' },
              ]}
              data={data.types.slice(0, 20).map((type: any) => ({
                type: type.integrationType || 'N/A',
                integrations: type.integrationCount || 0,
                active: type.activeCount || 0,
                healthScore: `${type.avgHealthScore || 0}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.types) return null;

    const tableData = data.types.map((type: any) => ({
      integrationType: type.integrationType || 'Unknown',
      integrationCount: type.integrationCount || 0,
      activeCount: type.activeCount || 0,
      inactiveCount: type.inactiveCount || 0,
      avgHealthScore: `${type.avgHealthScore || 0}%`,
      usagePercentage: `${type.usagePercentage || 0}%`,
    }));

    const columns = [
      { key: 'integrationType', label: 'Type' },
      { key: 'integrationCount', label: 'Total Integrations' },
      { key: 'activeCount', label: 'Active' },
      { key: 'inactiveCount', label: 'Inactive' },
      { key: 'avgHealthScore', label: 'Avg Health Score' },
      { key: 'usagePercentage', label: 'Usage %' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Integration Type Distribution"
      subtitle="Integration type analysis and distribution"
      icon={<Grid className="h-5 w-5" />}
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

export default IntegrationTypeDistributionReport;
