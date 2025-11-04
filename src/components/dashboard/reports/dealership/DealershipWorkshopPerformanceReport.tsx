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
      setData(response.data);
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
    if (!data?.data || data.data.length === 0) return null;
    
    const totals = data.data.reduce((acc: any, dealership: any) => ({
      totalQuotes: acc.totalQuotes + (dealership.quotes?.total || 0),
      totalRevenue: acc.totalRevenue + (dealership.reports?.totalRevenue || 0),
      avgCompletionRate: acc.avgCompletionRate + (dealership.quotes?.completionRate || 0),
      avgQualityRate: acc.avgQualityRate + (dealership.reports?.qualityPassRate || 0),
    }), { totalQuotes: 0, totalRevenue: 0, avgCompletionRate: 0, avgQualityRate: 0 });

    const dealershipCount = data.data.length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Quotes"
          value={totals.totalQuotes}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
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
    if (!data?.data || data.data.length === 0) return null;

    const revenueData: PieChartData[] = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      value: dealership.reports?.totalRevenue || 0,
    }));

    const performanceData = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
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
                { dataKey: 'completionRate', name: 'Completion %' },
                { dataKey: 'qualityRate', name: 'Quality %' },
                { dataKey: 'onBudgetRate', name: 'On Budget %' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.data) return null;

    const columns = [
      { key: 'dealershipName', label: 'Dealership' },
      { key: 'totalQuotes', label: 'Quotes' },
      { key: 'completedQuotes', label: 'Completed' },
      { key: 'completionRate', label: 'Completion %' },
      { key: 'totalRevenue', label: 'Revenue' },
      { key: 'profitMargin', label: 'Profit %' },
      { key: 'qualityRate', label: 'Quality %' },
    ];

    const tableData = data.data.map((dealership: any) => ({
      dealershipName: dealership.dealershipName,
      totalQuotes: dealership.quotes?.total || 0,
      completedQuotes: dealership.quotes?.completed || 0,
      completionRate: `${dealership.quotes?.completionRate || 0}%`,
      totalRevenue: `$${(dealership.reports?.totalRevenue || 0).toLocaleString()}`,
      profitMargin: `${dealership.reports?.profitMargin || 0}%`,
      qualityRate: `${dealership.reports?.qualityPassRate || 0}%`,
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
