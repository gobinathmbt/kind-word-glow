import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Activity, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface QuoteLifecycleAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteLifecycleAnalysisReport: React.FC<QuoteLifecycleAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteLifecycleAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quote lifecycle data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting quote lifecycle report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.stageDurations || data.stageDurations.length === 0) return null;
    const avgData = data.stageDurations[0];
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Avg Time to Approval"
          value={`${(avgData.avgTimeToApproval || 0).toFixed(1)}h`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Time to Start"
          value={`${(avgData.avgTimeToWorkStart || 0).toFixed(1)}h`}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Cycle Time"
          value={`${(avgData.avgTotalCycleTime || 0).toFixed(1)}h`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Bottlenecks"
          value={data.bottlenecks?.length || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const stageDurationData = data.stageDurations?.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      approval: item.avgTimeToApproval || 0,
      workStart: item.avgTimeToWorkStart || 0,
      submission: item.avgTimeToSubmission || 0,
      completion: item.avgTimeToCompletion || 0,
    })) || [];

    const funnelData = data.statusFunnel?.map((item: any) => ({
      status: item._id || 'Unknown',
      count: item.count || 0,
    })) || [];

    const monthlyTrendData = data.monthlyTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      totalQuotes: item.totalQuotes || 0,
      completedQuotes: item.completedQuotes || 0,
      avgCycleTime: item.avgCycleTime || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Average Stage Durations (Hours)</h4>
          <StackedBarChart
            data={stageDurationData}
            xAxisKey="quoteType"
            series={[
              { dataKey: 'approval', name: 'To Approval', color: '#3b82f6' },
              { dataKey: 'workStart', name: 'To Work Start', color: '#10b981' },
              { dataKey: 'submission', name: 'To Submission', color: '#f59e0b' },
              { dataKey: 'completion', name: 'To Completion', color: '#8b5cf6' },
            ]}
            height={300}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Status Funnel</h4>
            <StackedBarChart
              data={funnelData}
              xAxisKey="status"
              series={[{ dataKey: 'count', name: 'Quotes', color: '#3b82f6' }]}
              height={250}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Trends</h4>
            <LineChart
              data={monthlyTrendData}
              xAxisKey="month"
              lines={[
                { dataKey: 'totalQuotes', name: 'Total Quotes', color: '#3b82f6' },
                { dataKey: 'completedQuotes', name: 'Completed', color: '#10b981' },
              ]}
              height={250}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.stageDurations) return null;

    const tableData = data.stageDurations.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalQuotes: item.totalQuotes || 0,
      avgTimeToApproval: (item.avgTimeToApproval || 0).toFixed(2),
      avgTimeToWorkStart: (item.avgTimeToWorkStart || 0).toFixed(2),
      avgTotalCycleTime: (item.avgTotalCycleTime || 0).toFixed(2),
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'avgTimeToApproval', label: 'Avg Time to Approval (h)' },
      { key: 'avgTimeToWorkStart', label: 'Avg Time to Start (h)' },
      { key: 'avgTotalCycleTime', label: 'Avg Cycle Time (h)' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Lifecycle Analysis"
      subtitle="Funnel chart for quote progression and bottleneck identification"
      icon={<Activity className="h-5 w-5" />}
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

export default QuoteLifecycleAnalysisReport;
