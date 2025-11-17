import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { ClipboardCheck, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface InspectionConfigUsageReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const InspectionConfigUsageReport: React.FC<InspectionConfigUsageReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getInspectionConfigUsage(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection config usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting inspection config usage as ${format}`);
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
          title="Total Configurations"
          value={summary.totalConfigs || 0}
          icon={<ClipboardCheck className="h-5 w-5" />}
          subtitle={`${summary.activeConfigs || 0} active`}
        />
        <MetricCard
          title="Total Categories"
          value={summary.totalCategories || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.totalSections || 0} sections`}
        />
        <MetricCard
          title="Total Fields"
          value={summary.totalFields || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`Avg ${(summary.avgFieldsPerConfig || 0).toFixed(1)} per config`}
        />
        <MetricCard
          title="Avg Config Score"
          value={summary.avgConfigScore || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={summary.overallHealth || 'N/A'}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const versionColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
    const fieldTypeColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];

    // Version Distribution Pie Chart
    const versionData: PieChartData[] = data.versionDistribution?.map((item: any, index: number) => ({
      name: `Version ${item.version}`,
      value: item.count || 0,
      color: versionColors[index % versionColors.length],
    })) || [];

    // Field Type Usage Pie Chart
    const fieldTypeData: PieChartData[] = data.globalFieldTypeUsage?.map((item: any, index: number) => ({
      name: item.fieldType || 'Unknown',
      value: item.count || 0,
      color: fieldTypeColors[index % fieldTypeColors.length],
    })) || [];

    // Top Configs Bar Chart
    const topConfigsData = data.topConfigs?.map((config: any) => ({
      name: config.configName || 'Unknown',
      categories: config.totalCategories || 0,
      sections: config.totalSections || 0,
      fields: config.totalFields || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Version Distribution</h4>
            <InteractivePieChart data={versionData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Field Type Usage</h4>
            <InteractivePieChart data={fieldTypeData} height={300} />
          </div>
        </div>

        {topConfigsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Configurations</h4>
            <StackedBarChart
              data={topConfigsData}
              xAxisKey="name"
              series={[
                { dataKey: 'categories', name: 'Categories', color: '#10b981' },
                { dataKey: 'sections', name: 'Sections', color: '#3b82f6' },
                { dataKey: 'fields', name: 'Fields', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.dealershipDistribution && data.dealershipDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Dealership Distribution</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Dealership</th>
                    <th className="px-4 py-3 text-right font-medium">Total Configs</th>
                    <th className="px-4 py-3 text-right font-medium">Active Configs</th>
                    <th className="px-4 py-3 text-right font-medium">Default Configs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dealershipDistribution.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.dealershipId === 'company_wide' ? 'Company Wide' : item.dealershipId}</td>
                      <td className="px-4 py-3 text-right">{item.count || 0}</td>
                      <td className="px-4 py-3 text-right">{item.activeCount || 0}</td>
                      <td className="px-4 py-3 text-right">{item.defaultCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.configs && data.configs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Configuration Details</h4>
            <DataTable
              columns={[
                { key: 'configName', label: 'Configuration' },
                { key: 'version', label: 'Version' },
                { key: 'categories', label: 'Categories' },
                { key: 'sections', label: 'Sections' },
                { key: 'fields', label: 'Fields' },
                { key: 'score', label: 'Score' },
                { key: 'health', label: 'Health' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.configs.map((config: any) => ({
                configName: config.configName || 'N/A',
                version: config.version || 'N/A',
                categories: config.totalCategories || 0,
                sections: config.totalSections || 0,
                fields: config.totalFields || 0,
                score: config.configScore || 0,
                health: config.configHealth || 'N/A',
                status: config.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.configs) return null;

    const tableData = data.configs.map((config: any) => ({
      configName: config.configName || 'Unknown',
      version: config.version || 'N/A',
      description: config.description || 'N/A',
      dealership: config.dealershipId || 'Company Wide',
      categories: config.totalCategories || 0,
      sections: config.totalSections || 0,
      fields: config.totalFields || 0,
      requiredFields: config.requiredFieldsCount || 0,
      imageFields: config.fieldsWithImageCount || 0,
      score: config.configScore || 0,
      health: config.configHealth || 'N/A',
      avgFieldsPerSection: (config.avgFieldsPerSection || 0).toFixed(1),
      avgSectionsPerCategory: (config.avgSectionsPerCategory || 0).toFixed(1),
      status: config.isActive ? 'Active' : 'Inactive',
      createdBy: config.createdBy?.name || 'N/A',
      createdAt: config.createdAt ? new Date(config.createdAt).toLocaleDateString() : 'N/A',
    }));

    const columns = [
      { key: 'configName', label: 'Configuration' },
      { key: 'version', label: 'Version' },
      { key: 'dealership', label: 'Dealership' },
      { key: 'categories', label: 'Categories' },
      { key: 'sections', label: 'Sections' },
      { key: 'fields', label: 'Fields' },
      { key: 'requiredFields', label: 'Required' },
      { key: 'imageFields', label: 'Image Fields' },
      { key: 'avgFieldsPerSection', label: 'Avg Fields/Section' },
      { key: 'avgSectionsPerCategory', label: 'Avg Sections/Category' },
      { key: 'score', label: 'Score' },
      { key: 'health', label: 'Health' },
      { key: 'status', label: 'Status' },
      { key: 'createdBy', label: 'Created By' },
      { key: 'createdAt', label: 'Created At' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Inspection Config Usage"
      subtitle="Configuration usage patterns and metrics"
      icon={<ClipboardCheck className="h-5 w-5" />}
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

export default InspectionConfigUsageReport;
