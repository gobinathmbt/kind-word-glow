import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { HeatMap } from '@/components/dashboard/charts/HeatMap';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Car } from 'lucide-react';

interface VehicleOverviewByTypeReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleOverviewByTypeReport: React.FC<VehicleOverviewByTypeReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleOverviewByType(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicle overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting vehicle overview report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={data.metrics.totalVehicles || 0}
          icon={<Car className="h-5 w-5" />}
          trend={data.metrics.vehicleGrowth}
        />
        <MetricCard
          title="Inspection"
          value={data.metrics.inspectionCount || 0}
        />
        <MetricCard
          title="Trade-in"
          value={data.metrics.tradeinCount || 0}
        />
        <MetricCard
          title="Master"
          value={data.metrics.masterCount || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const typeData: PieChartData[] = data.typeDistribution?.map((item: any) => ({
      name: item.type,
      value: item.count,
    })) || [];

    const statusByTypeData = data.statusByType || [];
    const monthlyTrendData = data.monthlyTrend || [];
    const dealershipComparisonData = data.dealershipComparison || [];
    const heatMapData = data.heatMapData || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Type Distribution</h4>
            <InteractivePieChart data={typeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Status by Type</h4>
            <StackedBarChart
              data={statusByTypeData}
              xAxisKey="type"
              series={[
                { dataKey: 'active', name: 'Active' },
                { dataKey: 'pending', name: 'Pending' },
                { dataKey: 'completed', name: 'Completed' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Trend</h4>
            <LineChart
              data={monthlyTrendData}
              xAxisKey="month"
              lines={[
                { dataKey: 'inspection', name: 'Inspection' },
                { dataKey: 'tradein', name: 'Trade-in' },
                { dataKey: 'master', name: 'Master' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Dealership Comparison</h4>
            <StackedBarChart
              data={dealershipComparisonData}
              xAxisKey="dealership"
              series={[
                { dataKey: 'inspection', name: 'Inspection' },
                { dataKey: 'tradein', name: 'Trade-in' },
                { dataKey: 'master', name: 'Master' },
              ]}
              height={300}
            />
          </div>
        </div>
        {heatMapData.length > 0 && heatMapData[0]?.xLabels && heatMapData[0]?.yLabels && (
          <div>
            <h4 className="text-sm font-medium mb-4">Time-based Analysis</h4>
            <HeatMap 
              data={heatMapData[0].cells || []} 
              xLabels={heatMapData[0].xLabels || []} 
              yLabels={heatMapData[0].yLabels || []} 
              height={200} 
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'type', label: 'Vehicle Type' },
      { key: 'count', label: 'Count' },
      { key: 'percentage', label: 'Percentage' },
      { key: 'avgRetailPrice', label: 'Avg Retail Price' },
      { key: 'activeStatus', label: 'Active' },
      { key: 'pendingStatus', label: 'Pending' },
      { key: 'completedStatus', label: 'Completed' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Overview by Type"
      subtitle="Type distribution, status, trends, and dealership comparison"
      icon={<Car className="h-5 w-5" />}
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

export default VehicleOverviewByTypeReport;
