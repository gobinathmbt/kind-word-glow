import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Activity, TrendingUp, Users, CheckCircle } from 'lucide-react';

interface ConversationEngagementMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const ConversationEngagementMetricsReport: React.FC<ConversationEngagementMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getConversationEngagementMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation engagement metrics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting conversation engagement metrics as ${format}`);
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
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Conversations"
          value={summary.activeConversations || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Resolved Conversations"
          value={summary.resolvedConversations || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Resolution Rate"
          value={`${(summary.resolutionRate || 0).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Engagement Score"
          value={(summary.avgEngagementScore || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Participants"
          value={summary.activeParticipants || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Messages/Conv"
          value={(summary.avgMessagesPerConversation || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Duration"
          value={`${(summary.avgDuration || 0).toFixed(1)} hrs`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusDistData: PieChartData[] = data.conversationsByStatus?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const engagementLevelData: PieChartData[] = data.engagementLevels ? [
      { name: 'High Engagement', value: data.engagementLevels.high || 0, color: '#10b981' },
      { name: 'Medium Engagement', value: data.engagementLevels.medium || 0, color: '#f59e0b' },
      { name: 'Low Engagement', value: data.engagementLevels.low || 0, color: '#ef4444' },
    ] : [];

    const dailyEngagementData = data.dailyEngagement?.map((day: any) => ({
      date: day.date || 'Unknown',
      conversations: day.conversationCount || 0,
      messages: day.messageCount || 0,
      participants: day.participantCount || 0,
    })) || [];

    const topParticipantsData = data.topParticipants?.slice(0, 10).map((user: any) => ({
      name: user.userName || 'Unknown',
      conversations: user.conversationCount || 0,
      messages: user.messageCount || 0,
      engagementScore: user.engagementScore || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Conversations by Status</h4>
            <InteractivePieChart data={statusDistData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement Levels</h4>
            <InteractivePieChart data={engagementLevelData} height={300} />
          </div>
        </div>

        {dailyEngagementData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Daily Engagement Trends</h4>
            <LineChart
              data={dailyEngagementData}
              xAxisKey="date"
              lines={[
                { dataKey: 'conversations', name: 'Conversations', color: '#3b82f6' },
                { dataKey: 'messages', name: 'Messages', color: '#10b981' },
                { dataKey: 'participants', name: 'Participants', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {topParticipantsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Participants by Engagement</h4>
            <StackedBarChart
              data={topParticipantsData}
              xAxisKey="name"
              series={[
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
    if (!data?.conversationsByStatus) return null;

    const tableData = data.conversationsByStatus.map((item: any) => ({
      status: item._id || 'Unknown',
      count: item.count || 0,
      totalMessages: item.totalMessages || 0,
      avgMessages: (item.avgMessages || 0).toFixed(1),
      avgDuration: `${(item.avgDuration || 0).toFixed(1)} hrs`,
      participants: item.participants || 0,
    }));

    const columns = [
      { key: 'status', label: 'Status' },
      { key: 'count', label: 'Count' },
      { key: 'totalMessages', label: 'Messages' },
      { key: 'avgMessages', label: 'Avg Messages' },
      { key: 'avgDuration', label: 'Avg Duration' },
      { key: 'participants', label: 'Participants' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Conversation Engagement Metrics"
      subtitle="Engagement rates and resolution analysis"
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

export default ConversationEngagementMetricsReport;
