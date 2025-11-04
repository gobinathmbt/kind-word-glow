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
import { DollarSign, TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

interface WorkshopRevenueAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const WorkshopRevenueAnalysisReport: React.FC<WorkshopRevenueAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopRevenueAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop revenue analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting workshop revenue analysis as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.overallRevenue || data.overallRevenue.length === 0) return null;
     const revenue = Array.isArray(data.overallRevenue) && data.overallRevenue.length > 0 
      ? data.overallRevenue[0] 
      : data;
      return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`$${(revenue.totalRevenue || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Parts Revenue"
          value={`$${(revenue.totalPartsCost || 0).toLocaleString()}`}
          subtitle={`${(revenue.partsRevenuePercentage || 0).toFixed(1)}%`}
          icon={<PieChartIcon className="h-5 w-5" />}
        />
        <MetricCard
          title="Labor Revenue"
          value={`$${(revenue.totalLaborCost || 0).toLocaleString()}`}
          subtitle={`${(revenue.laborRevenuePercentage || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Revenue/Report"
          value={`$${(revenue.avgRevenuePerReport || 0).toLocaleString()}`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const revenueBreakdownData: PieChartData[] = data.overallRevenue && data.overallRevenue[0] ? [
      { name: 'Parts', value: data.overallRevenue[0].totalPartsCost || 0 },
      { name: 'Labor', value: data.overallRevenue[0].totalLaborCost || 0 },
      { name: 'GST', value: data.overallRevenue[0].totalGST || 0 },
    ] : [];

    const revenueByVehicleTypeData = data.revenueByVehicleType?.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
    })) || [];

    const monthlyRevenueTrendsData = data.monthlyRevenueTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      totalRevenue: item.totalRevenue || 0,
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
    })) || [];

    const revenueDistributionData: PieChartData[] = data.revenueDistribution?.map((item: any) => ({
      name: typeof item._id === 'string' ? item._id : `$${item._id}+`,
      value: item.count || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue Breakdown</h4>
            <InteractivePieChart data={revenueBreakdownData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue Distribution by Range</h4>
            <InteractivePieChart data={revenueDistributionData} height={300} />
          </div>
        </div>

        {revenueByVehicleTypeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue by Vehicle Type</h4>
            <StackedBarChart
              data={revenueByVehicleTypeData}
              xAxisKey="vehicleType"
              series={[
                { dataKey: 'parts', name: 'Parts Revenue', color: '#3b82f6' },
                { dataKey: 'labor', name: 'Labor Revenue', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {monthlyRevenueTrendsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Revenue Trends</h4>
            <LineChart
              data={monthlyRevenueTrendsData}
              xAxisKey="month"
              lines={[
                { dataKey: 'totalRevenue', name: 'Total Revenue', color: '#8b5cf6' },
                { dataKey: 'parts', name: 'Parts Revenue', color: '#3b82f6' },
                { dataKey: 'labor', name: 'Labor Revenue', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.topRevenueReports && data.topRevenueReports.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Revenue Generating Reports</h4>
            <DataTable
              columns={[
                { key: 'vehicle_stock_id', label: 'Stock ID' },
                { key: 'vehicle_type', label: 'Type' },
                { key: 'total_revenue', label: 'Revenue' },
                { key: 'parts_cost', label: 'Parts' },
                { key: 'labor_cost', label: 'Labor' },
                { key: 'work_entries', label: 'Entries' },
              ]}
              data={data.topRevenueReports.map((item: any) => ({
                vehicle_stock_id: item.vehicle_stock_id || 'N/A',
                vehicle_type: item.vehicle_type || 'N/A',
                total_revenue: `$${(item.total_revenue || 0).toLocaleString()}`,
                parts_cost: `$${(item.parts_cost || 0).toLocaleString()}`,
                labor_cost: `$${(item.labor_cost || 0).toLocaleString()}`,
                work_entries: item.work_entries || 0,
              }))}
            />
          </div>
        )}

        {data.profitabilityMetrics && data.profitabilityMetrics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Profitability Metrics</h4>
            <DataTable
              columns={[
                { key: 'vehicleType', label: 'Vehicle Type' },
                { key: 'reportType', label: 'Report Type' },
                { key: 'avgRevenuePerDay', label: 'Revenue/Day' },
                { key: 'avgRevenuePerWorkEntry', label: 'Revenue/Entry' },
                { key: 'reportCount', label: 'Reports' },
              ]}
              data={data.profitabilityMetrics.map((item: any) => ({
                vehicleType: item._id?.vehicleType || 'N/A',
                reportType: item._id?.reportType || 'N/A',
                avgRevenuePerDay: `$${(item.avgRevenuePerDay || 0).toFixed(2)}`,
                avgRevenuePerWorkEntry: `$${(item.avgRevenuePerWorkEntry || 0).toFixed(2)}`,
                reportCount: item.reportCount || 0,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.revenueByVehicleType) return null;

    const tableData = data.revenueByVehicleType.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      totalRevenue: `$${(item.totalRevenue || 0).toLocaleString()}`,
      avgRevenue: `$${(item.avgRevenue || 0).toLocaleString()}`,
      partsCost: `$${(item.totalPartsCost || 0).toLocaleString()}`,
      laborCost: `$${(item.totalLaborCost || 0).toLocaleString()}`,
      partsToLaborRatio: (item.partsToLaborRatio || 0).toFixed(2),
    }));

    const columns = [
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'reportCount', label: 'Reports' },
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'avgRevenue', label: 'Avg Revenue' },
      { key: 'partsCost', label: 'Parts' },
      { key: 'laborCost', label: 'Labor' },
      { key: 'partsToLaborRatio', label: 'Parts/Labor Ratio' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Revenue Analysis"
      subtitle="Revenue and profitability metrics for workshop operations"
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

export default WorkshopRevenueAnalysisReport;
