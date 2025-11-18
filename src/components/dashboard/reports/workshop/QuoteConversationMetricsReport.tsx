import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { MessageSquare } from 'lucide-react';

interface QuoteConversationMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const QuoteConversationMetricsReport: React.FC<QuoteConversationMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteConversationMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation metrics data');
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
    console.log(`Exporting conversation metrics report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.conversationMetrics) return null;
    
    const metrics = data.conversationMetrics;
    const totalMessages = metrics.totalMessages || 0;
    const totalConversations = metrics.totalConversations || 0;
    const avgMessagesPerConversation = metrics.avgMessagesPerConversation || 0;
    const avgResponseTime = metrics.avgResponseTime || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Messages"
          value={totalMessages}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Conversations"
          value={totalConversations}
        />
        <MetricCard
          title="Avg Messages per Conversation"
          value={avgMessagesPerConversation.toFixed(1)}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(1)}h`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.messageVolume || data.messageVolume.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversation data available for the selected period</p>
          </div>
        </div>
      );
    }

    const trendData = data.messageVolume.map((item: any) => ({
      date: item.date || item._id || '',
      messages: item.messageCount || item.totalMessages || 0,
      conversations: item.conversationCount || item.totalConversations || 0,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Message Volume Over Time</h4>
          <LineChart
            data={trendData}
            xAxisKey="date"
            lines={[
              { dataKey: 'messages', name: 'Messages', color: '#3b82f6' },
              { dataKey: 'conversations', name: 'Conversations', color: '#10b981' },
            ]}
            height={300}
          />
        </div>
        {data.conversationMetrics && Object.keys(data.conversationMetrics).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Conversation Metrics Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-2xl font-bold text-blue-600">
                  {data.conversationMetrics.totalMessages || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Messages</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100">
                <div className="text-2xl font-bold text-green-600">
                  {data.conversationMetrics.totalConversations || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Conversations</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="text-2xl font-bold text-purple-600">
                  {(data.conversationMetrics.avgMessagesPerConversation || 0).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Avg Messages per Conversation</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.messageVolume || data.messageVolume.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversation data available for the selected period</p>
          </div>
        </div>
      );
    }

    const tableData = data.messageVolume.map((item: any) => ({
      date: item.date || item._id || 'Unknown',
      messageCount: item.messageCount || item.totalMessages || 0,
      conversationCount: item.conversationCount || item.totalConversations || 0,
      avgMessagesPerConversation: item.avgMessagesPerConversation 
        ? item.avgMessagesPerConversation.toFixed(1) 
        : '0.0',
    }));

    const columns = [
      { key: 'date', label: 'Date' },
      { key: 'messageCount', label: 'Total Messages' },
      { key: 'conversationCount', label: 'Total Conversations' },
      { key: 'avgMessagesPerConversation', label: 'Avg Messages per Conversation' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Conversation Metrics"
      subtitle="Communication effectiveness and engagement analysis"
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

export default QuoteConversationMetricsReport;
