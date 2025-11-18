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
  shouldLoad?: boolean;
}

export const DealershipRevenueComparisonReport: React.FC<DealershipRevenueComparisonReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipRevenueComparison(params);
      // Handle response structure: response.data.data or response.data
      const responseData = response.data?.data || response.data;
      // Ensure we have an array
      setData(Array.isArray(responseData) ? responseData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue comparison data');
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
    console.log(`Exporting revenue comparison report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const totals = validDealerships.reduce((acc: any, dealership: any) => ({
      totalRevenue: acc.totalRevenue + (dealership.combinedMetrics?.totalRevenue || 0),
      totalCost: acc.totalCost + (dealership.combinedMetrics?.totalCost || 0),
      totalProfit: acc.totalProfit + (dealership.combinedMetrics?.totalProfit || 0),
      vehicleRevenue: acc.vehicleRevenue + (dealership.vehicleRevenue?.totalRevenue || 0),
      workshopRevenue: acc.workshopRevenue + (dealership.workshopRevenue?.totalRevenue || 0),
    }), { totalRevenue: 0, totalCost: 0, totalProfit: 0, vehicleRevenue: 0, workshopRevenue: 0 });

    const avgProfitMargin = totals.totalRevenue > 0
      ? ((totals.totalProfit / totals.totalRevenue) * 100).toFixed(1)
      : '0.0';

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`${validDealerships.length} dealership(s)`}
        />
        <MetricCard
          title="Total Cost"
          value={`$${totals.totalCost.toFixed(2)}`}
        />
        <MetricCard
          title="Total Profit"
          value={`$${totals.totalProfit.toFixed(2)}`}
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
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Color palettes for different charts
    const revenueColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const comparisonColors = ['#3b82f6', '#ef4444', '#10b981'];

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const revenueDistribution: PieChartData[] = validDealerships.map((dealership: any, index: number) => ({
      name: dealership.dealershipName || 'Unknown',
      value: dealership.combinedMetrics?.totalRevenue || 0,
      label: `$${(dealership.combinedMetrics?.totalRevenue || 0).toFixed(2)}`,
      color: revenueColors[index % revenueColors.length],
    }));

    const comparisonData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      revenue: dealership.combinedMetrics?.totalRevenue || 0,
      cost: dealership.combinedMetrics?.totalCost || 0,
      profit: dealership.combinedMetrics?.totalProfit || 0,
    }));

    const revenueByTypeData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      vehicleRevenue: dealership.vehicleRevenue?.totalRevenue || 0,
      workshopRevenue: dealership.workshopRevenue?.totalRevenue || 0,
    }));

    // Collect all monthly trends from all dealerships
    const allMonthlyTrends = validDealerships.reduce((acc: any[], dealership: any) => {
      if (dealership.monthlyTrends && Array.isArray(dealership.monthlyTrends)) {
        return [...acc, ...dealership.monthlyTrends];
      }
      return acc;
    }, []);

    // Group by month and aggregate revenue
    const monthlyTrendMap = new Map();
    allMonthlyTrends.forEach((trend: any) => {
      const month = trend._id || trend.month;
      if (month) {
        const existing = monthlyTrendMap.get(month) || { month, revenue: 0, cost: 0, profit: 0 };
        existing.revenue += trend.totalRevenue || 0;
        existing.cost += trend.totalCost || 0;
        existing.profit += trend.totalProfit || 0;
        monthlyTrendMap.set(month, existing);
      }
    });

    const monthlyTrendData = Array.from(monthlyTrendMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue Distribution by Dealership</h4>
            <InteractivePieChart data={revenueDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue vs Cost vs Profit</h4>
            <StackedBarChart
              data={comparisonData}
              xAxisKey="name"
              series={[
                { dataKey: 'revenue', name: 'Revenue', color: comparisonColors[0] },
                { dataKey: 'cost', name: 'Cost', color: comparisonColors[1] },
                { dataKey: 'profit', name: 'Profit', color: comparisonColors[2] },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Revenue by Type</h4>
          <StackedBarChart
            data={revenueByTypeData}
            xAxisKey="name"
            series={[
              { dataKey: 'vehicleRevenue', name: 'Vehicle Revenue', color: '#8b5cf6' },
              { dataKey: 'workshopRevenue', name: 'Workshop Revenue', color: '#ec4899' },
            ]}
            height={300}
          />
        </div>
        {monthlyTrendData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Revenue Trend</h4>
            <LineChart
              data={monthlyTrendData}
              xAxisKey="month"
              lines={[
                { dataKey: 'revenue', name: 'Revenue', color: '#10b981' },
                { dataKey: 'cost', name: 'Cost', color: '#ef4444' },
                { dataKey: 'profit', name: 'Profit', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data || !Array.isArray(data)) return null;

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const columns = [
      { key: 'dealershipName', label: 'Dealership Name' },
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'totalCost', label: 'Total Cost' },
      { key: 'totalProfit', label: 'Total Profit' },
      { key: 'profitMargin', label: 'Profit Margin %' },
      { key: 'vehicleRevenue', label: 'Vehicle Revenue' },
      { key: 'vehicleProfit', label: 'Vehicle Profit' },
      { key: 'vehicleMargin', label: 'Vehicle Margin %' },
      { key: 'workshopRevenue', label: 'Workshop Revenue' },
      { key: 'workshopProfit', label: 'Workshop Profit' },
      { key: 'workshopMargin', label: 'Workshop Margin %' },
      { key: 'totalVehicles', label: 'Total Vehicles' },
      { key: 'soldVehicles', label: 'Sold Vehicles' },
      { key: 'sellThroughRate', label: 'Sell-Through %' },
    ];

    const tableData = validDealerships.map((dealership: any) => ({
      dealershipName: dealership.dealershipName || 'N/A',
      totalRevenue: `$${(dealership.combinedMetrics?.totalRevenue || 0).toFixed(2)}`,
      totalCost: `$${(dealership.combinedMetrics?.totalCost || 0).toFixed(2)}`,
      totalProfit: `$${(dealership.combinedMetrics?.totalProfit || 0).toFixed(2)}`,
      profitMargin: `${(dealership.combinedMetrics?.overallProfitMargin || 0).toFixed(1)}%`,
      vehicleRevenue: `$${(dealership.vehicleRevenue?.totalRevenue || 0).toFixed(2)}`,
      vehicleProfit: `$${(dealership.vehicleRevenue?.grossProfit || 0).toFixed(2)}`,
      vehicleMargin: `${(dealership.vehicleRevenue?.profitMargin || 0).toFixed(1)}%`,
      workshopRevenue: `$${(dealership.workshopRevenue?.totalRevenue || 0).toFixed(2)}`,
      workshopProfit: `$${(dealership.workshopRevenue?.grossProfit || 0).toFixed(2)}`,
      workshopMargin: `${(dealership.workshopRevenue?.profitMargin || 0).toFixed(1)}%`,
      totalVehicles: dealership.vehicleRevenue?.totalVehicles || 0,
      soldVehicles: dealership.vehicleRevenue?.soldVehicles || 0,
      sellThroughRate: `${(dealership.vehicleRevenue?.sellThroughRate || 0).toFixed(1)}%`,
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
