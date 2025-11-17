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

    // Calculate metrics from types array
    const validTypes = data.types?.filter((t: any) => t) || [];
    const totalTypes = validTypes.length;
    const activeTypes = validTypes.filter((t: any) => (t.activeCount || 0) > 0).length;
    const mostUsedType = validTypes.length > 0
      ? validTypes.reduce((max: any, t: any) => (t.integrationCount || 0) > (max.integrationCount || 0) ? t : max, validTypes[0])
      : null;

    // Truncate long type names to fit in the card
    const mostUsedTypeName = mostUsedType?.integrationType || 'N/A';
    const truncatedTypeName = mostUsedTypeName.length > 20
      ? mostUsedTypeName.substring(0, 20) + '...'
      : mostUsedTypeName;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Integrations"
          value={summary.totalIntegrations || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={summary.message || ''}
        />
        <MetricCard
          title="Total Types"
          value={totalTypes}
          icon={<Grid className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Types"
          value={activeTypes}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Used Type"
          value={truncatedTypeName}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={mostUsedType ? `${mostUsedType.integrationCount} integrations` : ''}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Filter valid types
    const validTypes = data.types?.filter((t: any) => t) || [];

    // If no types, show message
    if (validTypes.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Grid className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{data.summary?.message || 'No integrations found'}</p>
          <p className="text-sm mt-2">Integration type data will appear here once configured</p>
        </div>
      );
    }

    // Color palette for types
    const typeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

    // Calculate type distribution from types array
    const hasTypeData = validTypes.length > 0 && 
      validTypes.some((type: any) => (type.integrationCount || 0) > 0);
    
    const typeData: PieChartData[] = hasTypeData
      ? validTypes
          .map((type: any, index: number) => ({
            name: type.integrationType || 'Unknown',
            value: type.integrationCount || 0,
            color: typeColors[index % typeColors.length],
          }))
          .filter((item: any) => item.value > 0)
      : [
          { name: 'API', value: 0, color: typeColors[0] },
          { name: 'Webhook', value: 0, color: typeColors[1] },
          { name: 'Database', value: 0, color: typeColors[2] },
          { name: 'File Transfer', value: 0, color: typeColors[3] },
          { name: 'Message Queue', value: 0, color: typeColors[4] },
          { name: 'Email', value: 0, color: typeColors[5] },
        ];

    const usageData = validTypes
      .sort((a: any, b: any) => (b.integrationCount || 0) - (a.integrationCount || 0))
      .slice(0, 10)
      .map((type: any) => ({
        name: type.integrationType || 'Unknown',
        integrations: type.integrationCount || 0,
        active: type.activeCount || 0,
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Integrations by Type</h4>
            <InteractivePieChart data={typeData} height={300} />
            {!hasTypeData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No integration type data available
              </p>
            )}
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

        {validTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Type Details</h4>
            <DataTable
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'integrations', label: 'Integrations' },
                { key: 'active', label: 'Active' },
                { key: 'healthScore', label: 'Health Score' },
              ]}
              data={validTypes.slice(0, 20).map((type: any) => ({
                type: type.integrationType || 'N/A',
                integrations: type.integrationCount || 0,
                active: type.activeCount || 0,
                healthScore: `${(type.avgHealthScore || 0).toFixed(1)}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.types) return null;

    // Filter valid types
    const validTypes = data.types.filter((t: any) => t);

    // If no types, show message
    if (validTypes.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Grid className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{data.summary?.message || 'No integrations found'}</p>
          <p className="text-sm mt-2">Integration type data will appear here once configured</p>
        </div>
      );
    }

    const tableData = validTypes.map((type: any) => ({
      integrationType: type.integrationType || 'Unknown',
      integrationCount: type.integrationCount || 0,
      activeCount: type.activeCount || 0,
      inactiveCount: type.inactiveCount || 0,
      avgHealthScore: `${(type.avgHealthScore || 0).toFixed(1)}%`,
      usagePercentage: `${(type.usagePercentage || 0).toFixed(1)}%`,
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
