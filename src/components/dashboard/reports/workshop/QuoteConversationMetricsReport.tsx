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
}

export const QuoteConversationMetricsReport: React.FC<QuoteConversationMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteConversationMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation metrics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting conversation metrics report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Messages"
          value={data.summary.totalMessages || 0}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Messages per Quote"
          value={(data.summary.avgMessagesPerQuote || 0).toFixed(1)}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${(data.summary.avgResponseTime || 0).toFixed(1)}h`}
        />
        <MetricCard
          title="Engagement Rate"
          value={`${(data.summary.engagementRate || 0).toFixed(1)}%`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.messagesByType) return null;

    const barData = data.messagesByType.map((item: any) => ({
      type: item._id || 'Unknown',
      messages: item.totalMessages || 0,
      avgPerQuote: item.avgMessagesPerQuote || 0,
    }));

    const trendData = data.messageTrends?.map((item: any) => ({
      date: item.date || '',
      messages: item.totalMessages || 0,
      quotes: item.totalQuotes || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Messages by Quote Type</h4>
            <StackedBarChart
              data={barData}
              xAxisKey="type"
              series={[
                { dataKey: 'messages', name: 'Total Messages', color: '#3b82f6' },
                { dataKey: 'avgPerQuote', name: 'Avg per Quote', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Message Trends</h4>
            <LineChart
              data={trendData}
              xAxisKey="date"
              lines={[
                { dataKey: 'messages', name: 'Messages', color: '#3b82f6' },
                { dataKey: 'quotes', name: 'Quotes', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.messagesByType) return null;

    const tableData = data.messagesByType.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalMessages: item.totalMessages || 0,
      avgMessagesPerQuote: (item.avgMessagesPerQuote || 0).toFixed(1),
      avgResponseTime: `${(item.avgResponseTime || 0).toFixed(1)}h`,
      engagementRate: `${(item.engagementRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalMessages', label: 'Total Messages' },
      { key: 'avgMessagesPerQuote', label: 'Avg Messages per Quote' },
      { key: 'avgResponseTime', label: 'Avg Response Time' },
      { key: 'engagementRate', label: 'Engagement Rate' },
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
