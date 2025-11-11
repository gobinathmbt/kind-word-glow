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
        />
        <MetricCard
          title="Active Categories"
          value={summary.activeCategories || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Effectiveness"
          value={`${summary.avgEffectiveness || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Completion"
          value={`${summary.avgCompletion || 0}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const categoryData: PieChartData[] = data.categories?.slice(0, 10).map((item: any) => ({
      name: item.categoryName || 'Unknown',
      value: item.usageCount || 0,
    })) || [];

    const effectivenessData = data.categories?.slice(0, 10).map((category: any) => ({
      name: category.categoryName || 'Unknown',
      effectiveness: category.effectivenessScore || 0,
      completion: category.completionRate || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Categories by Usage</h4>
            <InteractivePieChart data={categoryData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Effectiveness</h4>
            <StackedBarChart
              data={effectivenessData}
              xAxisKey="name"
              series={[
                { dataKey: 'effectiveness', name: 'Effectiveness %', color: '#3b82f6' },
                { dataKey: 'completion', name: 'Completion %', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.categories && data.categories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Category Details</h4>
            <DataTable
              columns={[
                { key: 'categoryName', label: 'Category' },
                { key: 'usage', label: 'Usage' },
                { key: 'effectiveness', label: 'Effectiveness' },
                { key: 'completion', label: 'Completion' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.categories.slice(0, 20).map((category: any) => ({
                categoryName: category.categoryName || 'N/A',
                usage: category.usageCount || 0,
                effectiveness: `${category.effectivenessScore || 0}%`,
                completion: `${category.completionRate || 0}%`,
                status: category.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.categories) return null;

    const tableData = data.categories.map((category: any) => ({
      categoryName: category.categoryName || 'Unknown',
      usageCount: category.usageCount || 0,
      effectivenessScore: `${category.effectivenessScore || 0}%`,
      completionRate: `${category.completionRate || 0}%`,
      sectionCount: category.sectionCount || 0,
      fieldCount: category.fieldCount || 0,
      isActive: category.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'categoryName', label: 'Category' },
      { key: 'usageCount', label: 'Usage Count' },
      { key: 'effectivenessScore', label: 'Effectiveness' },
      { key: 'completionRate', label: 'Completion Rate' },
      { key: 'sectionCount', label: 'Sections' },
      { key: 'fieldCount', label: 'Fields' },
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
