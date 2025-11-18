import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Settings, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface CostSetterEffectivenessReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const CostSetterEffectivenessReport: React.FC<CostSetterEffectivenessReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getCostSetterEffectiveness(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost setter effectiveness data');
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
    console.log(`Exporting cost setter effectiveness as ${format}`);
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
          title="Total Cost Setters"
          value={summary.totalCostSetters || 0}
          icon={<Settings className="h-5 w-5" />}
          subtitle={`${summary.uniquePurchaseTypes || 0} purchase types`}
        />
        <MetricCard
          title="Avg Utilization Rate"
          value={`${summary.avgUtilizationRate || 0}%`}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.totalEnabledCostTypes || 0} enabled cost types`}
        />
        <MetricCard
          title="Avg Effectiveness"
          value={`${summary.avgEffectivenessScore || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${summary.highEffectivenessSetters || 0} high performers`}
        />
        <MetricCard
          title="Overall Health"
          value={summary.overallHealth || 'N/A'}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`${summary.costTypeUtilizationRate || 0}% utilization`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const purchaseTypeColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const effectivenessColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const utilizationColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

    // Purchase Type Distribution
    const purchaseTypeData: PieChartData[] = data.purchaseTypeDistribution?.map((item: any, index: number) => ({
      name: item.purchaseType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      value: item.count || 0,
      color: purchaseTypeColors[index % purchaseTypeColors.length],
    })) || [];

    // Effectiveness Level Distribution
    const effectivenessLevelData: PieChartData[] = [
      { 
        name: 'High', 
        value: data.summary?.highEffectivenessSetters || 0,
        color: '#10b981'
      },
      { 
        name: 'Medium', 
        value: data.summary?.mediumEffectivenessSetters || 0,
        color: '#f59e0b'
      },
      { 
        name: 'Low', 
        value: data.summary?.lowEffectivenessSetters || 0,
        color: '#ef4444'
      },
    ].filter(item => item.value > 0);

    // Cost Setter Performance
    const costSetterPerformanceData = data.costSetters?.map((setter: any) => ({
      name: setter.vehiclePurchaseType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      utilizationRate: setter.utilizationRate || 0,
      effectivenessScore: setter.effectivenessScore || 0,
    })) || [];

    // Top Cost Types by Usage
    const topCostTypesData = data.costTypeUsage?.slice(0, 10).map((item: any) => ({
      name: item.costType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      count: item.usageCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Purchase Type Distribution</h4>
            <InteractivePieChart data={purchaseTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Effectiveness Level Distribution</h4>
            <InteractivePieChart data={effectivenessLevelData} height={300} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Setter Performance</h4>
            <StackedBarChart
              data={costSetterPerformanceData}
              xAxisKey="name"
              series={[
                { dataKey: 'utilizationRate', name: 'Utilization Rate %', color: '#3b82f6' },
                { dataKey: 'effectivenessScore', name: 'Effectiveness Score %', color: '#10b981' },
              ]}
              height={250}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Cost Types by Usage</h4>
            <StackedBarChart
              data={topCostTypesData}
              xAxisKey="name"
              series={[
                { dataKey: 'count', name: 'Usage Count', color: '#f59e0b' },
              ]}
              height={250}
            />
          </div>
        </div>

        {data.costSetters && data.costSetters.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Setter Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Purchase Type</th>
                    <th className="px-4 py-3 text-right font-medium">Enabled Cost Types</th>
                    <th className="px-4 py-3 text-right font-medium">Utilization Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Effectiveness Score</th>
                    <th className="px-4 py-3 text-center font-medium">Effectiveness Level</th>
                  </tr>
                </thead>
                <tbody>
                  {data.costSetters.map((setter: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{setter.vehiclePurchaseType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{setter.enabledCostTypeCount || 0}</td>
                      <td className="px-4 py-3 text-right">{setter.utilizationRate || 0}%</td>
                      <td className="px-4 py-3 text-right">{setter.effectivenessScore || 0}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          setter.effectivenessLevel === 'High' ? 'bg-green-100 text-green-800' :
                          setter.effectivenessLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {setter.effectivenessLevel || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.costSetters && data.costSetters.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Enabled Cost Types by Purchase Type</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.costSetters.map((setter: any, index: number) => (
                <div key={index} className="border rounded-lg p-4" style={{ borderLeftWidth: '4px', borderLeftColor: purchaseTypeColors[index % purchaseTypeColors.length] }}>
                  <div className="text-lg font-bold mb-2" style={{ color: purchaseTypeColors[index % purchaseTypeColors.length] }}>
                    {setter.vehiclePurchaseType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {setter.enabledCostTypeCount || 0} enabled cost types
                  </div>
                  {setter.enabledCostTypes && setter.enabledCostTypes.length > 0 && (
                    <div className="space-y-1">
                      {setter.enabledCostTypes.slice(0, 5).map((costType: any, ctIndex: number) => (
                        <div key={ctIndex} className="text-xs text-gray-700 flex items-center">
                          <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: purchaseTypeColors[index % purchaseTypeColors.length] }}></span>
                          {costType.costType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                          <span className="ml-auto text-gray-500">
                            ({costType.sectionType?.replace(/_/g, ' ')})
                          </span>
                        </div>
                      ))}
                      {setter.enabledCostTypes.length > 5 && (
                        <div className="text-xs text-gray-500 mt-2">
                          +{setter.enabledCostTypes.length - 5} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.costTypeUsage && data.costTypeUsage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Type Usage Analysis</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Cost Type</th>
                    <th className="px-4 py-3 text-left font-medium">Section Type</th>
                    <th className="px-4 py-3 text-right font-medium">Usage Count</th>
                    <th className="px-4 py-3 text-right font-medium">Usage Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.costTypeUsage.slice(0, 15).map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.costType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}</td>
                      <td className="px-4 py-3">{item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.usageCount || 0}</td>
                      <td className="px-4 py-3 text-right">{item.usagePercentage || 0}%</td>
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
    if (!data?.costSetters) return null;

    const tableData = data.costSetters.map((setter: any) => ({
      vehiclePurchaseType: setter.vehiclePurchaseType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      enabledCostTypeCount: setter.enabledCostTypeCount || 0,
      utilizationRate: `${setter.utilizationRate || 0}%`,
      effectivenessScore: `${setter.effectivenessScore || 0}%`,
      effectivenessLevel: setter.effectivenessLevel || 'N/A',
      createdAt: setter.createdAt ? new Date(setter.createdAt).toLocaleDateString() : 'N/A',
      updatedAt: setter.updatedAt ? new Date(setter.updatedAt).toLocaleDateString() : 'N/A',
    }));

    const columns = [
      { key: 'vehiclePurchaseType', label: 'Purchase Type' },
      { key: 'enabledCostTypeCount', label: 'Enabled Cost Types' },
      { key: 'utilizationRate', label: 'Utilization Rate' },
      { key: 'effectivenessScore', label: 'Effectiveness Score' },
      { key: 'effectivenessLevel', label: 'Effectiveness Level' },
      { key: 'createdAt', label: 'Created' },
      { key: 'updatedAt', label: 'Updated' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Cost Setter Effectiveness"
      subtitle="Configuration analysis and effectiveness metrics"
      icon={<Settings className="h-5 w-5" />}
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

export default CostSetterEffectivenessReport;
