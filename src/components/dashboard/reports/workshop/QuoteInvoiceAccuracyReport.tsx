import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { FileCheck } from 'lucide-react';

interface QuoteInvoiceAccuracyReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteInvoiceAccuracyReport: React.FC<QuoteInvoiceAccuracyReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteInvoiceAccuracy(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice accuracy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting invoice accuracy report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.accuracyByType) return null;
    
    const totalQuotes = data.accuracyByType.reduce((sum: number, item: any) => sum + (item.totalQuotes || 0), 0);
    const totalWithin5Percent = data.accuracyByType.reduce((sum: number, item: any) => sum + (item.within5Percent || 0), 0);
    const totalWithin10Percent = data.accuracyByType.reduce((sum: number, item: any) => sum + (item.within10Percent || 0), 0);
    const avgAccuracyScore = data.accuracyByType.length > 0
      ? data.accuracyByType.reduce((sum: number, item: any) => sum + (item.accuracyScore || 0), 0) / data.accuracyByType.length
      : 0;
    const avgVariance = data.accuracyByType.length > 0
      ? data.accuracyByType.reduce((sum: number, item: any) => sum + (item.avgVariance || 0), 0) / data.accuracyByType.length
      : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Accuracy Score"
          value={`${avgAccuracyScore.toFixed(1)}%`}
          icon={<FileCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Variance"
          value={`$${avgVariance.toFixed(2)}`}
        />
        <MetricCard
          title="Total Quotes"
          value={totalQuotes}
        />
        <MetricCard
          title="Within 5% Accuracy"
          value={totalWithin5Percent}
          subtitle={`${totalWithin10Percent} within 10%`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.accuracyByType) return null;

    const accuracyColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
    const varianceColors = ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'];

    const pieData: PieChartData[] = data.accuracyByType.map((item: any, index: number) => ({
      name: item._id || 'Unknown',
      value: item.accuracyScore || 0,
      color: accuracyColors[index % accuracyColors.length],
    }));

    const accuracyComparisonData = data.accuracyByType.map((item: any, index: number) => ({
      name: item._id || 'Unknown',
      value: item.accuracyScore || 0,
      label: `${(item.accuracyScore || 0).toFixed(1)}%`,
      color: accuracyColors[index % accuracyColors.length],
    }));

    const varianceComparisonData = data.accuracyByType.map((item: any, index: number) => ({
      name: item._id || 'Unknown',
      value: item.avgVariance || 0,
      label: `$${(item.avgVariance || 0).toFixed(2)}`,
      color: varianceColors[index % varianceColors.length],
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Accuracy Score by Quote Type</h4>
            <InteractivePieChart data={pieData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Accuracy Score Comparison</h4>
            <ComparisonChart data={accuracyComparisonData} height={300} />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Average Variance by Quote Type</h4>
          <ComparisonChart data={varianceComparisonData} height={300} />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Accuracy Distribution Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.accuracyByType.map((item: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-lg font-semibold text-gray-800 mb-3">
                  {item._id || 'Unknown'}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Quotes:</span>
                    <span className="font-medium">{item.totalQuotes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Within 5%:</span>
                    <span className="font-medium text-green-700">{item.within5Percent || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Within 10%:</span>
                    <span className="font-medium text-yellow-700">{item.within10Percent || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Over 10%:</span>
                    <span className="font-medium text-red-700">{item.over10Percent || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.accuracyByType) return null;

    const tableData = data.accuracyByType.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalQuotes: item.totalQuotes || 0,
      avgVariance: `$${(item.avgVariance || 0).toFixed(2)}`,
      avgVariancePercentage: `${(item.avgVariancePercentage || 0).toFixed(1)}%`,
      within5Percent: item.within5Percent || 0,
      within10Percent: item.within10Percent || 0,
      over10Percent: item.over10Percent || 0,
      accuracyScore: `${(item.accuracyScore || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'avgVariance', label: 'Avg Variance' },
      { key: 'avgVariancePercentage', label: 'Avg Variance %' },
      { key: 'within5Percent', label: 'Within 5%' },
      { key: 'within10Percent', label: 'Within 10%' },
      { key: 'over10Percent', label: 'Over 10%' },
      { key: 'accuracyScore', label: 'Accuracy Score' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Invoice Accuracy"
      subtitle="Invoice vs quote variance analysis"
      icon={<FileCheck className="h-5 w-5" />}
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

export default QuoteInvoiceAccuracyReport;
