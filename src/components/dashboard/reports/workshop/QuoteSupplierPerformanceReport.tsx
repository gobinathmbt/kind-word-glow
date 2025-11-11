import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, Award, Clock, DollarSign } from 'lucide-react';

interface QuoteSupplierPerformanceReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteSupplierPerformanceReport: React.FC<QuoteSupplierPerformanceReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteSupplierPerformance(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting supplier performance report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.topSuppliers || data.topSuppliers.length === 0) return null;
    const topSupplier = data.topSuppliers[0];
    const avgApprovalRate = data.supplierRanking?.reduce((sum: number, s: any) => sum + (s.approvalRate || 0), 0) / (data.supplierRanking?.length || 1);
    const avgResponseTime = data.supplierRanking?.reduce((sum: number, s: any) => sum + (s.avgResponseTime || 0), 0) / (data.supplierRanking?.length || 1);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Top Supplier"
          value={topSupplier.supplierName || 'N/A'}
          icon={<Award className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Suppliers"
          value={data.supplierRanking?.length || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Approval Rate"
          value={`${avgApprovalRate.toFixed(1)}%`}
          icon={<Award className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(1)}h`}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const supplierRankingData = data.supplierRanking?.slice(0, 10).map((item: any) => ({
      name: item.supplierName || 'Unknown',
      value: item.approvalRate || 0,
      label: `${(item.approvalRate || 0).toFixed(1)}%`,
    })) || [];

    const responseTimeData = data.supplierRanking?.slice(0, 10).map((item: any) => ({
      name: item.supplierName || 'Unknown',
      value: item.avgResponseTime || 0,
      label: `${(item.avgResponseTime || 0).toFixed(1)}h`,
    })) || [];

    const costCompetitivenessData = data.costAnalysis?.slice(0, 10).map((item: any) => ({
      name: item.supplierName || 'Unknown',
      value: item.lowestBidderRate || 0,
      label: `${(item.lowestBidderRate || 0).toFixed(1)}%`,
    })) || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Top Suppliers by Approval Rate</h4>
          <ComparisonChart data={supplierRankingData} height={300} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Response Time Performance</h4>
            <ComparisonChart data={responseTimeData} height={250} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Competitiveness (Lowest Bidder Rate)</h4>
            <ComparisonChart data={costCompetitivenessData} height={250} />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.supplierRanking) return null;

    const tableData = data.supplierRanking.map((item: any) => ({
      supplierName: item.supplierName || 'Unknown',
      totalQuotes: item.totalQuotesReceived || 0,
      approvedQuotes: item.approvedQuotes || 0,
      approvalRate: `${(item.approvalRate || 0).toFixed(1)}%`,
      avgResponseTime: `${(item.avgResponseTime || 0).toFixed(1)}h`,
      avgEstimatedCost: `$${(item.avgEstimatedCost || 0).toFixed(2)}`,
    }));

    const columns = [
      { key: 'supplierName', label: 'Supplier Name' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'approvedQuotes', label: 'Approved' },
      { key: 'approvalRate', label: 'Approval Rate' },
      { key: 'avgResponseTime', label: 'Avg Response Time' },
      { key: 'avgEstimatedCost', label: 'Avg Cost' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Supplier Performance"
      subtitle="Supplier ranking with performance scorecard and metrics"
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

export default QuoteSupplierPerformanceReport;
