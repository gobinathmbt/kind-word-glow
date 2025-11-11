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
    if (!data?.summary) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Approval Rate"
          value={`${(data.summary.overallApprovalRate || 0).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Approved"
          value={data.summary.totalApproved || 0}
        />
        <MetricCard
          title="Total Rejected"
          value={data.summary.totalRejected || 0}
        />
        <MetricCard
          title="Pending Approval"
          value={data.summary.pendingApproval || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.approvalByType) return null;

    const approvalData: PieChartData[] = data.approvalByType.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.approvalRate || 0,
    }));

    const comparisonData = data.approvalByType.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.approvalRate || 0,
      label: `${(item.approvalRate || 0).toFixed(1)}%`,
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
    if (!data?.approvalByType) return null;

    const tableData = data.approvalByType.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalQuotes: item.totalQuotes || 0,
      approved: item.approved || 0,
      rejected: item.rejected || 0,
      approvalRate: `${(item.approvalRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
      { key: 'approvalRate', label: 'Approval Rate' },
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
