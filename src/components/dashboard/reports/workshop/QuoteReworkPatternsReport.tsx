import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { RefreshCw } from 'lucide-react';

interface QuoteReworkPatternsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteReworkPatternsReport: React.FC<QuoteReworkPatternsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteReworkPatterns(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rework patterns data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting rework patterns report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.reworkRates) return null;

    const totalQuotes = data.reworkRates.reduce((sum: number, item: any) => sum + (item.totalQuotes || 0), 0);
    const totalReworks = data.reworkRates.reduce((sum: number, item: any) => sum + (item.reworkCount || 0), 0);
    const totalCompleted = data.reworkRates.reduce((sum: number, item: any) => sum + (item.completedCount || 0), 0);
    const avgReworkRate = data.reworkRates.length > 0
      ? data.reworkRates.reduce((sum: number, item: any) => sum + (item.reworkRate || 0), 0) / data.reworkRates.length
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Reworks"
          value={totalReworks}
          icon={<RefreshCw className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Rework Rate"
          value={`${avgReworkRate.toFixed(1)}%`}
        />
        <MetricCard
          title="Total Quotes"
          value={totalQuotes}
        />
        <MetricCard
          title="Completed Jobs"
          value={totalCompleted}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.reworkRates) return null;

    const typeColors = ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'];

    const pieData: PieChartData[] = data.reworkRates.map((item: any, index: number) => ({
      name: item._id || 'Unknown',
      value: item.reworkCount || 0,
      color: typeColors[index % typeColors.length],
    }));

    const barData = data.reworkRates.map((item: any) => ({
      type: item._id || 'Unknown',
      reworks: item.reworkCount || 0,
      completed: item.completedCount || 0,
      rate: item.reworkRate || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Rework Count by Quote Type</h4>
            <InteractivePieChart data={pieData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Rework Rate by Quote Type</h4>
            <StackedBarChart
              data={barData}
              xAxisKey="type"
              series={[{ dataKey: 'rate', name: 'Rework Rate %', color: '#ef4444' }]}
              height={300}
            />
          </div>
        </div>
        {data.reworkBySupplier && data.reworkBySupplier.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Rework Performance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.reworkBySupplier.map((supplier: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="text-lg font-semibold text-gray-800 mb-3">
                    {supplier.supplierName || 'Unknown'}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Jobs:</span>
                      <span className="font-medium">{supplier.totalJobs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rework Count:</span>
                      <span className="font-medium">{supplier.reworkCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Rework Rate:</span>
                      <span className="font-medium text-blue-700">{(supplier.reworkRate || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.reworkRates) return null;

    const tableData = data.reworkRates.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalQuotes: item.totalQuotes || 0,
      reworkCount: item.reworkCount || 0,
      completedCount: item.completedCount || 0,
      reworkRate: `${(item.reworkRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'reworkCount', label: 'Rework Count' },
      { key: 'completedCount', label: 'Completed Count' },
      { key: 'reworkRate', label: 'Rework Rate' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Rework Patterns"
      subtitle="Rework frequency and causes analysis"
      icon={<RefreshCw className="h-5 w-5" />}
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

export default QuoteReworkPatternsReport;
