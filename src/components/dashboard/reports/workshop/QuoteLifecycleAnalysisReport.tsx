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
    if (!data) return null;
    
    // Calculate overall averages across all quote types
    const validStages = data.stageDurations?.filter((s: any) => s._id) || [];
    const avgApproval = validStages.reduce((sum: number, s: any) => 
      sum + (s.avgTimeToApproval && s.avgTimeToApproval > 0 ? s.avgTimeToApproval : 0), 0) / (validStages.length || 1);
    const avgWorkStart = validStages.reduce((sum: number, s: any) => 
      sum + (s.avgTimeToWorkStart && s.avgTimeToWorkStart > 0 ? s.avgTimeToWorkStart : 0), 0) / (validStages.length || 1);
    const avgCycleTime = validStages.reduce((sum: number, s: any) => 
      sum + (s.avgTotalCycleTime && s.avgTotalCycleTime > 0 ? s.avgTotalCycleTime : 0), 0) / (validStages.length || 1);
    const totalQuotes = data.statusFunnel?.reduce((sum: number, s: any) => sum + (s.count || 0), 0) || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Quotes"
          value={totalQuotes}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Time to Approval"
          value={avgApproval > 0 ? `${avgApproval.toFixed(1)}h` : 'N/A'}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Time to Start"
          value={avgWorkStart > 0 ? `${avgWorkStart.toFixed(1)}h` : 'N/A'}
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

    // Filter out null quote types and handle negative values
    const stageDurationData = data.stageDurations
      ?.filter((item: any) => item._id)
      .map((item: any) => ({
        quoteType: item._id,
        approval: item.avgTimeToApproval && item.avgTimeToApproval > 0 ? item.avgTimeToApproval : 0,
        workStart: item.avgTimeToWorkStart && item.avgTimeToWorkStart > 0 ? item.avgTimeToWorkStart : 0,
        submission: item.avgTimeToSubmission && item.avgTimeToSubmission > 0 ? item.avgTimeToSubmission : 0,
        completion: item.avgTimeToCompletion && item.avgTimeToCompletion > 0 ? item.avgTimeToCompletion : 0,
      })) || [];

    const funnelData = data.statusFunnel?.map((item: any) => ({
      status: item._id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      count: item.count || 0,
      avgAmount: item.avgQuoteAmount || 0,
    })) || [];

    const completionRateData = data.completionRates
      ?.filter((item: any) => item._id)
      .map((item: any) => ({
        quoteType: item._id,
        completed: item.completedQuotes || 0,
        inProgress: item.inProgressQuotes || 0,
        pending: item.pendingQuotes || 0,
        completionRate: item.completionRate || 0,
      })) || [];

    const monthlyTrendData = data.monthlyTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      totalQuotes: item.totalQuotes || 0,
      completedQuotes: item.completedQuotes || 0,
      avgCycleTime: item.avgCycleTime && item.avgCycleTime > 0 ? item.avgCycleTime : 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Average Stage Durations by Quote Type (Hours)</h4>
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
            <h4 className="text-sm font-medium mb-4">Completion Rates by Quote Type</h4>
            <StackedBarChart
              data={completionRateData}
              xAxisKey="quoteType"
              series={[
                { dataKey: 'completed', name: 'Completed', color: '#10b981' },
                { dataKey: 'inProgress', name: 'In Progress', color: '#f59e0b' },
                { dataKey: 'pending', name: 'Pending', color: '#ef4444' },
              ]}
              height={250}
            />
          </div>
        </div>
        {monthlyTrendData.length > 0 && (
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
        )}
        {data.bottlenecks && data.bottlenecks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Bottlenecks (Quotes Stuck in Status)</h4>
            <div className="space-y-4">
              {data.bottlenecks.map((bottleneck: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium">
                      {bottleneck._id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </h5>
                    <span className="text-sm text-gray-600">
                      {bottleneck.count} quotes - Avg {bottleneck.avgDaysStuck?.toFixed(1)} days stuck
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Vehicle Stock ID</th>
                          <th className="px-3 py-2 text-left">Field Name</th>
                          <th className="px-3 py-2 text-left">Quote Type</th>
                          <th className="px-3 py-2 text-right">Days Stuck</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bottleneck.quotes?.map((quote: any, qIndex: number) => (
                          <tr key={qIndex} className="border-t">
                            <td className="px-3 py-2">{quote.vehicleStockId}</td>
                            <td className="px-3 py-2">{quote.fieldName}</td>
                            <td className="px-3 py-2">{quote.quoteType}</td>
                            <td className="px-3 py-2 text-right">{quote.daysStuck?.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.stageDurations) return null;

    const tableData = data.stageDurations
      .filter((item: any) => item._id)
      .map((item: any) => ({
        quoteType: item._id,
        totalQuotes: item.totalQuotes || 0,
        avgTimeToApproval: item.avgTimeToApproval && item.avgTimeToApproval > 0 
          ? item.avgTimeToApproval.toFixed(2) 
          : 'N/A',
        avgTimeToWorkStart: item.avgTimeToWorkStart && item.avgTimeToWorkStart > 0 
          ? item.avgTimeToWorkStart.toFixed(2) 
          : 'N/A',
        avgTimeToSubmission: item.avgTimeToSubmission && item.avgTimeToSubmission > 0 
          ? item.avgTimeToSubmission.toFixed(2) 
          : 'N/A',
        avgTotalCycleTime: item.avgTotalCycleTime && item.avgTotalCycleTime > 0 
          ? item.avgTotalCycleTime.toFixed(2) 
          : 'N/A',
        minCycleTime: item.minCycleTime && item.minCycleTime > 0 
          ? item.minCycleTime.toFixed(2) 
          : 'N/A',
        maxCycleTime: item.maxCycleTime && item.maxCycleTime > 0 
          ? item.maxCycleTime.toFixed(2) 
          : 'N/A',
      }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'avgTimeToApproval', label: 'Avg Time to Approval (h)' },
      { key: 'avgTimeToWorkStart', label: 'Avg Time to Start (h)' },
      { key: 'avgTimeToSubmission', label: 'Avg Time to Submission (h)' },
      { key: 'avgTotalCycleTime', label: 'Avg Cycle Time (h)' },
      { key: 'minCycleTime', label: 'Min Cycle Time (h)' },
      { key: 'maxCycleTime', label: 'Max Cycle Time (h)' },
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
