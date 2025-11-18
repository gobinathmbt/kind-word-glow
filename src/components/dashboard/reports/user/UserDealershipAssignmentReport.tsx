import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Building2, Users, MapPin, Award } from 'lucide-react';

interface UserDealershipAssignmentReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const UserDealershipAssignmentReport: React.FC<UserDealershipAssignmentReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserDealershipAssignment(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dealership assignment data');
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
    console.log(`Exporting dealership assignment report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const assignmentStats = data.assignmentStats || {};
    const totalUsers = assignmentStats.totalUsers || 0;
    const usersWithAssignments = assignmentStats.usersWithAssignments || 0;
    const totalAssignments = assignmentStats.totalAssignments || 0;
    const primaryAdmins = assignmentStats.primaryAdmins || 0;
    const avgAssignments = assignmentStats.avgAssignmentsPerUser || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={totalUsers}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${usersWithAssignments} with assignments`}
        />
        <MetricCard
          title="Total Assignments"
          value={totalAssignments}
          icon={<Building2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Primary Admins"
          value={primaryAdmins}
          icon={<Award className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Assignments/User"
          value={avgAssignments.toFixed(1)}
          icon={<MapPin className="h-5 w-5" />}
          subtitle={`${assignmentStats.assignmentRate || 0}% assignment rate`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const distributionColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const roleColors = ['#3b82f6', '#8b5cf6', '#ec4899'];
    const coverageColors = ['#10b981', '#34d399', '#6ee7b7'];

    const usersByDealershipCount = data.usersByDealershipCount || [];
    const assignmentByRole = data.assignmentByRole || [];
    const dealershipCoverage = data.dealershipCoverage || [];

    // Users by Dealership Count Distribution
    const distributionData: PieChartData[] = usersByDealershipCount.map((item: any, index: number) => ({
      name: item._id === 0 ? 'No Dealerships' : `${item._id} Dealership${item._id > 1 ? 's' : ''}`,
      value: item.count || 0,
      label: `${item.count || 0} users`,
      color: distributionColors[index % distributionColors.length],
    }));

    // Assignment by Role
    const roleAssignmentData = assignmentByRole
      .sort((a: any, b: any) => (b.avgDealershipCount || 0) - (a.avgDealershipCount || 0))
      .map((role: any, index: number) => ({
        name: role._id || 'Unknown',
        value: role.avgDealershipCount || 0,
        label: `${(role.avgDealershipCount || 0).toFixed(1)}`,
        color: roleColors[index % roleColors.length],
      }));

    const roleComparisonData = assignmentByRole.map((role: any) => ({
      name: role._id || 'Unknown',
      totalUsers: role.totalUsers || 0,
      withMultiple: role.usersWithMultipleDealerships || 0,
      withNone: role.usersWithNoDealerships || 0,
    }));

    // Dealership Coverage
    const coverageData = dealershipCoverage
      .sort((a: any, b: any) => (b.userCount || 0) - (a.userCount || 0))
      .map((dealership: any, index: number) => ({
        name: dealership._id || 'Unknown',
        value: dealership.userCount || 0,
        label: `${dealership.userCount || 0} users`,
        color: coverageColors[index % coverageColors.length],
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Users by Dealership Count</h4>
            <InteractivePieChart data={distributionData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Assignment by Role</h4>
            <StackedBarChart
              data={roleComparisonData}
              xAxisKey="name"
              series={[
                { dataKey: 'totalUsers', name: 'Total Users', color: roleColors[0] },
                { dataKey: 'withMultiple', name: 'Multiple Dealerships', color: roleColors[1] },
                { dataKey: 'withNone', name: 'No Dealerships', color: roleColors[2] },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    const detailedAssignments = data.detailedAssignments || [];

    const columns = [
      { key: 'userName', label: 'User' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'dealershipCount', label: 'Dealership Count' },
      { key: 'isPrimaryAdmin', label: 'Primary Admin' },
      { key: 'isActive', label: 'Active' },
      { key: 'dealerships', label: 'Dealership IDs' },
    ];

    const tableData = detailedAssignments.map((user: any) => ({
      userName: user.fullName || user.username || 'Unknown',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      dealershipCount: user.dealershipCount || 0,
      isPrimaryAdmin: user.is_primary_admin ? 'Yes' : 'No',
      isActive: user.is_active ? 'Yes' : 'No',
      dealerships: user.dealerships && user.dealerships.length > 0
        ? user.dealerships.map((d: any) => d.id).filter(Boolean).join(', ') || 'None'
        : 'None',
    }));

    return <DataTable columns={columns} data={tableData} />;
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
