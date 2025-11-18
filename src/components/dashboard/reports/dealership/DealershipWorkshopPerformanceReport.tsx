import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Wrench, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

interface DealershipWorkshopPerformanceReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const DealershipWorkshopPerformanceReport: React.FC<DealershipWorkshopPerformanceReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipWorkshopPerformance(params);
      // Handle response structure: response.data.data or response.data
      const responseData = response.data?.data || response.data;
      // Ensure we have an array
      setData(Array.isArray(responseData) ? responseData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting workshop performance report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    
    const validDealerships = data.filter((d: any) => d.dealershipId);
    
    const totals = validDealerships.reduce((acc: any, dealership: any) => ({
      totalQuotes: acc.totalQuotes + (dealership.quotes?.total || 0),
      totalRevenue: acc.totalRevenue + (dealership.reports?.totalRevenue || 0),
      avgCompletionRate: acc.avgCompletionRate + (dealership.quotes?.completionRate || 0),
      avgQualityRate: acc.avgQualityRate + (dealership.reports?.qualityPassRate || 0),
      completedJobs: acc.completedJobs + (dealership.efficiency?.completedJobs || 0),
    }), { totalQuotes: 0, totalRevenue: 0, avgCompletionRate: 0, avgQualityRate: 0, completedJobs: 0 });

    const dealershipCount = validDealerships.length || 1;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Quotes"
          value={totals.totalQuotes}
          icon={<Wrench className="h-5 w-5" />}
          subtitle={`${totals.completedJobs} completed jobs`}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`${validDealerships.length} dealership(s)`}
        />
        <MetricCard
          title="Avg Completion Rate"
          value={`${(totals.avgCompletionRate / dealershipCount).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Quality Rate"
          value={`${(totals.avgQualityRate / dealershipCount).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Color palettes for different charts
    const revenueColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const performanceColors = ['#3b82f6', '#60a5fa', '#93c5fd'];

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const revenueData: PieChartData[] = validDealerships.map((dealership: any, index: number) => ({
      name: dealership.dealershipName || 'Unknown',
      value: dealership.reports?.totalRevenue || 0,
      label: `$${(dealership.reports?.totalRevenue || 0).toFixed(2)}`,
      color: revenueColors[index % revenueColors.length],
    }));

    const performanceData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      completionRate: dealership.quotes?.completionRate || 0,
      qualityRate: dealership.reports?.qualityPassRate || 0,
      onBudgetRate: dealership.efficiency?.onBudgetRate || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue Distribution by Dealership</h4>
            <InteractivePieChart data={revenueData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Performance Metrics by Dealership</h4>
            <StackedBarChart
              data={performanceData}
              xAxisKey="name"
              series={[
                { dataKey: 'completionRate', name: 'Completion %', color: performanceColors[0] },
                { dataKey: 'qualityRate', name: 'Quality %', color: performanceColors[1] },
                { dataKey: 'onBudgetRate', name: 'On Budget %', color: performanceColors[2] },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data || !Array.isArray(data)) return null;

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const columns = [
      { key: 'dealershipName', label: 'Dealership Name' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'completedQuotes', label: 'Completed' },
      { key: 'inProgress', label: 'In Progress' },
      { key: 'pending', label: 'Pending' },
      { key: 'completionRate', label: 'Completion %' },
      { key: 'totalRevenue', label: 'Revenue' },
      { key: 'totalCost', label: 'Total Cost' },
      { key: 'profitMargin', label: 'Profit %' },
      { key: 'qualityRate', label: 'Quality %' },
      { key: 'avgQuoteAmount', label: 'Avg Quote' },
      { key: 'avgCompletionTime', label: 'Avg Time (h)' },
      { key: 'quoteAccuracy', label: 'Quote Accuracy %' },
      { key: 'onBudgetRate', label: 'On Budget %' },
    ];

    const tableData = validDealerships.map((dealership: any) => ({
      dealershipName: dealership.dealershipName || 'N/A',
      totalQuotes: dealership.quotes?.total || 0,
      completedQuotes: dealership.quotes?.completed || 0,
      inProgress: dealership.quotes?.inProgress || 0,
      pending: dealership.quotes?.pending || 0,
      completionRate: `${(dealership.quotes?.completionRate || 0).toFixed(1)}%`,
      totalRevenue: `$${(dealership.reports?.totalRevenue || 0).toFixed(2)}`,
      totalCost: `$${(dealership.reports?.totalCost || 0).toFixed(2)}`,
      profitMargin: `${(dealership.reports?.profitMargin || 0).toFixed(1)}%`,
      qualityRate: `${(dealership.reports?.qualityPassRate || 0).toFixed(1)}%`,
      avgQuoteAmount: `$${(dealership.quotes?.avgAmount || 0).toFixed(2)}`,
      avgCompletionTime: (dealership.quotes?.avgCompletionTime || 0).toFixed(1),
      quoteAccuracy: `${(dealership.efficiency?.avgQuoteAccuracy || 0).toFixed(1)}%`,
      onBudgetRate: `${(dealership.efficiency?.onBudgetRate || 0).toFixed(1)}%`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dealership Workshop Performance"
      subtitle="Workshop metrics by dealership"
      icon={<Wrench className="h-5 w-5" />}
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

export default DealershipWorkshopPerformanceReport;
