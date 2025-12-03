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
import { Activity } from 'lucide-react';

interface VehicleStatusDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const VehicleStatusDistributionReport: React.FC<VehicleStatusDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleStatusDistribution(params);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load status distribution data');
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
    console.log(`Exporting status distribution report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    
    const completedCount = data.statusByType?.find((s: any) => s._id === 'completed')?.totalCount || 0;
    const pendingCount = data.statusByType?.filter((s: any) => s._id === 'pending')
      .reduce((sum: number, item: any) => sum + item.totalCount, 0) || 0;
    const soldCount = data.statusByType?.find((s: any) => s._id === 'sold')?.totalCount || 0;
    const availableCount = data.statusByType?.find((s: any) => s._id === 'available')?.totalCount || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={data.summary.totalVehicles || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${data.summary.uniqueStatusCount} unique statuses`}
        />
        <MetricCard
          title="Completed"
          value={completedCount}
          subtitle={`${((completedCount / data.summary.totalVehicles) * 100).toFixed(1)}%`}
        />
        <MetricCard
          title="Pending"
          value={pendingCount}
          subtitle={`${((pendingCount / data.summary.totalVehicles) * 100).toFixed(1)}%`}
        />
        <MetricCard
          title="Sold & Available"
          value={soldCount + availableCount}
          subtitle={`Sold: ${soldCount}, Available: ${availableCount}`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Status Distribution Pie Chart
    const statusColors: Record<string, string> = {
      'Completed': '#10b981',
      'Pending': '#f59e0b',
      'Sold': '#8b5cf6',
      'Available': '#3b82f6',
    };

    const statusData: PieChartData[] = data.statusByType?.map((item: any) => {
      const name = item._id.charAt(0).toUpperCase() + item._id.slice(1);
      return {
        name,
        value: item.totalCount,
        color: statusColors[name] || '#6b7280',
      };
    }) || [];

    // Status Timeline - Transform data
    const timelineData: any[] = [];
    const monthMap = new Map<string, any>();
    
    data.statusTimeline?.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { 
          month: key, 
          year: item._id.year, 
          monthNum: item._id.month 
        });
      }
      const monthData = monthMap.get(key);
      monthData[item._id.status] = item.count;
      monthData[`${item._id.status}_avgDays`] = item.avgDaysSinceCreation;
    });
    
    timelineData.push(...Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    }));

    // Dealership Status Breakdown
    const dealershipStatusData = data.dealershipStatusBreakdown?.map((item: any) => {
      const dealershipObj: any = { 
        dealership: item._id || 'No Dealership',
        total: item.totalVehicles 
      };
      item.statusBreakdown?.forEach((status: any) => {
        dealershipObj[status.status] = status.count;
      });
      return dealershipObj;
    }) || [];

    // Status by Type Breakdown
    const statusByTypeData = data.statusByType?.map((item: any) => {
      const statusObj: any = { 
        status: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        total: item.totalCount
      };
      item.typeBreakdown?.forEach((type: any) => {
        statusObj[type.type] = type.count;
      });
      return statusObj;
    }) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Status by Vehicle Type</h4>
            <StackedBarChart
              data={statusByTypeData}
              xAxisKey="status"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Status Timeline</h4>
            <LineChart
              data={timelineData}
              xAxisKey="month"
              lines={[
                { dataKey: 'completed', name: 'Completed', color: '#10b981' },
                { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
                { dataKey: 'sold', name: 'Sold', color: '#8b5cf6' },
                { dataKey: 'available', name: 'Available', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Dealership Status Breakdown</h4>
            <StackedBarChart
              data={dealershipStatusData}
              xAxisKey="dealership"
              series={[
                { dataKey: 'completed', name: 'Completed', color: '#10b981' },
                { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
                { dataKey: 'sold', name: 'Sold', color: '#8b5cf6' },
                { dataKey: 'available', name: 'Available', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.statusMetrics) return null;

    const columns = [
      { key: 'status', label: 'Status', sortable: true },
      { key: 'count', label: 'Count', sortable: true },
      { key: 'avgRetailPrice', label: 'Avg Retail Price', sortable: true },
      { key: 'avgPurchasePrice', label: 'Avg Purchase Price', sortable: true },
      { key: 'avgDaysSinceCreation', label: 'Avg Days', sortable: true },
      { key: 'workshopPercentage', label: 'Workshop %', sortable: true },
      { key: 'attachmentPercentage', label: 'Attachment %', sortable: true },
    ];

    const tableData = data.statusMetrics.map((item: any) => ({
      status: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      count: item.count,
      avgRetailPrice: `$${Math.round(item.avgRetailPrice).toLocaleString()}`,
      avgPurchasePrice: `$${Math.round(item.avgPurchasePrice).toLocaleString()}`,
      avgDaysSinceCreation: Math.round(item.avgDaysSinceCreation),
      workshopPercentage: `${item.workshopPercentage.toFixed(1)}%`,
      attachmentPercentage: `${item.attachmentPercentage.toFixed(1)}%`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Status Distribution"
      subtitle="Status distribution, transitions, and dealership breakdown"
      icon={<Activity className="h-5 w-5" />}
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

export default VehicleStatusDistributionReport;
