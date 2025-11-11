import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Building2, Users, MapPin } from 'lucide-react';

interface UserDealershipAssignmentReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const UserDealershipAssignmentReport: React.FC<UserDealershipAssignmentReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserDealershipAssignment(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dealership assignment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting dealership assignment report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={data.metrics.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Dealerships"
          value={data.metrics.totalDealerships || 0}
          icon={<Building2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Multi-Dealership Users"
          value={data.metrics.multiDealershipUsers || 0}
          icon={<MapPin className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Users per Dealership"
          value={data.metrics.avgUsersPerDealership || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const assignmentData: PieChartData[] = data.assignmentDistribution?.map((item: any) => ({
      name: item.dealershipName,
      value: item.userCount,
    })) || [];

    const roleByDealershipData = data.roleByDealership || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">User Distribution by Dealership</h4>
            <InteractivePieChart data={assignmentData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Roles by Dealership</h4>
            <StackedBarChart
              data={roleByDealershipData}
              xAxisKey="dealership"
              series={[
                { dataKey: 'admins', name: 'Admins' },
                { dataKey: 'managers', name: 'Managers' },
                { dataKey: 'users', name: 'Users' },
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
      { key: 'dealershipName', label: 'Dealership' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'admins', label: 'Admins' },
      { key: 'managers', label: 'Managers' },
      { key: 'regularUsers', label: 'Regular Users' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="User Dealership Assignment"
      subtitle="Assignment patterns across dealerships"
      icon={<Building2 className="h-5 w-5" />}
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

export default UserDealershipAssignmentReport;
