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
import { CheckCircle, Eye, Wrench, Car, Shield } from 'lucide-react';

interface WorkshopQualityMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const WorkshopQualityMetricsReport: React.FC<WorkshopQualityMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopQualityMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop quality metrics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting workshop quality metrics as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.overallQualityMetrics) return null;
    const metrics = data.overallQualityMetrics;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Overall Quality Score"
          value={`${((metrics.overallQualityScore || 0) * 100).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Visual Inspection"
          value={`${((metrics.avgVisualPassed || 0) * 100).toFixed(1)}%`}
          icon={<Eye className="h-5 w-5" />}
        />
        <MetricCard
          title="Functional Test"
          value={`${((metrics.avgFunctionalPassed || 0) * 100).toFixed(1)}%`}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Road Test"
          value={`${((metrics.avgRoadPassed || 0) * 100).toFixed(1)}%`}
          icon={<Car className="h-5 w-5" />}
        />
        <MetricCard
          title="Safety Check"
          value={`${((metrics.avgSafetyPassed || 0) * 100).toFixed(1)}%`}
          icon={<Shield className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const qualityCheckData: PieChartData[] = data.overallQualityMetrics ? [
      { name: 'Visual Inspection', value: (data.overallQualityMetrics.avgVisualPassed || 0) * 100 },
      { name: 'Functional Test', value: (data.overallQualityMetrics.avgFunctionalPassed || 0) * 100 },
      { name: 'Road Test', value: (data.overallQualityMetrics.avgRoadPassed || 0) * 100 },
      { name: 'Safety Check', value: (data.overallQualityMetrics.avgSafetyPassed || 0) * 100 },
    ] : [];

    const qualityByVehicleTypeData = data.qualityByVehicleType?.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      visual: (item.avgVisualPassed || 0) * 100,
      functional: (item.avgFunctionalPassed || 0) * 100,
      road: (item.avgRoadPassed || 0) * 100,
      safety: (item.avgSafetyPassed || 0) * 100,
      overall: (item.overallQualityScore || 0) * 100,
    })) || [];

    const monthlyQualityTrends = data.monthlyQualityTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      visual: (item.avgVisualPassed || 0) * 100,
      functional: (item.avgFunctionalPassed || 0) * 100,
      road: (item.avgRoadPassed || 0) * 100,
      safety: (item.avgSafetyPassed || 0) * 100,
      overall: (item.overallQualityScore || 0) * 100,
    })) || [];

    const qualityScoreDistribution = data.qualityScoreDistribution?.map((item: any) => ({
      range: typeof item._id === 'string' ? item._id : `${(item._id * 100).toFixed(0)}%`,
      count: item.count || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Check Pass Rates</h4>
            <InteractivePieChart data={qualityCheckData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Score Distribution</h4>
            <InteractivePieChart 
              data={qualityScoreDistribution.map(item => ({
                name: item.range,
                value: item.count,
              }))} 
              height={300} 
            />
          </div>
        </div>

        {qualityByVehicleTypeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Metrics by Vehicle Type</h4>
            <StackedBarChart
              data={qualityByVehicleTypeData}
              xAxisKey="vehicleType"
              series={[
                { dataKey: 'visual', name: 'Visual', color: '#3b82f6' },
                { dataKey: 'functional', name: 'Functional', color: '#10b981' },
                { dataKey: 'road', name: 'Road', color: '#f59e0b' },
                { dataKey: 'safety', name: 'Safety', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        )}

        {monthlyQualityTrends.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Quality Trends</h4>
            <LineChart
              data={monthlyQualityTrends}
              xAxisKey="month"
              lines={[
                { dataKey: 'overall', name: 'Overall Quality', color: '#8b5cf6' },
                { dataKey: 'visual', name: 'Visual', color: '#3b82f6' },
                { dataKey: 'functional', name: 'Functional', color: '#10b981' },
                { dataKey: 'road', name: 'Road', color: '#f59e0b' },
                { dataKey: 'safety', name: 'Safety', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.qualityIssues && data.qualityIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Issues (Low Scores)</h4>
            <DataTable
              columns={[
                { key: 'vehicle_stock_id', label: 'Stock ID' },
                { key: 'vehicle_type', label: 'Type' },
                { key: 'visual', label: 'Visual' },
                { key: 'functional', label: 'Functional' },
                { key: 'road', label: 'Road' },
                { key: 'safety', label: 'Safety' },
                { key: 'overall', label: 'Overall' },
              ]}
              data={data.qualityIssues.map((item: any) => ({
                vehicle_stock_id: item.vehicle_stock_id || 'N/A',
                vehicle_type: item.vehicle_type || 'N/A',
                visual: `${((item.visualPassed || 0) * 100).toFixed(0)}%`,
                functional: `${((item.functionalPassed || 0) * 100).toFixed(0)}%`,
                road: `${((item.roadPassed || 0) * 100).toFixed(0)}%`,
                safety: `${((item.safetyPassed || 0) * 100).toFixed(0)}%`,
                overall: `${((item.overallQualityScore || 0) * 100).toFixed(0)}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.qualityByVehicleType) return null;

    const tableData = data.qualityByVehicleType.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      visual: `${((item.avgVisualPassed || 0) * 100).toFixed(1)}%`,
      functional: `${((item.avgFunctionalPassed || 0) * 100).toFixed(1)}%`,
      road: `${((item.avgRoadPassed || 0) * 100).toFixed(1)}%`,
      safety: `${((item.avgSafetyPassed || 0) * 100).toFixed(1)}%`,
      overall: `${((item.overallQualityScore || 0) * 100).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'reportCount', label: 'Reports' },
      { key: 'visual', label: 'Visual' },
      { key: 'functional', label: 'Functional' },
      { key: 'road', label: 'Road' },
      { key: 'safety', label: 'Safety' },
      { key: 'overall', label: 'Overall' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Quality Metrics"
      subtitle="Quality check pass rates and performance analysis"
      icon={<CheckCircle className="h-5 w-5" />}
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

export default WorkshopQualityMetricsReport;
