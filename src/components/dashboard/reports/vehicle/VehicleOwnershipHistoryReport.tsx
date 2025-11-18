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
  shouldLoad?: boolean;
}

export const VehicleOwnershipHistoryReport: React.FC<VehicleOwnershipHistoryReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleOwnershipHistory(params);
      console.log('Ownership History API Response:', response);
      console.log('Ownership History Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ownership history data');
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
    console.log(`Exporting ownership history report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.ownershipOverview) return null;
    
    const totalVehicles = data.ownershipOverview.reduce((sum: number, item: any) => sum + item.totalVehicles, 0);
    const totalWithPpsr = data.ownershipOverview.reduce((sum: number, item: any) => sum + item.withPpsrInterest, 0);
    const avgPreviousOwners = data.ownershipOverview.reduce((sum: number, item: any) => sum + (item.avgPreviousOwners || 0), 0) / 
      (data.ownershipOverview.filter((item: any) => item.avgPreviousOwners).length || 1);
    
    const ppsrTrue = data.ppsrAnalysis?.find((item: any) => item._id === true)?.totalCount || 0;
    const ppsrFalse = data.ppsrAnalysis?.find((item: any) => item._id === false)?.totalCount || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${avgPreviousOwners.toFixed(1)} avg owners`}
        />
        <MetricCard
          title="PPSR Interest"
          value={totalWithPpsr}
          subtitle={`${((totalWithPpsr / totalVehicles) * 100).toFixed(1)}% of total`}
        />
        <MetricCard
          title="PPSR Verified"
          value={ppsrTrue}
          subtitle="With PPSR check"
        />
        <MetricCard
          title="PPSR Clear"
          value={ppsrFalse}
          subtitle="No PPSR interest"
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Previous Owners Distribution
    const ownersData: PieChartData[] = data.previousOwnersDistribution
      ?.filter((item: any) => item._id !== null && item.count > 0)
      .map((item: any, index: number) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
        return {
          name: `${item._id} Owner${item._id > 1 ? 's' : ''}`,
          value: item.count,
          color: colors[index % colors.length],
        };
      }) || [];

    // Origin Distribution
    const originData: PieChartData[] = data.originDistribution
      ?.filter((item: any) => item._id && item._id !== '' && item.count > 0)
      .map((item: any, index: number) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        return {
          name: item._id,
          value: item.count,
          color: colors[index % colors.length],
        };
      }) || [];

    // PPSR Analysis by Type
    const ppsrByTypeData = data.ppsrAnalysis
      ?.filter((item: any) => item._id !== null)
      .map((item: any) => {
        const statusObj: any = { 
          status: item._id ? 'PPSR Interest' : 'No Interest',
          total: item.totalCount,
        };
        item.vehicleTypeBreakdown?.forEach((vType: any) => {
          statusObj[vType.type] = vType.count;
        });
        return statusObj;
      }) || [];

    // Ownership Overview by Type
    const ownershipOverviewData = data.ownershipOverview
      ?.filter((item: any) => item.avgPreviousOwners)
      .map((item: any) => ({
        type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        totalVehicles: item.totalVehicles,
        withPpsrInterest: item.withPpsrInterest,
        avgPreviousOwners: item.avgPreviousOwners,
        ppsrInterestRate: item.ppsrInterestRate,
      })) || [];

    // Top Makes/Models by Ownership
    const topMakeModels = data.ownershipByMakeModel
      ?.slice(0, 10)
      .map((item: any) => ({
        makeModel: `${item._id.make} ${item._id.model}`,
        count: item.count,
        ppsrCount: item.ppsrCount,
        avgPreviousOwners: item.avgPreviousOwners || 0,
      })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Previous Owners Distribution</h4>
            <InteractivePieChart data={ownersData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Origin Distribution</h4>
            <InteractivePieChart data={originData} height={300} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">PPSR Analysis by Vehicle Type</h4>
            <StackedBarChart
              data={ppsrByTypeData}
              xAxisKey="status"
              series={[
                { dataKey: 'inspection', name: 'Inspection', color: '#3b82f6' },
                { dataKey: 'tradein', name: 'Trade-in', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Ownership Overview by Type</h4>
            <StackedBarChart
              data={ownershipOverviewData}
              xAxisKey="type"
              series={[
                { dataKey: 'avgPreviousOwners', name: 'Avg Previous Owners', color: '#3b82f6' },
                { dataKey: 'withPpsrInterest', name: 'With PPSR Interest', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Top 10 Make/Models</h4>
          <StackedBarChart
            data={topMakeModels}
            xAxisKey="makeModel"
            series={[
              { dataKey: 'count', name: 'Total Vehicles', color: '#3b82f6' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.ownershipByMakeModel) return null;

    const columns = [
      { key: 'make', label: 'Make', sortable: true },
      { key: 'model', label: 'Model', sortable: true },
      { key: 'count', label: 'Total', sortable: true },
      { key: 'ppsrCount', label: 'PPSR Count', sortable: true },
      { key: 'avgPreviousOwners', label: 'Avg Owners', sortable: true },
      { key: 'ppsrRate', label: 'PPSR Rate %', sortable: true },
    ];

    const tableData = data.ownershipByMakeModel.map((item: any) => ({
      make: item._id.make,
      model: item._id.model,
      count: item.count,
      ppsrCount: item.ppsrCount,
      avgPreviousOwners: item.avgPreviousOwners !== null ? item.avgPreviousOwners.toFixed(1) : 'N/A',
      ppsrRate: `${item.ppsrRate.toFixed(1)}%`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Ownership History"
      subtitle="Ownership patterns, PPSR analysis, and origin tracking"
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
