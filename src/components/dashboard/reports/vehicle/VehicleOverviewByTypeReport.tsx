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
  shouldLoad?: boolean;
}

export const VehicleOverviewByTypeReport: React.FC<VehicleOverviewByTypeReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleOverviewByType(params);

      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicle overview data');
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
    console.log(`Exporting vehicle overview report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) {
      return null;
    }

    const inspectionData = data.typeDistribution?.find((t: any) => t._id === 'inspection');
    const tradeinData = data.typeDistribution?.find((t: any) => t._id === 'tradein');
    const masterData = data.typeDistribution?.find((t: any) => t._id === 'master');
    const advertisementData = data.typeDistribution?.find((t: any) => t._id === 'advertisement');


    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <MetricCard
          title="Total Vehicles"
          value={data.summary?.totalVehicles || 0}
          icon={<Car className="h-4 w-4 sm:h-5 sm:w-5" />}
          subtitle={`${data.summary?.uniqueMakesCount || 0} makes, ${data.summary?.uniqueModelsCount || 0} models`}
        />
        <MetricCard
          title="Inspection"
          value={inspectionData?.totalCount || 0}
          subtitle={`Avg: $${Math.round(inspectionData?.avgRetailPrice || 0).toLocaleString()}`}
        />
        <MetricCard
          title="Trade-in"
          value={tradeinData?.totalCount || 0}
          subtitle={`Avg: $${Math.round(tradeinData?.avgRetailPrice || 0).toLocaleString()}`}
        />
        <MetricCard
          title="Master & Ads"
          value={(masterData?.totalCount || 0) + (advertisementData?.totalCount || 0)}
          subtitle={`Master: ${masterData?.totalCount || 0}, Ads: ${advertisementData?.totalCount || 0}`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) {
      console.log('renderCharts: No data available');
      return null;
    }


    // Type Distribution Pie Chart
    const typeColors: Record<string, string> = {
      'Inspection': '#3b82f6',
      'Tradein': '#10b981',
      'Master': '#f59e0b',
      'Advertisement': '#8b5cf6',
    };

    const typeData: PieChartData[] = data.typeDistribution?.map((item: any) => {
      const name = item._id.charAt(0).toUpperCase() + item._id.slice(1);
      return {
        name,
        value: item.totalCount,
        color: typeColors[name] || '#6b7280',
      };
    }) || [];


    // Status by Type Stacked Bar Chart
    const statusByTypeData = data.typeDistribution?.map((item: any) => {
      const statusObj: any = { type: item._id.charAt(0).toUpperCase() + item._id.slice(1) };
      item.statusBreakdown?.forEach((status: any) => {
        statusObj[status.status] = status.count;
      });
      return statusObj;
    }) || [];

    // Monthly Trend Line Chart - Transform data
    const monthlyTrendData: any[] = [];
    const monthMap = new Map<string, any>();

    data.monthlyTrends?.forEach((typeData: any) => {
      typeData.trends?.forEach((trend: any) => {
        const key = `${trend.year}-${String(trend.month).padStart(2, '0')}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, { month: key, year: trend.year, monthNum: trend.month });
        }
        monthMap.get(key)[typeData._id] = trend.count;
      });
    });

    monthlyTrendData.push(...Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    }));

    // Dealership Comparison Stacked Bar Chart
    const dealershipComparisonData = data.dealershipComparison?.map((item: any, index: number) => {
      const dealershipObj: any = {
        dealership: item._id || `Dealership ${index + 1}`,
        total: item.totalVehicles
      };
      item.typeBreakdown?.forEach((type: any) => {
        dealershipObj[type.type] = type.count;
      });
      return dealershipObj;
    }) || [];

    // Heat Map Data - Transform for each type
    const heatMapByType = data.heatMapData?.map((typeData: any) => {
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

      // Create HeatMapCell array
      const cells: any[] = [];

      typeData.heatMap?.forEach((item: any) => {
        if (item.dayOfWeek >= 0 && item.dayOfWeek < 7 && item.hour >= 0 && item.hour < 24) {
          cells.push({
            x: hourLabels[item.hour],
            y: dayLabels[item.dayOfWeek],
            value: item.count,
            label: `${dayLabels[item.dayOfWeek]} ${hourLabels[item.hour]}: ${item.count} vehicles`,
          });
        }
      });

      return {
        type: typeData._id,
        xLabels: hourLabels,
        yLabels: dayLabels,
        cells: cells,
      };
    }) || [];

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">Type Distribution</h4>
            <div className="w-full overflow-x-auto">
              <InteractivePieChart data={typeData} height={300} />
            </div>
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">Status by Type</h4>
            <div className="w-full overflow-x-auto">
              <StackedBarChart
                data={statusByTypeData}
                xAxisKey="type"
                series={[
                  { dataKey: 'completed', name: 'Completed', color: '#10b981' },
                  { dataKey: 'available', name: 'Available', color: '#3b82f6' },
                  { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
                  { dataKey: 'sold', name: 'Sold', color: '#8b5cf6' },
                ]}
                height={300}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">Monthly Trend</h4>
            <div className="w-full overflow-x-auto">
              <LineChart
                data={monthlyTrendData}
                xAxisKey="month"
                lines={[
                  { dataKey: 'inspection', name: 'Inspection', color: '#3b82f6' },
                  { dataKey: 'tradein', name: 'Trade-in', color: '#10b981' },
                  { dataKey: 'master', name: 'Master', color: '#f59e0b' },
                  { dataKey: 'advertisement', name: 'Advertisement', color: '#8b5cf6' },
                ]}
                height={300}
              />
            </div>
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-medium mb-3 sm:mb-4">Dealership Comparison</h4>
            <div className="w-full overflow-x-auto">
              <StackedBarChart
                data={dealershipComparisonData}
                xAxisKey="dealership"
                series={[
                  { dataKey: 'inspection', name: 'Inspection', color: '#3b82f6' },
                  { dataKey: 'tradein', name: 'Trade-in', color: '#10b981' },
                  { dataKey: 'master', name: 'Master', color: '#f59e0b' },
                  { dataKey: 'advertisement', name: 'Advertisement', color: '#8b5cf6' },
                ]}
                height={300}
              />
            </div>
          </div>
        </div>
        {heatMapByType.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-medium">Activity Heat Map by Type</h4>
            {heatMapByType.map((heatMapItem: any) => (
              <div key={heatMapItem.type} className="min-w-0">
                <h5 className="text-xs font-medium mb-2 capitalize">{heatMapItem.type}</h5>
                <div className="w-full overflow-x-auto">
                  <HeatMap
                    data={heatMapItem.cells}
                    xLabels={heatMapItem.xLabels}
                    yLabels={heatMapItem.yLabels}
                    height={200}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.detailedBreakdown) return null;

    const columns = [
      { key: 'type', label: 'Type' },
      { key: 'make', label: 'Make' },
      { key: 'year', label: 'Year' },
      { key: 'count', label: 'Count' },
      { key: 'avgRetailPrice', label: 'Avg Retail' },
      { key: 'minRetailPrice', label: 'Min Retail' },
      { key: 'maxRetailPrice', label: 'Max Retail' },
    ];

    const tableData = data.detailedBreakdown.map((item: any) => ({
      type: item._id.type.charAt(0).toUpperCase() + item._id.type.slice(1),
      make: item._id.make,
      year: item._id.year,
      count: item.count,
      avgRetailPrice: `$${Math.round(item.avgRetailPrice).toLocaleString()}`,
      minRetailPrice: `$${Math.round(item.minRetailPrice).toLocaleString()}`,
      maxRetailPrice: `$${Math.round(item.maxRetailPrice).toLocaleString()}`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Overview by Type"
      subtitle="Type distribution, status, trends, and dealership comparison"
      icon={<Car className="h-4 w-4 sm:h-5 sm:w-5" />}
      loading={loading}
      error={error}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showViewToggle={true}
      actions={
        <div className="flex flex-col xs:flex-row gap-2 w-full xs:w-auto">
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
