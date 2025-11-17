import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Calendar, DollarSign, Clock, AlertTriangle, TrendingDown } from 'lucide-react';

interface ServiceBayHolidayImpactReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const ServiceBayHolidayImpactReport: React.FC<ServiceBayHolidayImpactReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getServiceBayHolidayImpact(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load service bay holiday impact data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting service bay holiday impact as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Bays"
          value={summary.totalBays || 0}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Bays with Holidays"
          value={summary.baysWithHolidays || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Holidays"
          value={summary.totalHolidays || 0}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Holiday Hours"
          value={(summary.totalHolidayHours || 0).toFixed(1)}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Holidays/Bay"
          value={(summary.avgHolidaysPerBay || 0).toFixed(1)}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Capacity Loss"
          value={`${(summary.avgCapacityLoss || 0).toFixed(1)}%`}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <MetricCard
          title="Est. Revenue Loss"
          value={`$${(summary.totalEstimatedRevenueLoss || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Est. Missed Bookings"
          value={summary.totalEstimatedMissedBookings || 0}
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const impactDistData: PieChartData[] = data.summary?.impactDistribution ? [
      { name: 'High Impact', value: data.summary.impactDistribution.high || 0, color: '#ef4444' },
      { name: 'Medium Impact', value: data.summary.impactDistribution.medium || 0, color: '#f59e0b' },
      { name: 'Low Impact', value: data.summary.impactDistribution.low || 0, color: '#10b981' },
    ] : [];

    const reasonColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const topReasonsData: PieChartData[] = data.summary?.topReasons?.slice(0, 5).map((reason: any, index: number) => ({
      name: reason.reason || 'Unknown',
      value: reason.count || 0,
      label: `${reason.count || 0} holidays`,
      color: reasonColors[index % reasonColors.length],
    })) || [];

    const bayImpactData = data.bays?.slice(0, 10).map((bay: any) => ({
      name: bay.bayName || 'Unknown',
      holidays: bay.holidayMetrics?.totalHolidays || 0,
      hours: bay.holidayMetrics?.totalHolidayHours || 0,
      capacityLoss: bay.holidayMetrics?.capacityLossPercentage || 0,
      revenueLoss: bay.operationalImpact?.estimatedRevenueLoss || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Impact Distribution</h4>
            <InteractivePieChart data={impactDistData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top Holiday Reasons</h4>
            <InteractivePieChart data={topReasonsData} height={300} />
          </div>
        </div>

        {bayImpactData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Bays by Holiday Impact</h4>
            <StackedBarChart
              data={bayImpactData}
              xAxisKey="name"
              series={[
                { dataKey: 'holidays', name: 'Holidays', color: '#3b82f6' },
                { dataKey: 'capacityLoss', name: 'Capacity Loss %', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.bays && data.bays.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Bay Holiday Details</h4>
            <DataTable
              columns={[
                { key: 'bayName', label: 'Bay Name' },
                { key: 'dealership', label: 'Dealership' },
                { key: 'holidays', label: 'Holidays' },
                { key: 'hours', label: 'Hours' },
                { key: 'capacityLoss', label: 'Capacity Loss' },
                { key: 'revenueLoss', label: 'Revenue Loss' },
                { key: 'impact', label: 'Impact' },
              ]}
              data={data.bays.slice(0, 20).map((bay: any) => ({
                bayName: bay.bayName || 'N/A',
                dealership: bay.dealership?.name || 'N/A',
                holidays: bay.holidayMetrics?.totalHolidays || 0,
                hours: (bay.holidayMetrics?.totalHolidayHours || 0).toFixed(1),
                capacityLoss: `${(bay.holidayMetrics?.capacityLossPercentage || 0).toFixed(1)}%`,
                revenueLoss: `$${(bay.operationalImpact?.estimatedRevenueLoss || 0).toLocaleString()}`,
                impact: bay.impactLevel || 'N/A',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.bays) return null;

    const tableData = data.bays.map((bay: any) => ({
      bayName: bay.bayName || 'Unknown',
      dealership: bay.dealership?.name || 'N/A',
      totalHolidays: bay.holidayMetrics?.totalHolidays || 0,
      totalHolidayHours: (bay.holidayMetrics?.totalHolidayHours || 0).toFixed(1),
      avgHoursPerHoliday: (bay.holidayMetrics?.avgHoursPerHoliday || 0).toFixed(1),
      capacityLossPercentage: `${(bay.holidayMetrics?.capacityLossPercentage || 0).toFixed(1)}%`,
      estimatedRevenueLoss: `$${(bay.operationalImpact?.estimatedRevenueLoss || 0).toLocaleString()}`,
      estimatedMissedBookings: bay.operationalImpact?.estimatedMissedBookings || 0,
      impactLevel: bay.impactLevel || 'N/A',
    }));

    const columns = [
      { key: 'bayName', label: 'Bay Name' },
      { key: 'dealership', label: 'Dealership' },
      { key: 'totalHolidays', label: 'Holidays' },
      { key: 'totalHolidayHours', label: 'Hours' },
      { key: 'avgHoursPerHoliday', label: 'Avg Hours' },
      { key: 'capacityLossPercentage', label: 'Capacity Loss' },
      { key: 'estimatedRevenueLoss', label: 'Revenue Loss' },
      { key: 'estimatedMissedBookings', label: 'Missed Bookings' },
      { key: 'impactLevel', label: 'Impact' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Service Bay Holiday Impact"
      subtitle="Holiday and downtime analysis"
      icon={<Calendar className="h-5 w-5" />}
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

export default ServiceBayHolidayImpactReport;
