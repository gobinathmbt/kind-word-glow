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

interface TradeinCategoryEffectivenessReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const TradeinCategoryEffectivenessReport: React.FC<TradeinCategoryEffectivenessReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getTradeinCategoryEffectiveness(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trade-in category effectiveness data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting trade-in category effectiveness as ${format}`);
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
          subtitle={`${summary.uniqueCategoryNames || 0} unique names`}
        />
        <MetricCard
          title="Active Categories"
          value={summary.activeCategories || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.activePercentage || 0}% active`}
        />
        <MetricCard
          title="Avg Effectiveness"
          value={`${summary.avgEffectivenessScore || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={summary.overallHealth || 'N/A'}
        />
        <MetricCard
          title="High Effectiveness"
          value={summary.highEffectiveness || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`${summary.highEffectivenessPercentage || 0}% of total`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const effectivenessColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const levelColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    const topCategories = data.topCategories || [];
    const categoriesNeedingImprovement = data.categoriesNeedingImprovement || [];

    // Effectiveness level distribution for pie chart
    const effectivenessLevelMap = new Map<string, number>();
    const categories = data.categories || [];
    categories.forEach((cat: any) => {
      const level = cat.effectivenessLevel || 'Unknown';
      effectivenessLevelMap.set(level, (effectivenessLevelMap.get(level) || 0) + 1);
    });

    const hasLevelData = effectivenessLevelMap.size > 0;
    
    const levelData: PieChartData[] = hasLevelData
      ? Array.from(effectivenessLevelMap.entries()).map(([name, value], index) => ({
          name,
          value,
          color: levelColors[index % levelColors.length],
        }))
      : [
          { name: 'High', value: 0, color: levelColors[0] },
          { name: 'Medium', value: 0, color: levelColors[1] },
          { name: 'Low', value: 0, color: levelColors[2] },
          { name: 'Poor', value: 0, color: levelColors[3] },
        ];

    const effectivenessData = topCategories.slice(0, 10).map((category: any, index: number) => ({
      name: category.categoryName || 'Unknown',
      value: category.effectivenessScore || 0,
      label: `${category.effectivenessScore || 0}%`,
      color: effectivenessColors[index % effectivenessColors.length],
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Effectiveness Level Distribution</h4>
            <InteractivePieChart data={levelData} height={300} />
            {!hasLevelData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No effectiveness data available
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Categories by Effectiveness</h4>
            <StackedBarChart
              data={topCategories.slice(0, 10).map((category: any) => ({
                name: category.categoryName || 'Unknown',
                effectiveness: category.effectivenessScore || 0,
              }))}
              xAxisKey="name"
              series={[
                { dataKey: 'effectiveness', name: 'Effectiveness Score', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {topCategories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Performing Categories</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Config</th>
                    <th className="px-4 py-3 text-right font-medium">Effectiveness</th>
                    <th className="px-4 py-3 text-left font-medium">Level</th>
                    <th className="px-4 py-3 text-right font-medium">Sections</th>
                    <th className="px-4 py-3 text-right font-medium">Fields</th>
                    <th className="px-4 py-3 text-right font-medium">Calculations</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategories.map((category: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{category.categoryName || 'Unknown'}</td>
                      <td className="px-4 py-3">{category.configName || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{category.effectivenessScore || 0}%</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${category.effectivenessLevel === 'High' ? 'bg-green-100 text-green-800' :
                            category.effectivenessLevel === 'Medium' ? 'bg-blue-100 text-blue-800' :
                              'bg-orange-100 text-orange-800'
                          }`}>
                          {category.effectivenessLevel || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{category.totalSections || 0}</td>
                      <td className="px-4 py-3 text-right">{category.totalFields || 0}</td>
                      <td className="px-4 py-3 text-right">{category.totalCalculations || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {categoriesNeedingImprovement.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Categories Needing Improvement</h4>
            <DataTable
              columns={[
                { key: 'categoryName', label: 'Category' },
                { key: 'configName', label: 'Config' },
                { key: 'effectivenessScore', label: 'Score' },
                { key: 'level', label: 'Level' },
                { key: 'sections', label: 'Sections' },
                { key: 'fields', label: 'Fields' },
                { key: 'issues', label: 'Issues' },
              ]}
              data={categoriesNeedingImprovement.map((category: any) => ({
                categoryName: category.categoryName || 'N/A',
                configName: category.configName || 'N/A',
                effectivenessScore: `${category.effectivenessScore || 0}%`,
                level: category.effectivenessLevel || 'N/A',
                sections: category.totalSections || 0,
                fields: category.totalFields || 0,
                issues: category.issues?.join(', ') || 'N/A',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    const categories = data?.categories || [];
    if (categories.length === 0) return null;

    const tableData = categories.map((category: any) => ({
      categoryName: category.categoryName || 'Unknown',
      configName: category.configName || 'N/A',
      effectivenessScore: `${category.effectivenessScore || 0}%`,
      effectivenessLevel: category.effectivenessLevel || 'N/A',
      totalSections: category.totalSections || 0,
      totalFields: category.totalFields || 0,
      requiredFields: category.requiredFields || 0,
      totalCalculations: category.totalCalculations || 0,
      isActive: category.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'categoryName', label: 'Category' },
      { key: 'configName', label: 'Configuration' },
      { key: 'effectivenessScore', label: 'Effectiveness' },
      { key: 'effectivenessLevel', label: 'Level' },
      { key: 'totalSections', label: 'Sections' },
      { key: 'totalFields', label: 'Fields' },
      { key: 'requiredFields', label: 'Required' },
      { key: 'totalCalculations', label: 'Calculations' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Trade-in Category Effectiveness"
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

export default TradeinCategoryEffectivenessReport;
