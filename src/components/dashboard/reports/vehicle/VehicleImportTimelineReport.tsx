import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Ship } from 'lucide-react';

interface VehicleImportTimelineReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const VehicleImportTimelineReport: React.FC<VehicleImportTimelineReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleImportTimeline(params);
      console.log('Import Timeline API Response:', response);
      console.log('Import Timeline Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load import timeline data');
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
    console.log(`Exporting import timeline report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.importOverview) return null;
    
    const totalVehicles = data.importOverview.reduce((sum: number, item: any) => sum + item.totalVehicles, 0);
    const totalWithImportDetails = data.importOverview.reduce((sum: number, item: any) => sum + item.vehiclesWithImportDetails, 0);
    const totalImportedAsDamaged = data.importOverview.reduce((sum: number, item: any) => sum + item.importedAsDamaged, 0);
    
    const avgTransitDays = data.etdEtaAnalysis?.reduce((sum: number, item: any) => sum + (item.avgTransitDays || 0), 0) / 
      (data.etdEtaAnalysis?.filter((item: any) => item.avgTransitDays !== null).length || 1);
    
    const totalVessels = data.vesselAnalysis?.length || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={<Ship className="h-5 w-5" />}
          subtitle={`${totalWithImportDetails} with import details`}
        />
        <MetricCard
          title="Imported as Damaged"
          value={totalImportedAsDamaged}
          subtitle={`${((totalImportedAsDamaged / totalVehicles) * 100).toFixed(1)}% of total`}
        />
        <MetricCard
          title="Avg Transit Days"
          value={avgTransitDays.toFixed(1)}
          subtitle="Days in transit"
        />
        <MetricCard
          title="Vessels Used"
          value={totalVessels}
          subtitle="Unique vessels"
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Import Timeline
    const timelineData: any[] = [];
    data.importTimeline?.forEach((item: any) => {
      if (!item._id.year || !item._id.month) return;
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      timelineData.push({
        month: key,
        year: item._id.year,
        monthNum: item._id.month,
        count: item.count,
        damagedCount: item.damagedCount,
      });
    });
    
    timelineData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });

    // Port Distribution
    const portData = data.portDistribution
      ?.filter((item: any) => item._id && item._id !== '' && item.count > 0)
      .map((item: any) => ({
        port: item._id,
        count: item.count,
        avgDaysInYard: item.avgDaysInYard || 0,
      })) || [];

    // Port Distribution Pie Chart
    const portPieData: PieChartData[] = portData.map((item: any, index: number) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
      return {
        name: item.port,
        value: item.count,
        color: colors[index % colors.length],
      };
    });

    // Import Overview by Type
    const importOverviewData = data.importOverview?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      withImportDetails: item.vehiclesWithImportDetails,
      importedAsDamaged: item.importedAsDamaged,
      importRate: item.importRate,
      damagedRate: item.damagedRate,
    })) || [];

    // ETD/ETA Analysis
    const etdEtaData = data.etdEtaAnalysis
      ?.filter((item: any) => item.avgTransitDays !== null)
      .map((item: any) => ({
        type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        count: item.count,
        avgTransitDays: item.avgTransitDays || 0,
        avgYardDelayDays: item.avgYardDelayDays || 0,
        minTransitDays: item.minTransitDays || 0,
        maxTransitDays: item.maxTransitDays || 0,
      })) || [];

    // Top Vessels
    const topVessels = data.vesselAnalysis
      ?.filter((item: any) => item._id.vessel && item.count > 10)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10)
      .map((item: any) => ({
        vessel: item._id.vessel,
        count: item.count,
        ports: item.ports?.join(', ') || 'N/A',
      })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Import Timeline</h4>
            <LineChart
              data={timelineData}
              xAxisKey="month"
              lines={[
                { dataKey: 'count', name: 'Total Imports', color: '#3b82f6' },
                { dataKey: 'damagedCount', name: 'Damaged', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Port Distribution</h4>
            <InteractivePieChart data={portPieData} height={300} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Import Overview by Type</h4>
            <StackedBarChart
              data={importOverviewData}
              xAxisKey="type"
              series={[
                { dataKey: 'withImportDetails', name: 'With Import Details', color: '#10b981' },
                { dataKey: 'importedAsDamaged', name: 'Imported as Damaged', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Transit & Yard Delay Analysis</h4>
            <StackedBarChart
              data={etdEtaData}
              xAxisKey="type"
              series={[
                { dataKey: 'avgTransitDays', name: 'Avg Transit Days', color: '#3b82f6' },
                { dataKey: 'avgYardDelayDays', name: 'Avg Yard Delay', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Port Yard Days</h4>
          <StackedBarChart
            data={portData}
            xAxisKey="port"
            series={[
              { dataKey: 'avgDaysInYard', name: 'Avg Days in Yard', color: '#8b5cf6' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.vesselAnalysis) return null;

    const columns = [
      { key: 'vessel', label: 'Vessel', sortable: true },
      { key: 'count', label: 'Vehicle Count', sortable: true },
      { key: 'ports', label: 'Ports', sortable: false },
    ];

    const tableData = data.vesselAnalysis
      .filter((item: any) => item._id.vessel && item.count > 0)
      .map((item: any) => ({
        vessel: item._id.vessel || 'Unknown',
        count: item.count,
        ports: item.ports?.join(', ') || 'N/A',
      }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Import Timeline"
      subtitle="Import details, vessel analysis, and ETD/ETA tracking"
      icon={<Ship className="h-5 w-5" />}
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

export default VehicleImportTimelineReport;
