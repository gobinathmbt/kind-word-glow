import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
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
    const readMetrics = summary.readMetrics || {};
    const engagementMetrics = summary.engagementMetrics || {};
    const resolutionMetrics = summary.resolutionMetrics || {};
    const performanceIndicators = summary.performanceIndicators || {};

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Conversations"
          value={summary.totalConversations || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.activeConversations || 0} active, ${summary.resolvedConversations || 0} resolved`}
        />
        <MetricCard
          title="Avg Engagement Score"
          value={(engagementMetrics.avgEngagementScore || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${(engagementMetrics.highEngagementPercentage || 0).toFixed(1)}% high engagement`}
        />
        <MetricCard
          title="Resolution Rate"
          value={`${(resolutionMetrics.resolutionRate || 0).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`${resolutionMetrics.unresolvedConversations || 0} unresolved`}
        />
        <MetricCard
          title="Overall Read Rate"
          value={`${(readMetrics.overallReadRate || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${readMetrics.totalUnreadMessages || 0} unread`}
        />
        <MetricCard
          title="Avg Messages/Conv"
          value={(summary.avgMessagesPerConversation || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.totalMessages || 0} total messages`}
        />
        <MetricCard
          title="Avg Time to Resolution"
          value={`${(resolutionMetrics.avgTimeToResolutionDays || 0).toFixed(1)} days`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Overall Health"
          value={performanceIndicators.overallHealth || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${performanceIndicators.needsAttention || 0} need attention`}
        />
        <MetricCard
          title="High Performers"
          value={performanceIndicators.highPerformers || 0}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const summary = data.summary || {};
    const engagementMetrics = summary.engagementMetrics || {};
    const engagementDistribution = engagementMetrics.distribution || {};

    // Color palettes
    const engagementColors = ['#10b981', '#f59e0b', '#ef4444'];
    const statusColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const performanceColors = ['#8b5cf6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];

    // Engagement Level Distribution
    const engagementLevelData: PieChartData[] = [
      { name: 'High Engagement', value: engagementDistribution.high || 0, color: engagementColors[0] },
      { name: 'Medium Engagement', value: engagementDistribution.medium || 0, color: engagementColors[1] },
      { name: 'Low Engagement', value: engagementDistribution.low || 0, color: engagementColors[2] },
    ];

    // Status Distribution
    const statusData: PieChartData[] = [
      { name: 'Active', value: summary.activeConversations || 0, color: statusColors[0] },
      { name: 'Resolved', value: summary.resolvedConversations || 0, color: statusColors[1] },
      { name: 'Archived', value: summary.archivedConversations || 0, color: statusColors[2] },
    ];

    // Top Engaged Conversations
    const topEngagedData = data.topEngaged?.slice(0, 10).map((conv: any, index: number) => ({
      name: conv.conversationId || 'Unknown',
      value: conv.engagementScore || 0,
      label: `${(conv.engagementScore || 0).toFixed(1)}`,
      color: performanceColors[index % performanceColors.length],
    })) || [];

    // Low Engagement Conversations
    const lowEngagementData = data.lowEngagement?.slice(0, 10).map((conv: any) => ({
      conversationId: conv.conversationId || 'Unknown',
      engagementScore: (conv.engagementScore || 0).toFixed(1),
      messageCount: conv.messageCount || 0,
      status: conv.status || 'N/A',
    })) || [];

    // Quote Type Analysis
    const quoteTypeData = data.quoteTypeAnalysis?.map((type: any) => ({
      name: type.quoteType || 'Unknown',
      conversations: type.conversationCount || 0,
      avgEngagement: type.avgEngagementScore || 0,
    })) || [];

    // Supplier Engagement
    const supplierEngagementData = data.supplierEngagement?.slice(0, 10).map((supplier: any, index: number) => ({
      name: supplier.supplierName || 'Unknown',
      value: supplier.avgEngagementScore || 0,
      label: `${(supplier.avgEngagementScore || 0).toFixed(1)}`,
      color: performanceColors[index % performanceColors.length],
    })) || [];

    // Trends
    const trendsData = data.trends?.map((trend: any) => ({
      date: trend.date || 'Unknown',
      avgEngagement: trend.avgEngagementScore || 0,
      conversations: trend.conversationCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement Level Distribution</h4>
            <InteractivePieChart data={engagementLevelData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Conversation Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
        </div>

        {topEngagedData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Engaged Conversations</h4>
            <ComparisonChart data={topEngagedData} height={300} />
          </div>
        )}

        {quoteTypeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement by Quote Type</h4>
            <StackedBarChart
              data={quoteTypeData}
              xAxisKey="name"
              series={[
                { dataKey: 'conversations', name: 'Conversations', color: '#3b82f6' },
                { dataKey: 'avgEngagement', name: 'Avg Engagement', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {supplierEngagementData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Supplier Engagement</h4>
            <ComparisonChart data={supplierEngagementData} height={300} />
          </div>
        )}

        {trendsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement Trends Over Time</h4>
            <LineChart
              data={trendsData}
              xAxisKey="date"
              lines={[
                { dataKey: 'avgEngagement', name: 'Avg Engagement Score', color: '#8b5cf6' },
                { dataKey: 'conversations', name: 'Conversations', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        )}

        {lowEngagementData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Low Engagement Conversations (Need Attention)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Conversation ID</th>
                    <th className="px-4 py-3 text-right font-medium">Engagement Score</th>
                    <th className="px-4 py-3 text-right font-medium">Messages</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowEngagementData.map((conv: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{conv.conversationId}</td>
                      <td className="px-4 py-3 text-right">{conv.engagementScore}</td>
                      <td className="px-4 py-3 text-right">{conv.messageCount}</td>
                      <td className="px-4 py-3">{conv.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.conversations) return null;

    const tableData = data.conversations.map((conv: any) => ({
      conversationId: conv.conversationId || 'Unknown',
      status: conv.status || 'N/A',
      messageCount: conv.messageCount || 0,
      engagementScore: (conv.engagementScore || 0).toFixed(1),
      readRate: `${(conv.readRate || 0).toFixed(1)}%`,
      lastActivity: conv.lastActivity || 'N/A',
      durationDays: (conv.durationDays || 0).toFixed(1),
      quoteType: conv.quoteType || 'N/A',
    }));

    const columns = [
      { key: 'conversationId', label: 'Conversation ID' },
      { key: 'status', label: 'Status' },
      { key: 'messageCount', label: 'Messages' },
      { key: 'engagementScore', label: 'Engagement Score' },
      { key: 'readRate', label: 'Read Rate' },
      { key: 'lastActivity', label: 'Last Activity' },
      { key: 'durationDays', label: 'Duration (days)' },
      { key: 'quoteType', label: 'Quote Type' },
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
