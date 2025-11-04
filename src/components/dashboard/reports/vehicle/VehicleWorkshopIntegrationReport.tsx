import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Wrench } from 'lucide-react';

interface VehicleWorkshopIntegrationReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleWorkshopIntegrationReport: React.FC<VehicleWorkshopIntegrationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleWorkshopIntegration(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop integration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting workshop integration report as ${format}`);
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
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="In Workshop"
          value={data.metrics.inWorkshop || 0}
          trend={{ value: data.metrics.workshopTrend || 0 }}
        />
        <MetricCard
          title="Workshop Ready"
          value={data.metrics.workshopReady || 0}
        />
        <MetricCard
          title="Completion Rate"
          value={`${data.metrics.completionRate || 0}%`}
          trend={{ value: data.metrics.completionTrend || 0, isPositive: true }}
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

    const progressData = data.progressByType || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Workshop Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Progress by Vehicle Type</h4>
            <StackedBarChart
              data={progressData}
              xAxisKey="type"
              series={[
                { dataKey: 'pending', name: 'Pending' },
                { dataKey: 'inProgress', name: 'In Progress' },
                { dataKey: 'completed', name: 'Completed' },
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
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'totalVehicles', label: 'Total' },
      { key: 'workshopReady', label: 'Ready' },
      { key: 'inWorkshop', label: 'In Workshop' },
      { key: 'completed', label: 'Completed' },
      { key: 'completionRate', label: 'Completion %' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Workshop Integration"
      subtitle="Workshop status and progress tracking"
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

export default VehicleWorkshopIntegrationReport;
