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
      console.log('Workshop Integration API Response:', response);
      console.log('Workshop Integration Data:', response.data?.data);
      setData(response.data?.data);
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
    if (!data?.workshopStatusOverview) return null;
    
    const totalVehicles = data.workshopStatusOverview.reduce((sum: number, item: any) => sum + item.totalVehicles, 0);
    const totalInWorkshop = data.workshopStatusOverview.reduce((sum: number, item: any) => sum + item.vehiclesInWorkshop, 0);
    const totalReportReady = data.workshopStatusOverview.reduce((sum: number, item: any) => sum + item.vehiclesWithReportReady, 0);
    const totalReportPreparing = data.workshopStatusOverview.reduce((sum: number, item: any) => sum + item.vehiclesWithReportPreparing, 0);
    
    const avgWorkshopPercentage = totalVehicles > 0 ? (totalInWorkshop / totalVehicles) * 100 : 0;
    const avgReportReadyPercentage = totalVehicles > 0 ? (totalReportReady / totalVehicles) * 100 : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={<Wrench className="h-5 w-5" />}
          subtitle={`${totalInWorkshop} in workshop`}
        />
        <MetricCard
          title="Workshop Utilization"
          value={`${avgWorkshopPercentage.toFixed(1)}%`}
          subtitle={`${totalInWorkshop} vehicles`}
        />
        <MetricCard
          title="Report Ready"
          value={totalReportReady}
          subtitle={`${avgReportReadyPercentage.toFixed(1)}% completion`}
        />
        <MetricCard
          title="Report Preparing"
          value={totalReportPreparing}
          subtitle={`${((totalReportPreparing / totalVehicles) * 100).toFixed(1)}%`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Workshop Status by Type
    const workshopStatusData = data.workshopStatusOverview?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      inWorkshop: item.vehiclesInWorkshop,
      reportReady: item.vehiclesWithReportReady,
      reportPreparing: item.vehiclesWithReportPreparing,
      workshopPercentage: item.workshopPercentage,
    })) || [];

    // Workshop Percentage Pie Chart
    const workshopPercentageData: PieChartData[] = data.workshopStatusOverview?.map((item: any) => {
      const name = item._id.charAt(0).toUpperCase() + item._id.slice(1);
      const colors: Record<string, string> = {
        'Inspection': '#3b82f6',
        'Tradein': '#10b981',
        'Master': '#f59e0b',
        'Advertisement': '#8b5cf6',
      };
      return {
        name,
        value: item.vehiclesInWorkshop,
        color: colors[name] || '#6b7280',
      };
    }).filter((item: any) => item.value > 0) || [];

    // Dealership Workshop Performance
    const dealershipPerformanceData = data.dealershipWorkshopPerformance?.map((item: any) => ({
      dealership: item._id || 'No Dealership',
      totalVehicles: item.totalVehicles,
      inWorkshop: item.vehiclesInWorkshop,
      reportReady: item.vehiclesWithReportReady,
      workshopUtilization: item.workshopUtilization,
      inspectionVehicles: item.inspectionVehicles,
      tradeinVehicles: item.tradeinVehicles,
    })).filter((item: any) => item.totalVehicles > 0) || [];

    // Workshop Timeline Analysis
    const timelineData: any[] = [];
    const monthMap = new Map<string, any>();
    
    data.workshopTimelineAnalysis?.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { 
          month: key, 
          year: item._id.year, 
          monthNum: item._id.month 
        });
      }
      const monthData = monthMap.get(key);
      monthData[`${item._id.type}_count`] = item.count;
      monthData[`${item._id.type}_ready`] = item.withReportReady;
    });
    
    timelineData.push(...Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    }));

    // Report Preparation Status
    const reportPrepData = data.reportPreparationStatus?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      multipleStages: item.vehiclesWithMultipleStages,
      avgReportReady: item.avgReportReadyCount,
      avgReportPreparing: item.avgReportPreparingCount,
      avgWorkshopStages: item.avgWorkshopStageCount,
      multipleStagesPercentage: item.multipleStagesPercentage,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Vehicles in Workshop by Type</h4>
            <InteractivePieChart data={workshopPercentageData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Workshop Status by Type</h4>
            <StackedBarChart
              data={workshopStatusData}
              xAxisKey="type"
              series={[
                { dataKey: 'inWorkshop', name: 'In Workshop', color: '#f59e0b' },
                { dataKey: 'reportPreparing', name: 'Report Preparing', color: '#3b82f6' },
                { dataKey: 'reportReady', name: 'Report Ready', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Workshop Timeline</h4>
            <LineChart
              data={timelineData}
              xAxisKey="month"
              lines={[
                { dataKey: 'inspection_count', name: 'Inspection Count', color: '#3b82f6' },
                { dataKey: 'tradein_count', name: 'Trade-in Count', color: '#10b981' },
                { dataKey: 'inspection_ready', name: 'Inspection Ready', color: '#8b5cf6' },
                { dataKey: 'tradein_ready', name: 'Trade-in Ready', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Dealership Workshop Performance</h4>
            <StackedBarChart
              data={dealershipPerformanceData}
              xAxisKey="dealership"
              series={[
                { dataKey: 'inWorkshop', name: 'In Workshop', color: '#f59e0b' },
                { dataKey: 'reportReady', name: 'Report Ready', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.workshopStatusOverview) return null;

    const columns = [
      { key: 'type', label: 'Vehicle Type', sortable: true },
      { key: 'totalVehicles', label: 'Total', sortable: true },
      { key: 'inWorkshop', label: 'In Workshop', sortable: true },
      { key: 'reportReady', label: 'Report Ready', sortable: true },
      { key: 'reportPreparing', label: 'Report Preparing', sortable: true },
      { key: 'workshopPercentage', label: 'Workshop %', sortable: true },
      { key: 'reportReadyPercentage', label: 'Ready %', sortable: true },
    ];

    const tableData = data.workshopStatusOverview.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      inWorkshop: item.vehiclesInWorkshop,
      reportReady: item.vehiclesWithReportReady,
      reportPreparing: item.vehiclesWithReportPreparing,
      workshopPercentage: `${item.workshopPercentage.toFixed(1)}%`,
      reportReadyPercentage: `${item.reportReadyPercentage.toFixed(1)}%`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Workshop Integration"
      subtitle="Workshop status, progress tracking, and performance metrics"
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
