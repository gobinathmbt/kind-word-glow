import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Target } from 'lucide-react';

interface AdvertisementConversionRatesReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const AdvertisementConversionRatesReport: React.FC<AdvertisementConversionRatesReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getAdvertisementConversionRates(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load advertisement conversion rates data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting advertisement conversion rates report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Rate"
          value={`${data.metrics.overallRate || 0}%`}
          icon={<Target className="h-5 w-5" />}
          trend={{ value: data.metrics.rateTrend || 0, isPositive: true }}
        />
        <MetricCard
          title="Leads Generated"
          value={data.metrics.leadsGenerated || 0}
        />
        <MetricCard
          title="Sales Closed"
          value={data.metrics.salesClosed || 0}
        />
        <MetricCard
          title="Avg Time to Convert"
          value={`${data.metrics.avgTimeToConvert || 0} days`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const conversionTrends = data.conversionTrends || [];
    const conversionByMake = data.conversionByMake || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Conversion Trends</h4>
          <LineChart
            data={conversionTrends}
            xAxisKey="month"
            lines={[
              { dataKey: 'conversionRate', name: 'Conversion Rate' },
              { dataKey: 'leadRate', name: 'Lead Rate' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Conversion by Make</h4>
          <StackedBarChart
            data={conversionByMake}
            xAxisKey="make"
            series={[
              { dataKey: 'leads', name: 'Leads' },
              { dataKey: 'conversions', name: 'Conversions' },
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
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'totalAds', label: 'Total Ads' },
      { key: 'leads', label: 'Leads' },
      { key: 'conversions', label: 'Conversions' },
      { key: 'conversionRate', label: 'Rate %' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Advertisement Conversion Rates"
      subtitle="Success rate analysis"
      icon={<Target className="h-5 w-5" />}
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

export default AdvertisementConversionRatesReport;
