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

interface WorkshopCostBreakdownReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const WorkshopCostBreakdownReport: React.FC<WorkshopCostBreakdownReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopCostBreakdown(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop cost breakdown data');
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
    console.log(`Exporting workshop cost breakdown as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.overallCostBreakdown) return null;
    const breakdown = data.overallCostBreakdown;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Cost"
          value={`$${(breakdown.totalCost || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Parts Cost"
          value={`$${(breakdown.totalPartsCost || 0).toLocaleString()}`}
          subtitle={`${(breakdown.partsPercentage || 0).toFixed(1)}%`}
          icon={<PieChartIcon className="h-5 w-5" />}
        />
        <MetricCard
          title="Labor Cost"
          value={`$${(breakdown.totalLaborCost || 0).toLocaleString()}`}
          subtitle={`${(breakdown.laborPercentage || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="GST"
          value={`$${(breakdown.totalGST || 0).toLocaleString()}`}
          subtitle={`${(breakdown.gstPercentage || 0).toFixed(1)}%`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Parts Cost"
          value={`$${(breakdown.avgPartsCost || 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Labor Cost"
          value={`$${(breakdown.avgLaborCost || 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg GST"
          value={`$${(breakdown.avgGST || 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Total Cost"
          value={`$${(breakdown.avgTotalCost || 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Reports"
          value={breakdown.totalReports || 0}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const costBreakdownColors = ['#3b82f6', '#10b981', '#f59e0b'];
    const vehicleTypeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const costBreakdownData: PieChartData[] = data.overallCostBreakdown ? [
      { 
        name: 'Parts', 
        value: data.overallCostBreakdown.totalPartsCost || 0,
        color: costBreakdownColors[0]
      },
      { 
        name: 'Labor', 
        value: data.overallCostBreakdown.totalLaborCost || 0,
        color: costBreakdownColors[1]
      },
      { 
        name: 'GST', 
        value: data.overallCostBreakdown.totalGST || 0,
        color: costBreakdownColors[2]
      },
    ] : [];

    const costByVehicleTypeData = data.costByVehicleType?.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
      gst: item.totalGST || 0,
      total: item.totalCost || 0,
    })) || [];

    const costByReportTypeData = data.costByReportType?.map((item: any) => ({
      reportType: item._id || 'Unknown',
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
      gst: item.totalGST || 0,
      total: item.totalCost || 0,
      reportCount: item.reportCount || 0,
      avgCostPerReport: item.avgCostPerReport || 0,
    })) || [];

    const monthlyCostTrends = data.monthlyCostTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
      gst: item.totalGST || 0,
      total: item.totalCost || 0,
    })) || [];

    const costDistributionData = data.costDistribution?.map((item: any) => ({
      range: typeof item._id === 'string' ? item._id : `$${item._id || 0}+`,
      count: item.count || 0,
      totalCost: item.totalCost || 0,
      avgPartsCost: item.avgPartsCost || 0,
      avgLaborCost: item.avgLaborCost || 0,
      avgGST: item.avgGST || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Overall Cost Breakdown</h4>
            <InteractivePieChart data={costBreakdownData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Distribution by Range</h4>
            <InteractivePieChart 
              data={costDistributionData.map((item, index) => ({
                name: item.range,
                value: item.count,
                color: vehicleTypeColors[index % vehicleTypeColors.length],
              }))} 
              height={300} 
            />
          </div>
        </div>

        {costByVehicleTypeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Breakdown by Vehicle Type</h4>
            <StackedBarChart
              data={costByVehicleTypeData}
              xAxisKey="vehicleType"
              series={[
                { dataKey: 'parts', name: 'Parts', color: '#3b82f6' },
                { dataKey: 'labor', name: 'Labor', color: '#10b981' },
                { dataKey: 'gst', name: 'GST', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {costByReportTypeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Breakdown by Report Type</h4>
            <StackedBarChart
              data={costByReportTypeData}
              xAxisKey="reportType"
              series={[
                { dataKey: 'parts', name: 'Parts', color: '#3b82f6' },
                { dataKey: 'labor', name: 'Labor', color: '#10b981' },
                { dataKey: 'gst', name: 'GST', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {monthlyCostTrends.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Cost Trends</h4>
            <LineChart
              data={monthlyCostTrends}
              xAxisKey="month"
              lines={[
                { dataKey: 'parts', name: 'Parts Cost', color: '#3b82f6' },
                { dataKey: 'labor', name: 'Labor Cost', color: '#10b981' },
                { dataKey: 'gst', name: 'GST', color: '#f59e0b' },
                { dataKey: 'total', name: 'Total Cost', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.costEfficiencyMetrics && data.costEfficiencyMetrics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Efficiency Metrics</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Vehicle Type</th>
                    <th className="px-4 py-3 text-left font-medium">Report Type</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Cost/Entry</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Cost/Field</th>
                    <th className="px-4 py-3 text-right font-medium">Min Cost/Entry</th>
                    <th className="px-4 py-3 text-right font-medium">Max Cost/Entry</th>
                    <th className="px-4 py-3 text-right font-medium">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {data.costEfficiencyMetrics.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item._id?.vehicleType || 'N/A'}</td>
                      <td className="px-4 py-3">{item._id?.reportType || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">${(item.avgCostPerWorkEntry || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${(item.avgCostPerField || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${(item.minCostPerWorkEntry || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${(item.maxCostPerWorkEntry || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{item.reportCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.workEntryCostAnalysis && (
          <div>
            <h4 className="text-sm font-medium mb-4">Work Entry Cost Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{data.workEntryCostAnalysis.totalWorkEntries || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Total Work Entries</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">${(data.workEntryCostAnalysis.avgPartsPerEntry || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-600 mt-1">Avg Parts/Entry</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">${(data.workEntryCostAnalysis.avgLaborPerEntry || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-600 mt-1">Avg Labor/Entry</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">${(data.workEntryCostAnalysis.avgGSTPerEntry || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-600 mt-1">Avg GST/Entry</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    // Combine data from multiple sources for comprehensive table view
    const vehicleTypeData = data.costByVehicleType?.map((item: any) => ({
      category: 'Vehicle Type',
      type: item.vehicleType || item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      totalCost: `$${(item.totalCost || 0).toLocaleString()}`,
      partsCost: `$${(item.totalPartsCost || 0).toLocaleString()}`,
      laborCost: `$${(item.totalLaborCost || 0).toLocaleString()}`,
      gst: `$${(item.totalGST || 0).toLocaleString()}`,
      avgPartsCost: `$${(item.avgPartsCost || 0).toFixed(2)}`,
      avgLaborCost: `$${(item.avgLaborCost || 0).toFixed(2)}`,
      avgGST: `$${(item.avgGST || 0).toFixed(2)}`,
      avgTotalCost: `$${((item.totalCost || 0) / (item.reportCount || 1)).toFixed(2)}`,
    })) || [];

    const reportTypeData = data.costByReportType?.map((item: any) => ({
      category: 'Report Type',
      type: item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      totalCost: `$${(item.totalCost || 0).toLocaleString()}`,
      partsCost: `$${(item.totalPartsCost || 0).toLocaleString()}`,
      laborCost: `$${(item.totalLaborCost || 0).toLocaleString()}`,
      gst: `$${(item.totalGST || 0).toLocaleString()}`,
      avgPartsCost: `$${((item.totalPartsCost || 0) / (item.reportCount || 1)).toFixed(2)}`,
      avgLaborCost: `$${((item.totalLaborCost || 0) / (item.reportCount || 1)).toFixed(2)}`,
      avgGST: `$${((item.totalGST || 0) / (item.reportCount || 1)).toFixed(2)}`,
      avgTotalCost: `$${(item.avgCostPerReport || 0).toFixed(2)}`,
    })) || [];

    const tableData = [...vehicleTypeData, ...reportTypeData];

    const columns = [
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'Type' },
      { key: 'reportCount', label: 'Reports' },
      { key: 'totalCost', label: 'Total Cost' },
      { key: 'partsCost', label: 'Parts Cost' },
      { key: 'laborCost', label: 'Labor Cost' },
      { key: 'gst', label: 'GST' },
      { key: 'avgTotalCost', label: 'Avg Total Cost' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Cost Breakdown"
      subtitle="Detailed analysis of parts, labor, and GST costs"
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

export default WorkshopCostBreakdownReport;
