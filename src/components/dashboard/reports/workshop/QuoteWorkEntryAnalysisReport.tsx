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
  shouldLoad?: boolean;
}

export const QuoteWorkEntryAnalysisReport: React.FC<QuoteWorkEntryAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteWorkEntryAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load work entry data');
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
    console.log(`Exporting work entry report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.completionMetrics) return null;

    // Calculate overall metrics from completionMetrics data
    const totalWorkEntries = data.completionMetrics.reduce((sum: number, item: any) => sum + (item.totalWorkEntries || 0), 0);
    const totalCompleted = data.completionMetrics.reduce((sum: number, item: any) => sum + (item.completedEntries || 0), 0);
    const totalRevenue = data.completionMetrics.reduce((sum: number, item: any) => sum + (item.totalRevenue || 0), 0);
    const avgCompletionRate = data.completionMetrics.length > 0
      ? data.completionMetrics.reduce((sum: number, item: any) => sum + (item.completionRate || 0), 0) / data.completionMetrics.length
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Work Entries"
          value={totalWorkEntries}
          icon={<Clipboard className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed Entries"
          value={totalCompleted}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
        />
        <MetricCard
          title="Avg Completion Rate"
          value={`${avgCompletionRate.toFixed(1)}%`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.completionMetrics) return null;

    // Transform completionMetrics for chart
    const chartData = data.completionMetrics.map((item: any) => ({
      type: item._id || 'Unknown',
      completed: item.completedEntries || 0,
      pending: (item.totalWorkEntries || 0) - (item.completedEntries || 0),
      avgPartsCost: item.avgPartsCost || 0,
      avgLaborCost: item.avgLaborCost || 0,
    }));

    // Transform for cost comparison chart
    const costData = data.completionMetrics.map((item: any) => ({
      type: item._id || 'Unknown',
      partsCost: item.avgPartsCost || 0,
      laborCost: item.avgLaborCost || 0,
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
              { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Average Cost Breakdown by Type</h4>
          <StackedBarChart
            data={costData}
            xAxisKey="type"
            series={[
              { dataKey: 'partsCost', name: 'Parts Cost', color: '#3b82f6' },
              { dataKey: 'laborCost', name: 'Labor Cost', color: '#8b5cf6' },
            ]}
            height={300}
          />
        </div>
        {data.qualityMetrics && (
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Metrics Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-2xl font-bold text-blue-600">
                  {(data.qualityMetrics.visualInspectionPassRate || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Visual Inspection Pass Rate</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100">
                <div className="text-2xl font-bold text-green-600">
                  {(data.qualityMetrics.functionalTestPassRate || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Functional Test Pass Rate</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="text-2xl font-bold text-purple-600">
                  {(data.qualityMetrics.roadTestPassRate || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Road Test Pass Rate</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="text-2xl font-bold text-orange-600">
                  {(data.qualityMetrics.safetyCheckPassRate || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Safety Check Pass Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.completionMetrics) return null;

    const tableData = data.completionMetrics.map((item: any) => ({
      type: item._id || 'Unknown',
      totalWorkEntries: item.totalWorkEntries || 0,
      completedEntries: item.completedEntries || 0,
      avgPartsCost: `$${(item.avgPartsCost || 0).toFixed(2)}`,
      avgLaborCost: `$${(item.avgLaborCost || 0).toFixed(2)}`,
      totalRevenue: `$${(item.totalRevenue || 0).toFixed(2)}`,
      completionRate: `${(item.completionRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'type', label: 'Type' },
      { key: 'totalWorkEntries', label: 'Total Entries' },
      { key: 'completedEntries', label: 'Completed' },
      { key: 'avgPartsCost', label: 'Avg Parts Cost' },
      { key: 'avgLaborCost', label: 'Avg Labor Cost' },
      { key: 'totalRevenue', label: 'Total Revenue' },
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
