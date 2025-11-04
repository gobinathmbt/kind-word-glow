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
}

export const VehicleStatusDistributionReport: React.FC<VehicleStatusDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleStatusDistribution(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load status distribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting status distribution report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Active"
          value={data.metrics.activeCount || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Pending"
          value={data.metrics.pendingCount || 0}
        />
        <MetricCard
          title="Completed"
          value={data.metrics.completedCount || 0}
        />
        <MetricCard
          title="In Progress"
          value={data.metrics.inProgressCount || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusData: PieChartData[] = data.statusDistribution?.map((item: any) => ({
      name: item.status,
      value: item.count,
    })) || [];

    const statusTimelineData = data.statusTimeline || [];
    const dealershipStatusData = data.dealershipStatus || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Status Transitions Timeline</h4>
            <LineChart
              data={statusTimelineData}
              xAxisKey="date"
              lines={[
                { dataKey: 'active', name: 'Active' },
                { dataKey: 'pending', name: 'Pending' },
                { dataKey: 'completed', name: 'Completed' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Dealership-wise Status Breakdown</h4>
          <StackedBarChart
            data={dealershipStatusData}
            xAxisKey="dealership"
            series={[
              { dataKey: 'active', name: 'Active' },
              { dataKey: 'pending', name: 'Pending' },
              { dataKey: 'completed', name: 'Completed' },
              { dataKey: 'inProgress', name: 'In Progress' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'status', label: 'Status' },
      { key: 'count', label: 'Count' },
      { key: 'percentage', label: 'Percentage' },
      { key: 'avgDuration', label: 'Avg Duration (days)' },
      { key: 'trend', label: 'Trend' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
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
