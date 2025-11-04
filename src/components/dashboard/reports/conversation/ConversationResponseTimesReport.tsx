import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Clock, TrendingUp, Zap, AlertCircle } from 'lucide-react';

interface ConversationResponseTimesReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const ConversationResponseTimesReport: React.FC<ConversationResponseTimesReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getConversationResponseTimes(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation response times data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting conversation response times as ${format}`);
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
          title="Avg Response Time"
          value={`${(summary.avgResponseTime || 0).toFixed(1)} min`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Median Response Time"
          value={`${(summary.medianResponseTime || 0).toFixed(1)} min`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Fast Responses (<5min)"
          value={summary.fastResponses || 0}
          icon={<Zap className="h-5 w-5" />}
        />
        <MetricCard
          title="Slow Responses (>60min)"
          value={summary.slowResponses || 0}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Conversations"
          value={summary.totalConversations || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="With Responses"
          value={summary.conversationsWithResponses || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Response Rate"
          value={`${(summary.responseRate || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Fastest User"
          value={summary.fastestUser?.name || 'N/A'}
          icon={<Zap className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const responseTimeDistData: PieChartData[] = data.responseTimeDistribution ? [
      { name: 'Fast (<5min)', value: data.responseTimeDistribution.fast || 0, color: '#10b981' },
      { name: 'Medium (5-30min)', value: data.responseTimeDistribution.medium || 0, color: '#f59e0b' },
      { name: 'Slow (30-60min)', value: data.responseTimeDistribution.slow || 0, color: '#ef4444' },
      { name: 'Very Slow (>60min)', value: data.responseTimeDistribution.verySlow || 0, color: '#991b1b' },
    ] : [];

    const userPerformanceData = data.userResponseTimes?.slice(0, 10).map((user: any) => ({
      name: user.userName || 'Unknown',
      avgTime: user.avgResponseTime || 0,
      conversations: user.conversationCount || 0,
    })) || [];

    const typeResponseData = data.responseTimesByType?.map((type: any) => ({
      name: type._id || 'Unknown',
      avgTime: type.avgResponseTime || 0,
      count: type.count || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Response Time Distribution</h4>
            <InteractivePieChart data={responseTimeDistData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Response Times by Type</h4>
            <StackedBarChart
              data={typeResponseData}
              xAxisKey="name"
              series={[
                { dataKey: 'avgTime', name: 'Avg Time (min)', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {userPerformanceData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Users by Response Time</h4>
            <StackedBarChart
              data={userPerformanceData}
              xAxisKey="name"
              series={[
                { dataKey: 'avgTime', name: 'Avg Response Time (min)', color: '#8b5cf6' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.userResponseTimes) return null;

    const tableData = data.userResponseTimes.map((user: any) => ({
      userName: user.userName || 'Unknown',
      conversationCount: user.conversationCount || 0,
      avgResponseTime: `${(user.avgResponseTime || 0).toFixed(1)} min`,
      medianResponseTime: `${(user.medianResponseTime || 0).toFixed(1)} min`,
      fastResponses: user.fastResponses || 0,
      slowResponses: user.slowResponses || 0,
      responseRate: `${(user.responseRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'userName', label: 'User' },
      { key: 'conversationCount', label: 'Conversations' },
      { key: 'avgResponseTime', label: 'Avg Time' },
      { key: 'medianResponseTime', label: 'Median Time' },
      { key: 'fastResponses', label: 'Fast' },
      { key: 'slowResponses', label: 'Slow' },
      { key: 'responseRate', label: 'Response Rate' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Conversation Response Times"
      subtitle="Response time metrics and analysis"
      icon={<Clock className="h-5 w-5" />}
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

export default ConversationResponseTimesReport;
