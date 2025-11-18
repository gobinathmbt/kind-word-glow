import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { ListChecks } from 'lucide-react';

interface VehicleQueueProcessingReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const VehicleQueueProcessingReport: React.FC<VehicleQueueProcessingReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleQueueProcessing(params);
      console.log('Queue Processing API Response:', response);
      console.log('Queue Processing Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load queue processing data');
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
    console.log(`Exporting queue processing report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.queueStatusOverview) return null;
    
    const totalVehicles = data.queueStatusOverview.reduce((sum: number, item: any) => sum + item.totalCount, 0);
    const processedCount = data.queueStatusOverview.filter((item: any) => item._id === 'processed')
      .reduce((sum: number, item: any) => sum + item.totalCount, 0);
    const pendingCount = data.queueStatusOverview.filter((item: any) => item._id === 'pending')
      .reduce((sum: number, item: any) => sum + item.totalCount, 0);
    const avgProcessingAttempts = data.queueStatusOverview.reduce((sum: number, item: any) => sum + item.avgProcessingAttempts, 0) / 
      (data.queueStatusOverview.length || 1);
    
    const failedCount = data.failedProcessingAnalysis?.length || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={<ListChecks className="h-5 w-5" />}
          subtitle={`${avgProcessingAttempts.toFixed(1)} avg attempts`}
        />
        <MetricCard
          title="Processed"
          value={processedCount}
          subtitle={`${((processedCount / totalVehicles) * 100).toFixed(1)}% success`}
        />
        <MetricCard
          title="Pending"
          value={pendingCount}
          subtitle={`${((pendingCount / totalVehicles) * 100).toFixed(1)}% in queue`}
        />
        <MetricCard
          title="Failed"
          value={failedCount}
          subtitle={failedCount > 0 ? 'Needs attention' : 'All clear'}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Queue Status Distribution Pie Chart
    const statusColors: Record<string, string> = {
      'Processed': '#10b981',
      'Pending': '#f59e0b',
      'Processing': '#3b82f6',
      'Failed': '#ef4444',
    };

    const statusData: PieChartData[] = data.queueStatusOverview?.map((item: any) => {
      const name = item._id.charAt(0).toUpperCase() + item._id.slice(1);
      return {
        name,
        value: item.totalCount,
        color: statusColors[name] || '#6b7280',
      };
    }) || [];

    // Queue Status by Vehicle Type
    const statusByTypeData = data.queueStatusOverview?.map((item: any) => {
      const statusObj: any = { 
        status: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        total: item.totalCount,
        avgAttempts: item.avgProcessingAttempts,
      };
      item.vehicleTypeBreakdown?.forEach((vType: any) => {
        statusObj[vType.type] = vType.count;
      });
      return statusObj;
    }) || [];

    // Processing Attempts Distribution
    const attemptsData = data.processingAttemptsDistribution
      ?.filter((item: any) => item.count > 0)
      .map((item: any) => ({
        attempts: `${item._id} Attempt${item._id !== 1 ? 's' : ''}`,
        count: item.count,
      })) || [];

    // Processing Timeline
    const timelineData: any[] = [];
    const monthMap = new Map<string, any>();
    
    data.processingTimeline?.forEach((item: any) => {
      if (!item._id.year || !item._id.month) return;
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { 
          month: key, 
          year: item._id.year, 
          monthNum: item._id.month 
        });
      }
      const monthData = monthMap.get(key);
      monthData[item._id.queueStatus] = (monthData[item._id.queueStatus] || 0) + item.count;
    });
    
    timelineData.push(...Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    }));

    // Dealership Queue Performance
    const dealershipPerformanceData = data.dealershipQueuePerformance
      ?.filter((item: any) => item.totalVehicles > 0)
      .map((item: any) => ({
        dealership: item._id || 'No Dealership',
        totalVehicles: item.totalVehicles,
        pending: item.pending,
        processing: item.processing,
        processed: item.processed,
        failed: item.failed,
        avgAttempts: item.avgProcessingAttempts,
        successRate: item.successRate,
        failureRate: item.failureRate,
      })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Queue Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Queue Status by Vehicle Type</h4>
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
            <h4 className="text-sm font-medium mb-4">Processing Attempts Distribution</h4>
            <StackedBarChart
              data={attemptsData}
              xAxisKey="attempts"
              series={[
                { dataKey: 'count', name: 'Vehicles', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Processing Timeline</h4>
            <LineChart
              data={timelineData}
              xAxisKey="month"
              lines={[
                { dataKey: 'processed', name: 'Processed', color: '#10b981' },
                { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Dealership Queue Performance</h4>
          <StackedBarChart
            data={dealershipPerformanceData}
            xAxisKey="dealership"
            series={[
              { dataKey: 'processed', name: 'Processed', color: '#10b981' },
              { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
              { dataKey: 'processing', name: 'Processing', color: '#3b82f6' },
              { dataKey: 'failed', name: 'Failed', color: '#ef4444' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.dealershipQueuePerformance) return null;

    const columns = [
      { key: 'dealership', label: 'Dealership', sortable: true },
      { key: 'totalVehicles', label: 'Total', sortable: true },
      { key: 'pending', label: 'Pending', sortable: true },
      { key: 'processing', label: 'Processing', sortable: true },
      { key: 'processed', label: 'Processed', sortable: true },
      { key: 'failed', label: 'Failed', sortable: true },
      { key: 'avgAttempts', label: 'Avg Attempts', sortable: true },
      { key: 'successRate', label: 'Success %', sortable: true },
    ];

    const tableData = data.dealershipQueuePerformance
      .filter((item: any) => item.totalVehicles > 0)
      .map((item: any) => ({
        dealership: item._id || 'No Dealership',
        totalVehicles: item.totalVehicles,
        pending: item.pending,
        processing: item.processing,
        processed: item.processed,
        failed: item.failed,
        avgAttempts: item.avgProcessingAttempts.toFixed(1),
        successRate: `${item.successRate.toFixed(1)}%`,
      }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Queue Processing"
      subtitle="Queue status, processing attempts, and dealership performance"
      icon={<ListChecks className="h-5 w-5" />}
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

export default VehicleQueueProcessingReport;
