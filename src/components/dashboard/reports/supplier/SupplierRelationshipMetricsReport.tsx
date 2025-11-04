import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, MessageSquare, Clock, TrendingUp } from 'lucide-react';

interface SupplierRelationshipMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const SupplierRelationshipMetricsReport: React.FC<SupplierRelationshipMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getSupplierRelationshipMetrics(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier relationship data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting supplier relationship report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active Relationships"
          value={data.metrics.activeRelationships || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Communications"
          value={data.metrics.totalCommunications || 0}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${data.metrics.avgResponseTime || 0} hrs`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Engagement Score"
          value={data.metrics.engagementScore || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const engagementTrendData = data.engagementTrend || [];
    const communicationData = data.communicationBySupplier || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Engagement Trend Over Time</h4>
          <LineChart
            data={engagementTrendData}
            xAxisKey="date"
            lines={[
              { dataKey: 'engagementScore', name: 'Engagement', color: 'hsl(var(--chart-1))' },
              { dataKey: 'communications', name: 'Communications', color: 'hsl(var(--chart-2))' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Communication by Supplier</h4>
          <StackedBarChart
            data={communicationData}
            xAxisKey="supplierName"
            series={[
              { dataKey: 'messages', name: 'Messages' },
              { dataKey: 'quotes', name: 'Quotes' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'supplierName', label: 'Supplier' },
      { key: 'totalCommunications', label: 'Communications' },
      { key: 'avgResponseTime', label: 'Response Time (hrs)' },
      { key: 'engagementScore', label: 'Engagement' },
      { key: 'lastContact', label: 'Last Contact' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Supplier Relationship Metrics"
      subtitle="Engagement and communication metrics"
      icon={<Users className="h-5 w-5" />}
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

export default SupplierRelationshipMetricsReport;
