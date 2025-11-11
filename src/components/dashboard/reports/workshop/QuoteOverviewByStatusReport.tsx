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
}

export const QuoteOverviewByStatusReport: React.FC<QuoteOverviewByStatusReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteOverviewByStatus(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quote overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

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

    const statusData: PieChartData[] = data.statusDistribution?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.totalCount || 0,
    })) || [];

    const quoteTypeData: PieChartData[] = data.quoteTypeDistribution?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const dealershipData = data.dealershipAnalysis?.map((item: any) => ({
      dealership: item.dealershipName || 'Unknown',
      supplier: item.supplierQuotes || 0,
      bay: item.bayQuotes || 0,
      manual: item.manualQuotes || 0,
    })) || [];

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
        {dealershipData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Dealership Comparison</h4>
            <StackedBarChart
              data={dealershipData}
              xAxisKey="dealership"
              series={[
                { dataKey: 'supplier', name: 'Supplier Quotes', color: '#3b82f6' },
                { dataKey: 'bay', name: 'Bay Quotes', color: '#10b981' },
                { dataKey: 'manual', name: 'Manual Quotes', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.statusDistribution) return null;

    const tableData = data.statusDistribution.map((item: any) => ({
      status: item._id || 'Unknown',
      totalCount: item.totalCount || 0,
      avgQuoteAmount: item.avgQuoteAmount?.toFixed(2) || '0.00',
      totalQuoteAmount: item.totalQuoteAmount?.toFixed(2) || '0.00',
    }));

    const columns = [
      { key: 'status', label: 'Status' },
      { key: 'totalCount', label: 'Total Count' },
      { key: 'avgQuoteAmount', label: 'Avg Quote Amount' },
      { key: 'totalQuoteAmount', label: 'Total Quote Amount' },
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
