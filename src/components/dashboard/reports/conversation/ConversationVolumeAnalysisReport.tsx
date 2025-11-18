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
    const peakActivity = summary.peakActivity || {};
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Conversations"
          value={summary.totalConversations || 0}
          icon={<MessageSquare className="h-5 w-5" />}
          subtitle={`${summary.activeConversations || 0} active, ${summary.archivedConversations || 0} archived`}
        />
        <MetricCard
          title="Total Messages"
          value={summary.totalMessages || 0}
          icon={<MessageSquare className="h-5 w-5" />}
          subtitle={`${summary.totalCompanyMessages || 0} company, ${summary.totalSupplierMessages || 0} supplier`}
        />
        <MetricCard
          title="Avg Messages/Conv"
          value={(summary.avgMessagesPerConversation || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Company Messages"
          value={`${(summary.companyMessagePercentage || 0).toFixed(1)}%`}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Supplier Messages"
          value={`${(summary.supplierMessagePercentage || 0).toFixed(1)}%`}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Day"
          value={peakActivity.day || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Hour"
          value={peakActivity.hour !== null ? `${peakActivity.hour}:00` : 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Text Messages"
          value={`${(summary.messageTypeDistribution?.textPercentage || 0).toFixed(1)}%`}
          icon={<MessageSquare className="h-5 w-5" />}
          subtitle={`${summary.messageTypeDistribution?.text || 0} messages`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const summary = data.summary || {};
    const messageTypeDistribution = summary.messageTypeDistribution || {};
    const timeOfDayDistribution = summary.timeOfDayDistribution || {};

    // Color palettes
    const messageTypeColors = ['#3b82f6', '#10b981', '#f59e0b'];
    const timeOfDayColors = ['#fbbf24', '#3b82f6', '#8b5cf6'];
    const dayOfWeekColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857'];
    const hourlyColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

    // Message Type Distribution
    const messageTypeData: PieChartData[] = [
      { name: 'Text', value: messageTypeDistribution.text || 0, color: messageTypeColors[0] },
      { name: 'Image', value: messageTypeDistribution.image || 0, color: messageTypeColors[1] },
      { name: 'File', value: messageTypeDistribution.file || 0, color: messageTypeColors[2] },
    ];

    // Time of Day Distribution
    const timeOfDayData: PieChartData[] = [
      { name: 'Morning', value: timeOfDayDistribution.morning || 0, color: timeOfDayColors[0] },
      { name: 'Afternoon', value: timeOfDayDistribution.afternoon || 0, color: timeOfDayColors[1] },
      { name: 'Evening', value: timeOfDayDistribution.evening || 0, color: timeOfDayColors[2] },
    ];

    // Daily Volume Data
    const dailyVolumeData = data.dailyVolume?.map((day: any) => ({
      date: day.date || 'Unknown',
      conversations: day.conversationCount || 0,
      messages: day.messageCount || 0,
    })) || [];

    // Day of Week Analysis
    const dayOfWeekData = data.dayOfWeekAnalysis?.map((day: any, index: number) => ({
      name: day.dayOfWeek || 'Unknown',
      conversations: day.conversationCount || 0,
      messages: day.messageCount || 0,
      color: dayOfWeekColors[index % dayOfWeekColors.length],
    })) || [];

    // Hourly Analysis
    const hourlyData = data.hourlyAnalysis?.map((hour: any) => ({
      hour: `${hour.hour || 0}:00`,
      messages: hour.messageCount || 0,
    })) || [];

    // Top Active Conversations
    const topConversationsData = data.topActiveConversations?.slice(0, 10).map((conv: any) => ({
      name: conv.conversationId || 'Unknown',
      messages: conv.messageCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Message Type Distribution</h4>
            <InteractivePieChart data={messageTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Time of Day Distribution</h4>
            <InteractivePieChart data={timeOfDayData} height={300} />
          </div>
        </div>

        {dailyVolumeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Daily Volume Trends</h4>
            <LineChart
              data={dailyVolumeData}
              xAxisKey="date"
              lines={[
                { dataKey: 'conversations', name: 'Conversations', color: '#3b82f6' },
                { dataKey: 'messages', name: 'Messages', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {dayOfWeekData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Day of Week Analysis</h4>
            <StackedBarChart
              data={dayOfWeekData}
              xAxisKey="name"
              series={[
                { dataKey: 'conversations', name: 'Conversations', color: '#3b82f6' },
                { dataKey: 'messages', name: 'Messages', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {hourlyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Hourly Activity Pattern</h4>
            <LineChart
              data={hourlyData}
              xAxisKey="hour"
              lines={[
                { dataKey: 'messages', name: 'Messages', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {topConversationsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Active Conversations</h4>
            <StackedBarChart
              data={topConversationsData}
              xAxisKey="name"
              series={[
                { dataKey: 'messages', name: 'Messages', color: '#8b5cf6' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.topActiveConversations) return null;

    const tableData = data.topActiveConversations.map((conv: any) => ({
      conversationId: conv.conversationId || 'Unknown',
      messageCount: conv.messageCount || 0,
      companyMessages: conv.companyMessages || 0,
      supplierMessages: conv.supplierMessages || 0,
      lastActivity: conv.lastActivity || 'N/A',
      status: conv.status || 'N/A',
    }));

    const columns = [
      { key: 'conversationId', label: 'Conversation ID' },
      { key: 'messageCount', label: 'Total Messages' },
      { key: 'companyMessages', label: 'Company Messages' },
      { key: 'supplierMessages', label: 'Supplier Messages' },
      { key: 'lastActivity', label: 'Last Activity' },
      { key: 'status', label: 'Status' },
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
