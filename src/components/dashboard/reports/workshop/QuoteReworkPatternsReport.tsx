import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { RefreshCw } from 'lucide-react';

interface QuoteReworkPatternsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteReworkPatternsReport: React.FC<QuoteReworkPatternsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteReworkPatterns(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rework patterns data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting rework patterns report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Reworks"
          value={data.summary.totalReworks || 0}
          icon={<RefreshCw className="h-5 w-5" />}
        />
        <MetricCard
          title="Rework Rate"
          value={`${(data.summary.reworkRate || 0).toFixed(1)}%`}
        />
        <MetricCard
          title="Avg Rework Time"
          value={`${(data.summary.avgReworkTime || 0).toFixed(1)}h`}
        />
        <MetricCard
          title="Rework Cost"
          value={`$${(data.summary.totalReworkCost || 0).toFixed(2)}`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.reworkByReason) return null;

    const pieData: PieChartData[] = data.reworkByReason.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    }));

    const barData = data.reworkByType?.map((item: any) => ({
      type: item._id || 'Unknown',
      reworks: item.reworkCount || 0,
      rate: item.reworkRate || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Rework Reasons</h4>
            <InteractivePieChart data={pieData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Rework Rate by Quote Type</h4>
            <StackedBarChart
              data={barData}
              xAxisKey="type"
              series={[{ dataKey: 'rate', name: 'Rework Rate %', color: '#ef4444' }]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.reworkByType) return null;

    const tableData = data.reworkByType.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalQuotes: item.totalQuotes || 0,
      reworkCount: item.reworkCount || 0,
      reworkRate: `${(item.reworkRate || 0).toFixed(1)}%`,
      avgReworkTime: `${(item.avgReworkTime || 0).toFixed(1)}h`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'reworkCount', label: 'Rework Count' },
      { key: 'reworkRate', label: 'Rework Rate' },
      { key: 'avgReworkTime', label: 'Avg Rework Time' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Rework Patterns"
      subtitle="Rework frequency and causes analysis"
      icon={<RefreshCw className="h-5 w-5" />}
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

export default QuoteReworkPatternsReport;
