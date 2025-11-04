import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users } from 'lucide-react';

interface VehicleOwnershipHistoryReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleOwnershipHistoryReport: React.FC<VehicleOwnershipHistoryReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleOwnershipHistory(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ownership history data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting ownership history report as ${format}`);
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
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Single Owner"
          value={data.metrics.singleOwner || 0}
        />
        <MetricCard
          title="Multiple Owners"
          value={data.metrics.multipleOwners || 0}
        />
        <MetricCard
          title="PPSR Checked"
          value={data.metrics.ppsrChecked || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const ownershipData: PieChartData[] = data.ownershipPatterns?.map((item: any) => ({
      name: item.pattern,
      value: item.count,
    })) || [];

    const ppsrData = data.ppsrAnalysis || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Ownership Patterns</h4>
            <InteractivePieChart data={ownershipData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">PPSR Analysis</h4>
            <StackedBarChart
              data={ppsrData}
              xAxisKey="status"
              series={[
                { dataKey: 'count', name: 'Vehicles' },
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
      { key: 'singleOwner', label: 'Single Owner' },
      { key: 'multipleOwners', label: 'Multiple Owners' },
      { key: 'ppsrChecked', label: 'PPSR Checked' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Ownership History"
      subtitle="Ownership patterns and PPSR analysis"
      icon={<Users className="h-5 w-5" />}
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

export default VehicleOwnershipHistoryReport;
