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
import { DollarSign } from 'lucide-react';

interface VehicleCostDetailsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleCostDetailsReport: React.FC<VehicleCostDetailsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleCostDetails(params);
      console.log('Cost Details API Response:', response);
      console.log('Cost Details Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost details data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting cost details report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.costConfigOverview) return null;
    
    const totalVehicles = data.costConfigOverview.reduce((sum: number, item: any) => sum + item.totalVehicles, 0);
    const totalWithCostDetails = data.costConfigOverview.reduce((sum: number, item: any) => sum + item.vehiclesWithCostDetails, 0);
    const totalPricingReady = data.costConfigOverview.reduce((sum: number, item: any) => sum + item.vehiclesWithPricingReady, 0);
    const avgCostConfigRate = data.costConfigOverview.reduce((sum: number, item: any) => sum + item.costConfigRate, 0) / 
      (data.costConfigOverview.length || 1);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`${totalWithCostDetails} with cost details`}
        />
        <MetricCard
          title="Cost Config Rate"
          value={`${avgCostConfigRate.toFixed(1)}%`}
          subtitle={`${totalWithCostDetails} configured`}
        />
        <MetricCard
          title="Pricing Ready"
          value={totalPricingReady}
          subtitle={`${((totalPricingReady / totalVehicles) * 100).toFixed(1)}% ready`}
        />
        <MetricCard
          title="Pending Config"
          value={totalVehicles - totalWithCostDetails}
          subtitle="Needs configuration"
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Cost Config Overview by Type
    const costConfigData = data.costConfigOverview?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      withCostDetails: item.vehiclesWithCostDetails,
      pricingReady: item.vehiclesWithPricingReady,
      costConfigRate: item.costConfigRate,
      pricingReadyRate: item.pricingReadyRate,
    })) || [];

    // Pricing Readiness Pie Chart
    const pricingReadyData: PieChartData[] = [
      { 
        name: 'Pricing Ready', 
        value: data.costConfigOverview?.reduce((sum: number, item: any) => sum + item.vehiclesWithPricingReady, 0) || 0,
        color: '#10b981'
      },
      { 
        name: 'Not Ready', 
        value: data.costConfigOverview?.reduce((sum: number, item: any) => sum + (item.totalVehicles - item.vehiclesWithPricingReady), 0) || 0,
        color: '#ef4444'
      },
    ].filter(item => item.value > 0);

    // Pricing Readiness by Status
    const pricingByStatusData = data.pricingReadinessByStatus?.map((item: any) => {
      const statusObj: any = { 
        status: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        total: item.totalCount,
      };
      
      let readyCount = 0;
      let notReadyCount = 0;
      let unknownCount = 0;
      
      item.pricingReadyBreakdown?.forEach((breakdown: any) => {
        if (breakdown.pricingReady === true) {
          readyCount += breakdown.count;
        } else if (breakdown.pricingReady === false) {
          notReadyCount += breakdown.count;
        } else {
          unknownCount += breakdown.count;
        }
      });
      
      statusObj.ready = readyCount;
      statusObj.notReady = notReadyCount;
      statusObj.unknown = unknownCount;
      
      return statusObj;
    }) || [];

    // Cost Effectiveness
    const costEffectivenessData = data.costEffectiveness
      ?.filter((item: any) => item.count > 0)
      .map((item: any) => ({
        type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        count: item.count,
        avgExactExpenses: item.avgExactExpenses,
        avgEstimatedExpenses: item.avgEstimatedExpenses,
        avgPurchasePrice: item.avgPurchasePrice,
        avgRetailPrice: item.avgRetailPrice,
        expenseRatio: item.expenseToRevenueRatio,
      })) || [];

    // Dealership Cost Performance
    const dealershipPerformanceData = data.dealershipCostPerformance
      ?.filter((item: any) => item.totalVehicles > 0)
      .map((item: any) => ({
        dealership: item._id || 'No Dealership',
        totalVehicles: item.totalVehicles,
        withCostDetails: item.withCostDetails,
        pricingReady: item.pricingReady,
        costConfigRate: item.costConfigRate,
        pricingReadyRate: item.pricingReadyRate,
      })) || [];

    // Cost Config Timeline
    const timelineData: any[] = [];
    data.costConfigTimeline?.forEach((item: any) => {
      if (!item._id.year || !item._id.month) return;
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      timelineData.push({
        month: key,
        year: item._id.year,
        monthNum: item._id.month,
        totalVehicles: item.totalVehicles,
        withCostDetails: item.withCostDetails,
        pricingReady: item.pricingReady,
      });
    });
    
    timelineData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Pricing Readiness</h4>
            <InteractivePieChart data={pricingReadyData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Config by Vehicle Type</h4>
            <StackedBarChart
              data={costConfigData}
              xAxisKey="type"
              series={[
                { dataKey: 'withCostDetails', name: 'With Cost Details', color: '#10b981' },
                { dataKey: 'pricingReady', name: 'Pricing Ready', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Pricing Readiness by Status</h4>
            <StackedBarChart
              data={pricingByStatusData}
              xAxisKey="status"
              series={[
                { dataKey: 'ready', name: 'Ready', color: '#10b981' },
                { dataKey: 'notReady', name: 'Not Ready', color: '#ef4444' },
                { dataKey: 'unknown', name: 'Unknown', color: '#6b7280' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Dealership Cost Performance</h4>
            <StackedBarChart
              data={dealershipPerformanceData}
              xAxisKey="dealership"
              series={[
                { dataKey: 'withCostDetails', name: 'With Cost Details', color: '#3b82f6' },
                { dataKey: 'pricingReady', name: 'Pricing Ready', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
        {timelineData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Config Timeline</h4>
            <LineChart
              data={timelineData}
              xAxisKey="month"
              lines={[
                { dataKey: 'totalVehicles', name: 'Total Vehicles', color: '#6b7280' },
                { dataKey: 'withCostDetails', name: 'With Cost Details', color: '#3b82f6' },
                { dataKey: 'pricingReady', name: 'Pricing Ready', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.dealershipCostPerformance) return null;

    const columns = [
      { key: 'dealership', label: 'Dealership', sortable: true },
      { key: 'totalVehicles', label: 'Total', sortable: true },
      { key: 'withCostDetails', label: 'With Cost Details', sortable: true },
      { key: 'pricingReady', label: 'Pricing Ready', sortable: true },
      { key: 'costConfigRate', label: 'Config Rate %', sortable: true },
      { key: 'pricingReadyRate', label: 'Ready Rate %', sortable: true },
    ];

    const tableData = data.dealershipCostPerformance
      .filter((item: any) => item.totalVehicles > 0)
      .map((item: any) => ({
        dealership: item._id || 'No Dealership',
        totalVehicles: item.totalVehicles,
        withCostDetails: item.withCostDetails,
        pricingReady: item.pricingReady,
        costConfigRate: `${item.costConfigRate.toFixed(1)}%`,
        pricingReadyRate: `${item.pricingReadyRate.toFixed(1)}%`,
      }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Cost Details"
      subtitle="Cost configuration, pricing readiness, and dealership performance"
      icon={<DollarSign className="h-5 w-5" />}
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

export default VehicleCostDetailsReport;
