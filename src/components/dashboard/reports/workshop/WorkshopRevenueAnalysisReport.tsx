import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign, TrendingUp, PieChart as PieChartIcon, BarChart3, Award } from 'lucide-react';

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
    if (!data?.overallRevenue) return null;
    
    const revenue = data.overallRevenue;
    const topReport = data.topRevenueReports?.[0];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`$${(revenue.totalRevenue || 0).toLocaleString()}`}
          subtitle={`${revenue.totalReports || 0} reports`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Parts Revenue"
          value={`$${(revenue.totalPartsCost || 0).toLocaleString()}`}
          subtitle={`${(revenue.partsRevenuePercentage || 0).toFixed(1)}% of total`}
          icon={<PieChartIcon className="h-5 w-5" />}
        />
        <MetricCard
          title="Labor Revenue"
          value={`$${(revenue.totalLaborCost || 0).toLocaleString()}`}
          subtitle={`${(revenue.laborRevenuePercentage || 0).toFixed(1)}% of total`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Top Revenue Report"
          value={topReport?.vehicle_details?.name ? `${topReport.vehicle_details.name.split(' ').slice(0, 3).join(' ')}...` : 'N/A'}
          subtitle={topReport ? `$${(topReport.total_revenue || 0).toLocaleString()}` : ''}
          icon={<Award className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const revenueBreakdownColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const vehicleTypeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const reportTypeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    const revenueBreakdownData: PieChartData[] = data.overallRevenue ? [
      { name: 'Parts', value: data.overallRevenue.totalPartsCost || 0, color: revenueBreakdownColors[0] },
      { name: 'Labor', value: data.overallRevenue.totalLaborCost || 0, color: revenueBreakdownColors[1] },
      { name: 'GST', value: data.overallRevenue.totalGST || 0, color: revenueBreakdownColors[2] },
    ] : [];

    const revenueByVehicleTypeData = data.revenueByVehicleType?.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
    })) || [];

    const revenueByReportTypeData = data.revenueByReportType?.map((item: any) => ({
      reportType: item._id || 'Unknown',
      totalRevenue: item.totalRevenue || 0,
      avgRevenue: item.avgRevenue || 0,
      reportCount: item.reportCount || 0,
    })) || [];

    const monthlyRevenueTrendsData = data.monthlyRevenueTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      totalRevenue: item.totalRevenue || 0,
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
      avgRevenuePerReport: item.avgRevenuePerReport || 0,
    })) || [];

    const revenueDistributionData: PieChartData[] = data.revenueDistribution?.map((item: any, index: number) => ({
      name: typeof item._id === 'string' ? item._id : `$${item._id}+`,
      value: item.count || 0,
      color: revenueBreakdownColors[index % revenueBreakdownColors.length],
    })) || [];

    const revenueByReportTypeChartData = revenueByReportTypeData
      .sort((a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.reportType || 'Unknown',
        value: item.totalRevenue || 0,
        label: `$${(item.totalRevenue || 0).toLocaleString()}`,
        color: reportTypeColors[index % reportTypeColors.length],
      }));

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
                { dataKey: 'parts', name: 'Parts Revenue', color: vehicleTypeColors[0] },
                { dataKey: 'labor', name: 'Labor Revenue', color: vehicleTypeColors[1] },
              ]}
              height={300}
            />
          </div>
        )}

        {revenueByReportTypeChartData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue by Report Type</h4>
            <ComparisonChart data={revenueByReportTypeChartData} height={300} />
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
                { dataKey: 'avgRevenuePerReport', name: 'Avg Revenue/Report', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.topRevenueReports && data.topRevenueReports.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Revenue Generating Reports</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                    <th className="px-4 py-3 text-left font-medium">Report Type</th>
                    <th className="px-4 py-3 text-right font-medium">Total Revenue</th>
                    <th className="px-4 py-3 text-right font-medium">Parts Cost</th>
                    <th className="px-4 py-3 text-right font-medium">Labor Cost</th>
                    <th className="px-4 py-3 text-right font-medium">Work Entries</th>
                    <th className="px-4 py-3 text-right font-medium">Stock ID</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topRevenueReports.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.vehicle_details?.name || 'N/A'}</td>
                      <td className="px-4 py-3">{item.report_type || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">${(item.total_revenue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${(item.parts_cost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${(item.labor_cost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{item.work_entries || 0}</td>
                      <td className="px-4 py-3 text-right">{item.vehicle_stock_id || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.profitabilityMetrics && data.profitabilityMetrics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Profitability Metrics</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Vehicle Type</th>
                    <th className="px-4 py-3 text-left font-medium">Report Type</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue/Day</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue/Entry</th>
                    <th className="px-4 py-3 text-right font-medium">Report Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.profitabilityMetrics.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item._id?.vehicleType || 'N/A'}</td>
                      <td className="px-4 py-3">{item._id?.reportType || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">${(item.avgRevenuePerDay || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${(item.avgRevenuePerWorkEntry || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{item.reportCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    const vehicleTypeData = (data.revenueByVehicleType || []).map((item: any) => ({
      category: 'Vehicle Type',
      name: item.vehicleType || item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      totalRevenue: `$${(item.totalRevenue || 0).toLocaleString()}`,
      avgRevenue: `$${(item.avgRevenue || 0).toLocaleString()}`,
      partsCost: `$${(item.totalPartsCost || 0).toLocaleString()}`,
      laborCost: `$${(item.totalLaborCost || 0).toLocaleString()}`,
      partsToLaborRatio: (item.partsToLaborRatio || 0).toFixed(2),
      avgWorkEntries: '-',
    }));

    const reportTypeData = (data.revenueByReportType || []).map((item: any) => ({
      category: 'Report Type',
      name: item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      totalRevenue: `$${(item.totalRevenue || 0).toLocaleString()}`,
      avgRevenue: `$${(item.avgRevenue || 0).toLocaleString()}`,
      partsCost: '-',
      laborCost: '-',
      partsToLaborRatio: '-',
      avgWorkEntries: (item.avgWorkEntries || 0).toFixed(1),
    }));

    const tableData = [...vehicleTypeData, ...reportTypeData];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-right font-medium">Reports</th>
              <th className="px-4 py-3 text-right font-medium">Total Revenue</th>
              <th className="px-4 py-3 text-right font-medium">Avg Revenue</th>
              <th className="px-4 py-3 text-right font-medium">Parts Cost</th>
              <th className="px-4 py-3 text-right font-medium">Labor Cost</th>
              <th className="px-4 py-3 text-right font-medium">Parts/Labor Ratio</th>
              <th className="px-4 py-3 text-right font-medium">Avg Work Entries</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((item: any, index: number) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3 text-right">{item.reportCount}</td>
                <td className="px-4 py-3 text-right">{item.totalRevenue}</td>
                <td className="px-4 py-3 text-right">{item.avgRevenue}</td>
                <td className="px-4 py-3 text-right">{item.partsCost}</td>
                <td className="px-4 py-3 text-right">{item.laborCost}</td>
                <td className="px-4 py-3 text-right">{item.partsToLaborRatio}</td>
                <td className="px-4 py-3 text-right">{item.avgWorkEntries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
