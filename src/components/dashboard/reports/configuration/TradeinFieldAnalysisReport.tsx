import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { FileText, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface TradeinFieldAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const TradeinFieldAnalysisReport: React.FC<TradeinFieldAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getTradeinFieldAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trade-in field analysis data');
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
    console.log(`Exporting trade-in field analysis as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    
    // Find most used field type from fieldTypeAnalysis
    const fieldTypeAnalysis = data.fieldTypeAnalysis || [];
    const mostUsedType = fieldTypeAnalysis.length > 0
      ? fieldTypeAnalysis.reduce((max: any, item: any) => 
          (item.totalCount > (max.totalCount || 0) ? item : max), fieldTypeAnalysis[0])
      : null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Fields"
          value={summary.totalFields || 0}
          icon={<FileText className="h-5 w-5" />}
          subtitle={`${summary.uniqueFieldTypes || 0} unique types`}
        />
        <MetricCard
          title="Required Fields"
          value={summary.requiredFields || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.requiredPercentage || 0}% of total`}
        />
        <MetricCard
          title="Avg Completeness Score"
          value={`${summary.avgCompletenessScore || 0}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Used Field Type"
          value={mostUsedType?.fieldType || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={mostUsedType ? `${mostUsedType.totalCount} fields` : ''}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const fieldTypeColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
    const completenessColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];

    const fieldTypeAnalysis = data.fieldTypeAnalysis || [];
    const hasFieldTypeData = fieldTypeAnalysis.length > 0;
    
    const fieldTypeData: PieChartData[] = hasFieldTypeData
      ? fieldTypeAnalysis.map((item: any, index: number) => ({
          name: item.fieldType || 'Unknown',
          value: item.totalCount || 0,
          color: fieldTypeColors[index % fieldTypeColors.length],
        }))
      : [
          { name: 'Text', value: 0, color: fieldTypeColors[0] },
          { name: 'Number', value: 0, color: fieldTypeColors[1] },
          { name: 'Dropdown', value: 0, color: fieldTypeColors[2] },
          { name: 'Date', value: 0, color: fieldTypeColors[3] },
          { name: 'Checkbox', value: 0, color: fieldTypeColors[4] },
        ];

    const wellConfiguredFields = data.wellConfiguredFields || [];
    const completionData = wellConfiguredFields.slice(0, 10).map((field: any, index: number) => ({
      name: field.fieldName || 'Unknown',
      value: field.completenessScore || 0,
      label: `${field.completenessScore || 0}%`,
      color: completenessColors[index % completenessColors.length],
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Fields by Type</h4>
            <InteractivePieChart data={fieldTypeData} height={300} />
            {!hasFieldTypeData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No field type data available
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Well-Configured Fields</h4>
            <StackedBarChart
              data={wellConfiguredFields.slice(0, 10).map((field: any) => ({
                name: field.fieldName || 'Unknown',
                completeness: field.completenessScore || 0,
              }))}
              xAxisKey="name"
              series={[
                { dataKey: 'completeness', name: 'Completeness Score', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {fieldTypeAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Field Type Analysis</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Field Type</th>
                    <th className="px-4 py-3 text-right font-medium">Total Count</th>
                    <th className="px-4 py-3 text-right font-medium">Required %</th>
                    <th className="px-4 py-3 text-right font-medium">With Image %</th>
                    <th className="px-4 py-3 text-right font-medium">With Notes %</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Completeness</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldTypeAnalysis.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.fieldType || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right">{item.totalCount || 0}</td>
                      <td className="px-4 py-3 text-right">{item.requiredPercentage || 0}%</td>
                      <td className="px-4 py-3 text-right">{item.imagePercentage || 0}%</td>
                      <td className="px-4 py-3 text-right">{item.notesPercentage || 0}%</td>
                      <td className="px-4 py-3 text-right">{item.avgCompletenessScore || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.poorlyConfiguredFields && data.poorlyConfiguredFields.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Poorly Configured Fields</h4>
            <DataTable
              columns={[
                { key: 'fieldName', label: 'Field Name' },
                { key: 'fieldType', label: 'Type' },
                { key: 'configName', label: 'Config' },
                { key: 'completenessScore', label: 'Score' },
                { key: 'missingFeatures', label: 'Missing Features' },
              ]}
              data={data.poorlyConfiguredFields.map((field: any) => ({
                fieldName: field.fieldName || 'N/A',
                fieldType: field.fieldType || 'N/A',
                configName: field.configName || 'N/A',
                completenessScore: `${field.completenessScore || 0}%`,
                missingFeatures: field.missingFeatures?.join(', ') || 'N/A',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    const wellConfiguredFields = data?.wellConfiguredFields || [];
    const poorlyConfiguredFields = data?.poorlyConfiguredFields || [];
    const allFields = [...wellConfiguredFields, ...poorlyConfiguredFields];
    
    if (allFields.length === 0) return null;

    const tableData = allFields.map((field: any) => ({
      fieldName: field.fieldName || 'Unknown',
      fieldType: field.fieldType || 'Unknown',
      configName: field.configName || 'N/A',
      categoryName: field.categoryName || 'N/A',
      sectionName: field.sectionName || 'N/A',
      completenessScore: `${field.completenessScore || 0}%`,
      missingFeatures: field.missingFeatures?.length || 0,
    }));

    const columns = [
      { key: 'fieldName', label: 'Field Name' },
      { key: 'fieldType', label: 'Type' },
      { key: 'configName', label: 'Configuration' },
      { key: 'categoryName', label: 'Category' },
      { key: 'sectionName', label: 'Section' },
      { key: 'completenessScore', label: 'Completeness Score' },
      { key: 'missingFeatures', label: 'Missing Features' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Trade-in Field Analysis"
      subtitle="Field completion rates and usage patterns"
      icon={<FileText className="h-5 w-5" />}
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

export default TradeinFieldAnalysisReport;
