import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Wrench } from 'lucide-react';

interface MasterVehicleWorkshopStatusReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const MasterVehicleWorkshopStatusReport: React.FC<MasterVehicleWorkshopStatusReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getMasterVehicleWorkshopStatus(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load master vehicle workshop status data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting master vehicle workshop status report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="In Workshop"
          value={data.metrics.inWorkshop || 0}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed"
          value={data.metrics.completed || 0}
          trend={{ value: data.metrics.completedTrend || 0, isPositive: true }}
        />
        <MetricCard
          title="Pending"
          value={data.metrics.pending || 0}
        />
        <MetricCard
          title="Avg Completion Days"
          value={data.metrics.avgCompletionDays || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusData: PieChartData[] = data.workshopStatus?.map((item: any) => ({
      name: item.status,
      value: item.count,
    })) || [];

    const trendData = data.completionTrends || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Workshop Status</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Completion Trends</h4>
            <LineChart
              data={trendData}
              xAxisKey="month"
              lines={[
                { dataKey: 'completed', name: 'Completed' },
                { dataKey: 'inProgress', name: 'In Progress' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'vehicleId', label: 'Vehicle ID' },
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'workshopStatus', label: 'Status' },
      { key: 'daysInWorkshop', label: 'Days' },
      { key: 'completionRate', label: 'Completion %' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Master Vehicle Workshop Status"
      subtitle="Workshop integration metrics"
      icon={<Wrench className="h-5 w-5" />}
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

export default MasterVehicleWorkshopStatusReport;
