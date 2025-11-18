import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface QuoteOverviewByStatusReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const QuoteOverviewByStatusReport: React.FC<QuoteOverviewByStatusReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteOverviewByStatus(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quote overview data');
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
    console.log(`Exporting quote overview report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Quotes"
          value={summary.totalQuotes || 0}
          icon={<FileText className="h-5 w-5" />}
        />
        <MetricCard
          title="Supplier Quotes"
          value={summary.supplierQuotes || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="In Progress"
          value={summary.inProgressQuotes || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed"
          value={summary.completedQuotes || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Status Distribution with colors
    const statusColors: Record<string, string> = {
      'Completed Jobs': '#10b981',
      'Work Review': '#3b82f6',
      'Work In Progress': '#f59e0b',
      'Quote Request': '#8b5cf6',
      'Booking Request': '#06b6d4',
      'Booking Accepted': '#10b981',
      'Manual Completion In Progress': '#f59e0b',
    };

    const statusData: PieChartData[] = data.statusDistribution?.map((item: any) => {
      const name = item._id.split('_').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return {
        name,
        value: item.totalCount || 0,
        color: statusColors[name] || '#6b7280',
      };
    }) || [];

    // Quote Type Distribution with colors
    const quoteTypeColors: Record<string, string> = {
      'Supplier': '#3b82f6',
      'Bay': '#10b981',
      'Manual': '#f59e0b',
      'Unknown': '#6b7280',
    };

    const quoteTypeData: PieChartData[] = data.quoteTypeDistribution?.map((item: any) => {
      const name = item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Unknown';
      return {
        name,
        value: item.count || 0,
        color: quoteTypeColors[name] || '#6b7280',
      };
    }) || [];

    // Status by Quote Type
    const statusByQuoteTypeData = data.statusDistribution?.map((item: any) => {
      const statusName = item._id.split('_').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      const statusObj: any = { 
        status: statusName,
        total: item.totalCount,
      };
      item.quoteTypeBreakdown?.forEach((qt: any) => {
        const qtName = qt.quoteType || 'unknown';
        statusObj[qtName] = qt.count;
      });
      return statusObj;
    }) || [];

    // Quote Type with Status Breakdown
    const quoteTypeStatusData = data.quoteTypeDistribution?.map((item: any) => {
      const typeName = item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Unknown';
      const typeObj: any = { 
        type: typeName,
        total: item.count,
        avgAmount: item.avgQuoteAmount,
      };
      if (item.statusCounts) {
        Object.keys(item.statusCounts).forEach((status: string) => {
          typeObj[status] = item.statusCounts[status];
        });
      }
      return typeObj;
    }) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Quote Type Distribution</h4>
            <InteractivePieChart data={quoteTypeData} height={300} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Status by Quote Type</h4>
            <StackedBarChart
              data={statusByQuoteTypeData}
              xAxisKey="status"
              series={[
                { dataKey: 'supplier', name: 'Supplier', color: '#3b82f6' },
                { dataKey: 'bay', name: 'Bay', color: '#10b981' },
                { dataKey: 'manual', name: 'Manual', color: '#f59e0b' },
                { dataKey: 'unknown', name: 'Unknown', color: '#6b7280' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Quote Type Status Breakdown</h4>
            <StackedBarChart
              data={quoteTypeStatusData}
              xAxisKey="type"
              series={[
                { dataKey: 'completed_jobs', name: 'Completed', color: '#10b981' },
                { dataKey: 'work_in_progress', name: 'In Progress', color: '#f59e0b' },
                { dataKey: 'quote_request', name: 'Quote Request', color: '#8b5cf6' },
                { dataKey: 'work_review', name: 'Review', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.statusDistribution) return null;

    const tableData = data.statusDistribution.map((item: any) => {
      const statusName = item._id.split('_').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return {
        status: statusName,
        totalCount: item.totalCount || 0,
        avgQuoteAmount: `$${item.avgQuoteAmount?.toFixed(2) || '0.00'}`,
        totalQuoteAmount: `$${item.totalQuoteAmount?.toFixed(2) || '0.00'}`,
      };
    });

    const columns = [
      { key: 'status', label: 'Status', sortable: true },
      { key: 'totalCount', label: 'Total Count', sortable: true },
      { key: 'avgQuoteAmount', label: 'Avg Quote Amount', sortable: true },
      { key: 'totalQuoteAmount', label: 'Total Quote Amount', sortable: true },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Overview by Status"
      subtitle="Status distribution across all quote types"
      icon={<FileText className="h-5 w-5" />}
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

export default QuoteOverviewByStatusReport;
