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
  shouldLoad?: boolean;
}

export const WorkshopQualityMetricsReport: React.FC<WorkshopQualityMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopQualityMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop quality metrics data');
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
          subtitle={`${metrics.totalReports || 0} total reports`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Visual Inspection"
          value={`${((metrics.avgVisualPassed || 0) * 100).toFixed(1)}%`}
          subtitle={`${metrics.totalVisualPassed || 0} passed`}
          icon={<Eye className="h-5 w-5" />}
        />
        <MetricCard
          title="Functional Test"
          value={`${((metrics.avgFunctionalPassed || 0) * 100).toFixed(1)}%`}
          subtitle={`${metrics.totalFunctionalPassed || 0} passed`}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Road Test"
          value={`${((metrics.avgRoadPassed || 0) * 100).toFixed(1)}%`}
          subtitle={`${metrics.totalRoadPassed || 0} passed`}
          icon={<Car className="h-5 w-5" />}
        />
        <MetricCard
          title="Safety Check"
          value={`${((metrics.avgSafetyPassed || 0) * 100).toFixed(1)}%`}
          subtitle={`${metrics.totalSafetyPassed || 0} passed`}
          icon={<Shield className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const qualityColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const distributionColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const qualityCheckData: PieChartData[] = data.overallQualityMetrics ? [
      { 
        name: 'Visual Inspection', 
        value: (data.overallQualityMetrics.avgVisualPassed || 0) * 100,
        color: qualityColors[0]
      },
      { 
        name: 'Functional Test', 
        value: (data.overallQualityMetrics.avgFunctionalPassed || 0) * 100,
        color: qualityColors[1]
      },
      { 
        name: 'Road Test', 
        value: (data.overallQualityMetrics.avgRoadPassed || 0) * 100,
        color: qualityColors[2]
      },
      { 
        name: 'Safety Check', 
        value: (data.overallQualityMetrics.avgSafetyPassed || 0) * 100,
        color: qualityColors[3]
      },
    ] : [];

    const qualityByVehicleTypeData = data.qualityByVehicleType?.map((item: any) => ({
      vehicleType: item.vehicleType || item._id || 'Unknown',
      visual: (item.avgVisualPassed || 0) * 100,
      functional: (item.avgFunctionalPassed || 0) * 100,
      road: (item.avgRoadPassed || 0) * 100,
      safety: (item.avgSafetyPassed || 0) * 100,
      overall: (item.overallQualityScore || 0) * 100,
    })) || [];

    const qualityByReportTypeData = data.qualityByReportType?.map((item: any) => ({
      reportType: item.reportType || item._id || 'Unknown',
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

    const qualityScoreDistribution = data.qualityScoreDistribution?.map((item: any, index: number) => ({
      range: typeof item._id === 'string' ? item._id : `${(item._id * 100).toFixed(0)}%`,
      count: item.count || 0,
      vehicles: item.vehicles || [],
      color: distributionColors[index % distributionColors.length],
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
              data={qualityScoreDistribution.map((item, index) => ({
                name: item.range,
                value: item.count,
                color: item.color,
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

        {qualityByReportTypeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Metrics by Report Type</h4>
            <StackedBarChart
              data={qualityByReportTypeData}
              xAxisKey="reportType"
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

        {data.workEntryQualityAnalysis && (
          <div>
            <h4 className="text-sm font-medium mb-4">Work Entry Quality Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{data.workEntryQualityAnalysis.totalWorkEntries || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Total Work Entries</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{data.workEntryQualityAnalysis.visualInspectionPassed || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Visual Passed</div>
                <div className="text-xs text-gray-500 mt-1">{(data.workEntryQualityAnalysis.visualPassRate || 0).toFixed(1)}%</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{data.workEntryQualityAnalysis.functionalTestPassed || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Functional Passed</div>
                <div className="text-xs text-gray-500 mt-1">{(data.workEntryQualityAnalysis.functionalPassRate || 0).toFixed(1)}%</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{data.workEntryQualityAnalysis.roadTestPassed || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Road Passed</div>
                <div className="text-xs text-gray-500 mt-1">{(data.workEntryQualityAnalysis.roadPassRate || 0).toFixed(1)}%</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{data.workEntryQualityAnalysis.safetyCheckPassed || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Safety Passed</div>
                <div className="text-xs text-gray-500 mt-1">{(data.workEntryQualityAnalysis.safetyPassRate || 0).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        {data.qualityIssues && data.qualityIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Issues (Low Scores)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Stock ID</th>
                    <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Visual</th>
                    <th className="px-4 py-3 text-right font-medium">Functional</th>
                    <th className="px-4 py-3 text-right font-medium">Road</th>
                    <th className="px-4 py-3 text-right font-medium">Safety</th>
                    <th className="px-4 py-3 text-right font-medium">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {data.qualityIssues.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.vehicle_stock_id || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {item.vehicle_details?.name || 
                         `${item.vehicle_details?.year || ''} ${item.vehicle_details?.make || ''} ${item.vehicle_details?.model || ''}`.trim() || 
                         'N/A'}
                      </td>
                      <td className="px-4 py-3">{item.vehicle_type || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{((item.visualPassed || 0) * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right">{((item.functionalPassed || 0) * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right">{((item.roadPassed || 0) * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right">{((item.safetyPassed || 0) * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right">{((item.overallQualityScore || 0) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    // Combine data from multiple sources for comprehensive table view
    const vehicleTypeData = data.qualityByVehicleType?.map((item: any) => ({
      category: 'Vehicle Type',
      type: item.vehicleType || item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      visual: `${((item.avgVisualPassed || 0) * 100).toFixed(1)}%`,
      functional: `${((item.avgFunctionalPassed || 0) * 100).toFixed(1)}%`,
      road: `${((item.avgRoadPassed || 0) * 100).toFixed(1)}%`,
      safety: `${((item.avgSafetyPassed || 0) * 100).toFixed(1)}%`,
      overall: `${((item.overallQualityScore || 0) * 100).toFixed(1)}%`,
    })) || [];

    const reportTypeData = data.qualityByReportType?.map((item: any) => ({
      category: 'Report Type',
      type: item.reportType || item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      visual: `${((item.avgVisualPassed || 0) * 100).toFixed(1)}%`,
      functional: `${((item.avgFunctionalPassed || 0) * 100).toFixed(1)}%`,
      road: `${((item.avgRoadPassed || 0) * 100).toFixed(1)}%`,
      safety: `${((item.avgSafetyPassed || 0) * 100).toFixed(1)}%`,
      overall: `${((item.overallQualityScore || 0) * 100).toFixed(1)}%`,
    })) || [];

    const tableData = [...vehicleTypeData, ...reportTypeData];

    const columns = [
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'Type' },
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
