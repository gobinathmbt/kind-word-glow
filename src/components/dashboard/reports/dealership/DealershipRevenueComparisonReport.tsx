import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

interface DealershipRevenueComparisonReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const DealershipRevenueComparisonReport: React.FC<DealershipRevenueComparisonReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipRevenueComparison(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue comparison data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting revenue comparison report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.data || data.data.length === 0) return null;
    
    const totals = data.data.reduce((acc: any, dealership: any) => ({
      totalRevenue: acc.totalRevenue + (dealership.revenue?.totalRevenue || 0),
      totalCost: acc.totalCost + (dealership.revenue?.totalCost || 0),
      totalProfit: acc.totalProfit + (dealership.revenue?.totalProfit || 0),
    }), { totalRevenue: 0, totalCost: 0, totalProfit: 0 });

    const avgProfitMargin = totals.totalRevenue > 0 
      ? ((totals.totalProfit / totals.totalRevenue) * 100).toFixed(1)
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Cost"
          value={`$${totals.totalCost.toLocaleString()}`}
        />
        <MetricCard
          title="Total Profit"
          value={`$${totals.totalProfit.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Profit Margin"
          value={`${avgProfitMargin}%`}
          icon={<PieChartIcon className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.data || data.data.length === 0) return null;

    const revenueDistribution: PieChartData[] = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      value: dealership.revenue?.totalRevenue || 0,
    }));

    const comparisonData = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      revenue: dealership.revenue?.totalRevenue || 0,
      cost: dealership.revenue?.totalCost || 0,
      profit: dealership.revenue?.totalProfit || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue Distribution</h4>
            <InteractivePieChart data={revenueDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue vs Cost vs Profit</h4>
            <StackedBarChart
              data={comparisonData}
              xAxisKey="name"
              series={[
                { dataKey: 'revenue', name: 'Revenue' },
                { dataKey: 'cost', name: 'Cost' },
                { dataKey: 'profit', name: 'Profit' },
              ]}
              height={300}
            />
          </div>
        </div>
        {data.data[0]?.monthlyTrend && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Revenue Trend</h4>
            <LineChart
              data={data.data[0].monthlyTrend}
              xAxisKey="month"
              lines={[
                { dataKey: 'revenue', name: 'Revenue', color: 'hsl(var(--chart-1))' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.data) return null;

    const columns = [
      { key: 'dealershipName', label: 'Dealership' },
      { key: 'totalRevenue', label: 'Revenue' },
      { key: 'totalCost', label: 'Cost' },
      { key: 'totalProfit', label: 'Profit' },
      { key: 'profitMargin', label: 'Margin %' },
      { key: 'avgRevenuePerVehicle', label: 'Avg/Vehicle' },
    ];

    const tableData = data.data.map((dealership: any) => ({
      dealershipName: dealership.dealershipName,
      totalRevenue: `$${(dealership.revenue?.totalRevenue || 0).toLocaleString()}`,
      totalCost: `$${(dealership.revenue?.totalCost || 0).toLocaleString()}`,
      totalProfit: `$${(dealership.revenue?.totalProfit || 0).toLocaleString()}`,
      profitMargin: `${dealership.revenue?.profitMargin || 0}%`,
      avgRevenuePerVehicle: `$${(dealership.revenue?.avgRevenuePerVehicle || 0).toLocaleString()}`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dealership Revenue Comparison"
      subtitle="Revenue comparison across dealerships"
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

export default DealershipRevenueComparisonReport;
