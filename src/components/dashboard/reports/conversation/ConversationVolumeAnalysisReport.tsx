import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { MessageSquare, TrendingUp, Users, Activity } from 'lucide-react';

interface ConversationVolumeAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const ConversationVolumeAnalysisReport: React.FC<ConversationVolumeAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getConversationVolumeAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation volume analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting conversation volume analysis as ${format}`);
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
          title="Total Conversations"
          value={summary.totalConversations || 0}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Messages"
          value={summary.totalMessages || 0}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Messages/Conv"
          value={(summary.avgMessagesPerConversation || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Users"
          value={summary.activeUsers || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Day"
          value={summary.peakDay?.day || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Messages"
          value={summary.peakDay?.messages || 0}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Daily Messages"
          value={(summary.avgDailyMessages || 0).toFixed(0)}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Growth Rate"
          value={`${(summary.growthRate || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const conversationTypeData: PieChartData[] = data.conversationsByType?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const dailyTrendData = data.dailyTrends?.map((trend: any) => ({
      date: trend.date || 'Unknown',
      conversations: trend.conversationCount || 0,
      messages: trend.messageCount || 0,
    })) || [];

    const userActivityData = data.topActiveUsers?.slice(0, 10).map((user: any) => ({
      name: user.userName || 'Unknown',
      conversations: user.conversationCount || 0,
      messages: user.messageCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Conversations by Type</h4>
            <InteractivePieChart data={conversationTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Active Users</h4>
            <StackedBarChart
              data={userActivityData}
              xAxisKey="name"
              series={[
                { dataKey: 'messages', name: 'Messages', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {dailyTrendData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Daily Message Volume Trends</h4>
            <LineChart
              data={dailyTrendData}
              xAxisKey="date"
              lines={[
                { dataKey: 'conversations', name: 'Conversations', color: '#3b82f6' },
                { dataKey: 'messages', name: 'Messages', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.conversationsByType) return null;

    const tableData = data.conversationsByType.map((item: any) => ({
      type: item._id || 'Unknown',
      conversations: item.count || 0,
      messages: item.totalMessages || 0,
      avgMessages: (item.avgMessages || 0).toFixed(1),
      activeUsers: item.activeUsers || 0,
    }));

    const columns = [
      { key: 'type', label: 'Type' },
      { key: 'conversations', label: 'Conversations' },
      { key: 'messages', label: 'Messages' },
      { key: 'avgMessages', label: 'Avg Messages' },
      { key: 'activeUsers', label: 'Active Users' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Conversation Volume Analysis"
      subtitle="Message volume trends and patterns"
      icon={<MessageSquare className="h-5 w-5" />}
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

export default ConversationVolumeAnalysisReport;
