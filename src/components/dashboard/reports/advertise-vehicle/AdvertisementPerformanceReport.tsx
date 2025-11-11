import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { TrendingUp } from 'lucide-react';

interface AdvertisementPerformanceReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const AdvertisementPerformanceReport: React.FC<AdvertisementPerformanceReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getAdvertisementPerformance(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load advertisement performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting advertisement performance report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Ads"
          value={data.metrics.totalAds || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Ads"
          value={data.metrics.activeAds || 0}
          trend={{ value: data.metrics.activeTrend || 0, isPositive: true }}
        />
        <MetricCard
          title="Avg Views"
          value={data.metrics.avgViews || 0}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${data.metrics.conversionRate || 0}%`}
          trend={{ value: data.metrics.conversionTrend || 0, isPositive: true }}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const performanceTrends = data.performanceTrends || [];
    const platformData = data.platformPerformance || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Performance Trends</h4>
          <LineChart
            data={performanceTrends}
            xAxisKey="month"
            lines={[
              { dataKey: 'views', name: 'Views' },
              { dataKey: 'clicks', name: 'Clicks' },
              { dataKey: 'conversions', name: 'Conversions' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Platform Performance</h4>
          <StackedBarChart
            data={platformData}
            xAxisKey="platform"
            series={[
              { dataKey: 'views', name: 'Views' },
              { dataKey: 'clicks', name: 'Clicks' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'vehicleId', label: 'Vehicle ID' },
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'views', label: 'Views' },
      { key: 'clicks', label: 'Clicks' },
      { key: 'conversions', label: 'Conversions' },
      { key: 'conversionRate', label: 'Rate %' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Advertisement Performance"
      subtitle="Performance metrics and KPIs"
      icon={<TrendingUp className="h-5 w-5" />}
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

export default AdvertisementPerformanceReport;
