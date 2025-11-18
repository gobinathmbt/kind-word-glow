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
import { Activity } from 'lucide-react';

interface VehicleOdometerTrendsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const VehicleOdometerTrendsReport: React.FC<VehicleOdometerTrendsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleOdometerTrends(params);
      console.log('Odometer Trends API Response:', response);
      console.log('Odometer Trends Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load odometer trends data');
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
    console.log(`Exporting odometer trends report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.odometerOverview) return null;
    
    const totalVehicles = data.odometerOverview.reduce((sum: number, item: any) => sum + item.totalVehicles, 0);
    const avgReading = data.odometerOverview.reduce((sum: number, item: any) => sum + (item.avgReading || 0), 0) / 
      (data.odometerOverview.filter((item: any) => item.avgReading).length || 1);
    const minReading = Math.min(...data.odometerOverview.filter((item: any) => item.minReading).map((item: any) => item.minReading));
    const maxReading = Math.max(...data.odometerOverview.filter((item: any) => item.maxReading).map((item: any) => item.maxReading));
    
    const certifiedCount = data.certificationStatus?.find((item: any) => item._id.certified === true)?.count || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Avg Odometer"
          value={`${Math.round(avgReading).toLocaleString()} km`}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${totalVehicles} vehicles`}
        />
        <MetricCard
          title="Min Reading"
          value={`${minReading.toLocaleString()} km`}
          subtitle="Lowest recorded"
        />
        <MetricCard
          title="Max Reading"
          value={`${maxReading.toLocaleString()} km`}
          subtitle="Highest recorded"
        />
        <MetricCard
          title="Certified"
          value={certifiedCount}
          subtitle={`${((certifiedCount / totalVehicles) * 100).toFixed(1)}% verified`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Odometer Range Distribution
    const rangeData = data.odometerRangeDistribution
      ?.filter((item: any) => item._id !== '1000000+')
      .map((item: any) => {
        let rangeLabel = '';
        if (item._id === 0) {
          rangeLabel = '0-50K';
        } else {
          const start = item._id / 1000;
          const end = start + 50;
          rangeLabel = `${start}K-${end}K`;
        }
        return {
          range: rangeLabel,
          count: item.count,
        };
      }) || [];

    // Odometer Range Pie Chart
    const rangePieData: PieChartData[] = rangeData.map((item: any, index: number) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
      return {
        name: item.range,
        value: item.count,
        color: colors[index % colors.length],
      };
    });

    // Odometer by Age Group
    const ageGroupData: any[] = [];
    const ageGroupMap = new Map<string, any>();
    
    data.odometerByAge?.forEach((item: any) => {
      const ageGroup = item._id.ageGroup;
      if (!ageGroupMap.has(ageGroup)) {
        ageGroupMap.set(ageGroup, { ageGroup });
      }
      const groupData = ageGroupMap.get(ageGroup);
      groupData[`${item._id.type}_count`] = item.count;
      groupData[`${item._id.type}_avg`] = item.avgReading || 0;
    });
    
    ageGroupData.push(...Array.from(ageGroupMap.values()));

    // Sort age groups
    const ageOrder = ['0-3 years', '4-5 years', '6-10 years', '11-15 years', '15+ years'];
    ageGroupData.sort((a, b) => ageOrder.indexOf(a.ageGroup) - ageOrder.indexOf(b.ageGroup));

    // Odometer Overview by Type
    const overviewData = data.odometerOverview
      ?.filter((item: any) => item.avgReading)
      .map((item: any) => ({
        type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        totalVehicles: item.totalVehicles,
        minReading: item.minReading,
        maxReading: item.maxReading,
        avgReading: item.avgReading,
      })) || [];

    // Certification Status
    const certificationData: PieChartData[] = [
      { 
        name: 'Certified', 
        value: data.certificationStatus?.find((item: any) => item._id.certified === true)?.count || 0,
        color: '#10b981'
      },
      { 
        name: 'Not Certified', 
        value: data.certificationStatus?.find((item: any) => item._id.certified === false)?.count || 0,
        color: '#ef4444'
      },
    ].filter(item => item.value > 0);

    // Odometer Timeline
    const timelineData: any[] = [];
    data.odometerTimeline?.forEach((item: any) => {
      if (!item._id.year || !item._id.month) return;
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      timelineData.push({
        month: key,
        year: item._id.year,
        monthNum: item._id.month,
        count: item.count,
        avgReading: item.avgReading || 0,
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
            <h4 className="text-sm font-medium mb-4">Odometer Range Distribution</h4>
            <InteractivePieChart data={rangePieData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Certification Status</h4>
            <InteractivePieChart data={certificationData} height={300} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Odometer by Vehicle Type</h4>
            <StackedBarChart
              data={overviewData}
              xAxisKey="type"
              series={[
                { dataKey: 'avgReading', name: 'Avg Reading (km)', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Avg Odometer by Age Group</h4>
            <StackedBarChart
              data={ageGroupData}
              xAxisKey="ageGroup"
              series={[
                { dataKey: 'inspection_avg', name: 'Inspection', color: '#3b82f6' },
                { dataKey: 'tradein_avg', name: 'Trade-in', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
        {timelineData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Odometer Timeline</h4>
            <LineChart
              data={timelineData}
              xAxisKey="month"
              lines={[
                { dataKey: 'avgReading', name: 'Avg Reading', color: '#3b82f6' },
                { dataKey: 'count', name: 'Vehicle Count', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.odometerOverview) return null;

    const columns = [
      { key: 'type', label: 'Vehicle Type', sortable: true },
      { key: 'totalVehicles', label: 'Total', sortable: true },
      { key: 'minReading', label: 'Min (km)', sortable: true },
      { key: 'maxReading', label: 'Max (km)', sortable: true },
      { key: 'avgReading', label: 'Avg (km)', sortable: true },
    ];

    const tableData = data.odometerOverview
      .filter((item: any) => item.avgReading)
      .map((item: any) => ({
        type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        totalVehicles: item.totalVehicles,
        minReading: item.minReading?.toLocaleString() || 'N/A',
        maxReading: item.maxReading?.toLocaleString() || 'N/A',
        avgReading: Math.round(item.avgReading).toLocaleString(),
      }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Odometer Trends"
      subtitle="Odometer reading patterns, certification, and age analysis"
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

export default VehicleOdometerTrendsReport;
