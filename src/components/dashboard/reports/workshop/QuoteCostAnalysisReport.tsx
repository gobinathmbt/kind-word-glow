import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface QuoteCostAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const QuoteCostAnalysisReport: React.FC<QuoteCostAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteCostAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost analysis data');
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
    console.log(`Exporting cost analysis report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    const overallVariance = summary.overallVariancePercentage || 0;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Quotes"
          value={`${summary.totalQuotes || 0}`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`Value: $${(summary.totalQuoteValue || 0).toFixed(2)}`}
        />
        <MetricCard
          title="Avg Quote Amount"
          value={`$${(summary.avgQuoteAmount || 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`Final: $${(summary.avgFinalPrice || 0).toFixed(2)}`}
        />
        <MetricCard
          title="Total Variance"
          value={`$${(summary.totalVariance || 0).toFixed(2)}`}
          icon={overallVariance > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          subtitle={`${overallVariance.toFixed(1)}%`}
        />
        <MetricCard
          title="Quote Range"
          value={`$${summary.minQuoteAmount || 0} - $${summary.maxQuoteAmount || 0}`}
          icon={<AlertCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const varianceData = data.costVariance
      ?.filter((item: any) => item._id !== null)
      .map((item: any) => ({
        quoteType: item._id || 'Unknown',
        underBudget: item.underBudgetCount || 0,
        onBudget: item.onBudgetCount || 0,
        overBudget: item.overBudgetCount || 0,
      })) || [];

    const partsLaborData = data.partsLaborBreakdown
      ?.filter((item: any) => item._id !== null)
      .map((item: any) => ({
        quoteType: item._id || 'Unknown',
        parts: item.totalPartsCost || 0,
        labor: item.totalLaborCost || 0,
        gst: item.totalGST || 0,
      })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Variance Distribution</h4>
            <StackedBarChart
              data={varianceData}
              xAxisKey="quoteType"
              series={[
                { dataKey: 'underBudget', name: 'Under Budget', color: '#10b981' },
                { dataKey: 'onBudget', name: 'On Budget', color: '#3b82f6' },
                { dataKey: 'overBudget', name: 'Over Budget', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Parts vs Labor Breakdown</h4>
            <StackedBarChart
              data={partsLaborData}
              xAxisKey="quoteType"
              series={[
                { dataKey: 'parts', name: 'Parts Cost', color: '#3b82f6' },
                { dataKey: 'labor', name: 'Labor Cost', color: '#10b981' },
                { dataKey: 'gst', name: 'GST', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.costVariance) return null;

    const tableData = data.costVariance
      .filter((item: any) => item._id !== null)
      .map((item: any) => ({
        quoteType: item._id || 'Unknown',
        totalQuotes: item.totalQuotes || 0,
        avgQuoteAmount: `$${(item.avgQuoteAmount || 0).toFixed(2)}`,
        avgFinalPrice: `$${(item.avgFinalPrice || 0).toFixed(2)}`,
        avgVariance: `$${(item.avgVariance || 0).toFixed(2)}`,
        variancePercent: `${(item.avgVariancePercentage || 0).toFixed(1)}%`,
        accuracyRate: `${(item.accuracyRate || 0).toFixed(1)}%`,
        underBudget: item.underBudgetCount || 0,
        onBudget: item.onBudgetCount || 0,
        overBudget: item.overBudgetCount || 0,
      }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'avgQuoteAmount', label: 'Avg Quote' },
      { key: 'avgFinalPrice', label: 'Avg Final' },
      { key: 'avgVariance', label: 'Variance' },
      { key: 'variancePercent', label: 'Variance %' },
      { key: 'accuracyRate', label: 'Accuracy' },
      { key: 'underBudget', label: 'Under' },
      { key: 'onBudget', label: 'On' },
      { key: 'overBudget', label: 'Over' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Cost Analysis"
      subtitle="Cost variance and accuracy analysis"
      icon={<DollarSign className="h-5 w-5" />}
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

export default QuoteCostAnalysisReport;
