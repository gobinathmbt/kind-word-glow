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
}

export const WorkshopCostBreakdownReport: React.FC<WorkshopCostBreakdownReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopCostBreakdown(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop cost breakdown data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

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
          value={`$${(breakdown.avgPartsCost || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Labor Cost"
          value={`$${(breakdown.avgLaborCost || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg GST"
          value={`$${(breakdown.avgGST || 0).toLocaleString()}`}
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

    const costBreakdownData: PieChartData[] = data.overallCostBreakdown ? [
      { name: 'Parts', value: data.overallCostBreakdown.totalPartsCost || 0 },
      { name: 'Labor', value: data.overallCostBreakdown.totalLaborCost || 0 },
      { name: 'GST', value: data.overallCostBreakdown.totalGST || 0 },
    ] : [];

    const costByVehicleTypeData = data.costByVehicleType?.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
      gst: item.totalGST || 0,
    })) || [];

    const monthlyCostTrends = data.monthlyCostTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      parts: item.totalPartsCost || 0,
      labor: item.totalLaborCost || 0,
      gst: item.totalGST || 0,
      total: item.totalCost || 0,
    })) || [];

    const costDistributionData = data.costDistribution?.map((item: any) => ({
      range: typeof item._id === 'string' ? item._id : `$${item._id}+`,
      count: item.count || 0,
      totalCost: item.totalCost || 0,
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
              data={costDistributionData.map(item => ({
                name: item.range,
                value: item.count,
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
            <DataTable
              columns={[
                { key: 'vehicleType', label: 'Vehicle Type' },
                { key: 'reportType', label: 'Report Type' },
                { key: 'avgCostPerWorkEntry', label: 'Avg Cost/Entry' },
                { key: 'avgCostPerField', label: 'Avg Cost/Field' },
                { key: 'reportCount', label: 'Reports' },
              ]}
              data={data.costEfficiencyMetrics.map((item: any) => ({
                vehicleType: item._id?.vehicleType || 'N/A',
                reportType: item._id?.reportType || 'N/A',
                avgCostPerWorkEntry: `$${(item.avgCostPerWorkEntry || 0).toFixed(2)}`,
                avgCostPerField: `$${(item.avgCostPerField || 0).toFixed(2)}`,
                reportCount: item.reportCount || 0,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.costByVehicleType) return null;

    const tableData = data.costByVehicleType.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      totalCost: `$${(item.totalCost || 0).toLocaleString()}`,
      partsCost: `$${(item.totalPartsCost || 0).toLocaleString()}`,
      laborCost: `$${(item.totalLaborCost || 0).toLocaleString()}`,
      gst: `$${(item.totalGST || 0).toLocaleString()}`,
      avgCost: `$${(item.avgCost || 0).toLocaleString()}`,
    }));

    const columns = [
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'reportCount', label: 'Reports' },
      { key: 'totalCost', label: 'Total Cost' },
      { key: 'partsCost', label: 'Parts' },
      { key: 'laborCost', label: 'Labor' },
      { key: 'gst', label: 'GST' },
      { key: 'avgCost', label: 'Avg Cost' },
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
