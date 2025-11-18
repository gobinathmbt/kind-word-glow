import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Layers, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface InspectionCategoryEffectivenessReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const InspectionCategoryEffectivenessReport: React.FC<InspectionCategoryEffectivenessReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getInspectionCategoryEffectiveness(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection category effectiveness data');
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
    console.log(`Exporting inspection category effectiveness as ${format}`);
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
          title="Total Categories"
          value={summary.totalCategories || 0}
          icon={<Layers className="h-5 w-5" />}
          subtitle={`${summary.activeCategories || 0} active (${(summary.activePercentage || 0).toFixed(0)}%)`}
        />
        <MetricCard
          title="Avg Effectiveness Score"
          value={summary.avgEffectivenessScore || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={summary.overallHealth || 'N/A'}
        />
        <MetricCard
          title="Total Sections"
          value={summary.totalSections || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.totalFields || 0} fields`}
        />
        <MetricCard
          title="High Effectiveness"
          value={summary.highEffectiveness || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`${(summary.highEffectivenessPercentage || 0).toFixed(0)}% of total`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const effectivenessColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const levelColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];

    // Effectiveness Level Distribution
    const effectivenessLevelData: PieChartData[] = [
      { name: 'High', value: data.summary?.highEffectiveness || 0, color: '#10b981' },
      { name: 'Medium', value: data.summary?.mediumEffectiveness || 0, color: '#f59e0b' },
      { name: 'Low', value: data.summary?.lowEffectiveness || 0, color: '#ef4444' },
    ].filter(item => item.value > 0);

    // Category Name Distribution
    const categoryNameData: PieChartData[] = data.categoryNameAnalysis?.map((item: any, index: number) => ({
      name: item.categoryName || 'Unknown',
      value: item.count || 0,
      color: levelColors[index % levelColors.length],
    })) || [];

    // Top Categories by Effectiveness
    const topCategoriesData = data.topCategories?.map((category: any) => ({
      name: category.categoryName || 'Unknown',
      score: category.effectivenessScore || 0,
      sections: category.totalSections || 0,
      fields: category.totalFields || 0,
      calculations: category.totalCalculations || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Effectiveness Level Distribution</h4>
            {effectivenessLevelData.length > 0 ? (
              <InteractivePieChart data={effectivenessLevelData} height={300} />
            ) : (
              <div className="flex items-center justify-center h-[300px] border rounded-lg bg-gray-50">
                <div className="text-center text-gray-500">No data available</div>
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Category Name Distribution</h4>
            {categoryNameData.length > 0 ? (
              <InteractivePieChart data={categoryNameData} height={300} />
            ) : (
              <div className="flex items-center justify-center h-[300px] border rounded-lg bg-gray-50">
                <div className="text-center text-gray-500">No data available</div>
              </div>
            )}
          </div>
        </div>

        {topCategoriesData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Categories by Effectiveness</h4>
            <StackedBarChart
              data={topCategoriesData}
              xAxisKey="name"
              series={[
                { dataKey: 'score', name: 'Effectiveness Score', color: '#10b981' },
                { dataKey: 'sections', name: 'Sections', color: '#3b82f6' },
                { dataKey: 'fields', name: 'Fields', color: '#f59e0b' },
                { dataKey: 'calculations', name: 'Calculations', color: '#8b5cf6' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.categoriesNeedingImprovement && data.categoriesNeedingImprovement.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Categories Needing Improvement</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Config</th>
                    <th className="px-4 py-3 text-right font-medium">Score</th>
                    <th className="px-4 py-3 text-left font-medium">Level</th>
                    <th className="px-4 py-3 text-right font-medium">Sections</th>
                    <th className="px-4 py-3 text-right font-medium">Fields</th>
                    <th className="px-4 py-3 text-left font-medium">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoriesNeedingImprovement.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.categoryName || 'Unknown'}</td>
                      <td className="px-4 py-3">{item.configName || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${item.effectivenessLevel === 'High' ? 'bg-green-100 text-green-800' :
                            item.effectivenessLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {item.effectivenessScore || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.effectivenessLevel || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.totalSections || 0}</td>
                      <td className="px-4 py-3 text-right">{item.totalFields || 0}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">
                          {item.issues?.slice(0, 2).join(', ') || 'None'}
                          {item.issues?.length > 2 && ` +${item.issues.length - 2} more`}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.categories && data.categories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">All Categories</h4>
            <DataTable
              columns={[
                { key: 'categoryName', label: 'Category' },
                { key: 'configName', label: 'Config' },
                { key: 'score', label: 'Score' },
                { key: 'level', label: 'Level' },
                { key: 'sections', label: 'Sections' },
                { key: 'fields', label: 'Fields' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.categories.map((category: any) => ({
                categoryName: category.categoryName || 'N/A',
                configName: category.configName || 'N/A',
                score: category.effectivenessScore || 0,
                level: category.effectivenessLevel || 'N/A',
                sections: category.totalSections || 0,
                fields: category.totalFields || 0,
                status: category.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{data.summary?.totalCalculations || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Total Calculations</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.summary?.totalActiveCalculations || 0} active
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{data.summary?.collapsibleSections || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Collapsible Sections</div>
            <div className="text-xs text-gray-500 mt-1">
              {(data.summary?.collapsiblePercentage || 0).toFixed(0)}% of total
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {(data.summary?.avgFieldsPerCategory || 0).toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Avg Fields per Category</div>
            <div className="text-xs text-gray-500 mt-1">
              {(data.summary?.avgSectionsPerCategory || 0).toFixed(1)} sections avg
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.categories) return null;

    const tableData = data.categories.map((category: any) => ({
      categoryName: category.categoryName || 'Unknown',
      configName: category.configName || 'N/A',
      effectivenessScore: category.effectivenessScore || 0,
      effectivenessLevel: category.effectivenessLevel || 'N/A',
      totalSections: category.totalSections || 0,
      totalFields: category.totalFields || 0,
      requiredFields: category.requiredFields || 0,
      requiredPercentage: `${(category.requiredFieldsPercentage || 0).toFixed(1)}%`,
      validationCoverage: `${(category.validationCoverage || 0).toFixed(1)}%`,
      totalCalculations: category.totalCalculations || 0,
      activeCalculations: category.activeCalculations || 0,
      collapsibleSections: category.collapsibleSections || 0,
      avgFieldsPerSection: (category.avgFieldsPerSection || 0).toFixed(1),
      hasMasterDropdown: category.hasMasterDropdown ? 'Yes' : 'No',
      status: category.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'categoryName', label: 'Category' },
      { key: 'configName', label: 'Config' },
      { key: 'effectivenessScore', label: 'Score' },
      { key: 'effectivenessLevel', label: 'Level' },
      { key: 'totalSections', label: 'Sections' },
      { key: 'totalFields', label: 'Fields' },
      { key: 'requiredFields', label: 'Required' },
      { key: 'requiredPercentage', label: 'Required %' },
      { key: 'validationCoverage', label: 'Validation %' },
      { key: 'totalCalculations', label: 'Calculations' },
      { key: 'activeCalculations', label: 'Active Calc' },
      { key: 'collapsibleSections', label: 'Collapsible' },
      { key: 'avgFieldsPerSection', label: 'Avg Fields/Section' },
      { key: 'hasMasterDropdown', label: 'Master Dropdown' },
      { key: 'status', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Inspection Category Effectiveness"
      subtitle="Category performance and effectiveness metrics"
      icon={<Layers className="h-5 w-5" />}
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

export default InspectionCategoryEffectivenessReport;
