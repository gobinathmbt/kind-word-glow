import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Clipboard } from 'lucide-react';

interface QuoteWorkEntryAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteWorkEntryAnalysisReport: React.FC<QuoteWorkEntryAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteWorkEntryAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load work entry data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting work entry report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Work Entries"
          value={data.summary.totalWorkEntries || 0}
          icon={<Clipboard className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed Entries"
          value={data.summary.completedEntries || 0}
        />
        <MetricCard
          title="Avg Completion Time"
          value={`${(data.summary.avgCompletionTime || 0).toFixed(1)}h`}
        />
        <MetricCard
          title="Completion Rate"
          value={`${(data.summary.completionRate || 0).toFixed(1)}%`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.workEntryByType) return null;

    const chartData = data.workEntryByType.map((item: any) => ({
      type: item._id || 'Unknown',
      total: item.totalEntries || 0,
      completed: item.completedEntries || 0,
      inProgress: item.inProgressEntries || 0,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Work Entry Status by Type</h4>
          <StackedBarChart
            data={chartData}
            xAxisKey="type"
            series={[
              { dataKey: 'completed', name: 'Completed', color: '#10b981' },
              { dataKey: 'inProgress', name: 'In Progress', color: '#f59e0b' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.workEntryByType) return null;

    const tableData = data.workEntryByType.map((item: any) => ({
      type: item._id || 'Unknown',
      totalEntries: item.totalEntries || 0,
      completedEntries: item.completedEntries || 0,
      avgCompletionTime: `${(item.avgCompletionTime || 0).toFixed(1)}h`,
      completionRate: `${(item.completionRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'type', label: 'Type' },
      { key: 'totalEntries', label: 'Total Entries' },
      { key: 'completedEntries', label: 'Completed' },
      { key: 'avgCompletionTime', label: 'Avg Completion Time' },
      { key: 'completionRate', label: 'Completion Rate' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Work Entry Analysis"
      subtitle="Work entry completion tracking and metrics"
      icon={<Clipboard className="h-5 w-5" />}
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

export default QuoteWorkEntryAnalysisReport;
