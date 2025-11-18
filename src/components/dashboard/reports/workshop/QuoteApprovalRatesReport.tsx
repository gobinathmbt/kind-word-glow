import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { CheckCircle } from 'lucide-react';

interface QuoteApprovalRatesReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteApprovalRatesReport: React.FC<QuoteApprovalRatesReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteApprovalRates(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load approval rates data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting approval rates report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.approvalRatesByType) return null;
    
    // Calculate overall metrics from approvalRatesByType
    const totalQuotes = data.approvalRatesByType.reduce((sum: number, item: any) => sum + (item.totalQuotes || 0), 0);
    const totalApproved = data.approvalRatesByType.reduce((sum: number, item: any) => sum + (item.approvedQuotes || 0), 0);
    const totalRejected = data.approvalRatesByType.reduce((sum: number, item: any) => sum + (item.rejectedQuotes || 0), 0);
    const totalPending = data.approvalRatesByType.reduce((sum: number, item: any) => sum + (item.pendingQuotes || 0), 0);
    const overallApprovalRate = totalQuotes > 0 ? (totalApproved / totalQuotes) * 100 : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Approval Rate"
          value={`${overallApprovalRate.toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Approved"
          value={totalApproved}
        />
        <MetricCard
          title="Total Rejected"
          value={totalRejected}
        />
        <MetricCard
          title="Pending Approval"
          value={totalPending}
        />
      </div>
    );
  };

  const getColorForQuoteType = (type: string): string => {
    const colorMap: Record<string, string> = {
      'manual': '#f59e0b',
      'bay': '#10b981',
      'supplier': '#3b82f6',
      'null': '#6b7280',
      'Unknown': '#6b7280',
    };
    return colorMap[type] || '#6b7280';
  };

  const renderCharts = () => {
    if (!data?.approvalRatesByType) return null;

    const approvalData: PieChartData[] = data.approvalRatesByType.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.approvalRate || 0,
      color: getColorForQuoteType(item._id || 'Unknown'),
    }));

    const comparisonData = data.approvalRatesByType.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.approvalRate || 0,
      percentage: item.approvalRate || 0,
      color: getColorForQuoteType(item._id || 'Unknown'),
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Approval Rate by Quote Type</h4>
            <InteractivePieChart data={approvalData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Approval Rate Comparison</h4>
            <ComparisonChart data={comparisonData} height={300} />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.approvalRatesByType) return null;

    const tableData = data.approvalRatesByType.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalQuotes: item.totalQuotes || 0,
      approved: item.approvedQuotes || 0,
      rejected: item.rejectedQuotes || 0,
      pending: item.pendingQuotes || 0,
      approvalRate: `${(item.approvalRate || 0).toFixed(1)}%`,
      rejectionRate: `${(item.rejectionRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
      { key: 'pending', label: 'Pending' },
      { key: 'approvalRate', label: 'Approval Rate' },
      { key: 'rejectionRate', label: 'Rejection Rate' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Approval Rates"
      subtitle="Approval patterns and success rates"
      icon={<CheckCircle className="h-5 w-5" />}
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

export default QuoteApprovalRatesReport;
