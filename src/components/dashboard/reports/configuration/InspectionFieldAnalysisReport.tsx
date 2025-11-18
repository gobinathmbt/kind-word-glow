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

interface InspectionFieldAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const InspectionFieldAnalysisReport: React.FC<InspectionFieldAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getInspectionFieldAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection field analysis data');
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
    console.log(`Exporting inspection field analysis as ${format}`);
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
          title="Total Fields"
          value={summary.totalFields || 0}
          icon={<FileText className="h-5 w-5" />}
          subtitle={`${summary.uniqueFieldTypes || 0} unique types`}
        />
        <MetricCard
          title="Required Fields"
          value={summary.requiredFields || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${(summary.requiredPercentage || 0).toFixed(1)}% of total`}
        />
        <MetricCard
          title="Validation Coverage"
          value={`${(summary.validationCoverage || 0).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`${summary.fieldsWithValidation || 0} fields`}
        />
        <MetricCard
          title="Avg Completeness Score"
          value={summary.avgCompletenessScore || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${summary.wellConfiguredFieldsCount || 0} well configured`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const fieldTypeColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
    const usageColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];

    // Field Type Distribution
    const fieldTypeData: PieChartData[] = data.fieldTypeAnalysis?.map((item: any, index: number) => ({
      name: item.fieldType || 'Unknown',
      value: item.totalCount || 0,
      color: fieldTypeColors[index % fieldTypeColors.length],
    })) || [];

    // Field Type Analysis Bar Chart
    const fieldTypeAnalysisData = data.fieldTypeAnalysis?.map((item: any) => ({
      name: item.fieldType || 'Unknown',
      total: item.totalCount || 0,
      required: item.requiredCount || 0,
      withValidation: item.validationCount || 0,
      withImage: item.withImage || 0,
      withNotes: item.withNotes || 0,
      withDropdown: item.withDropdown || 0,
    })) || [];

    // Validation Type Usage Pie Chart
    const hasValidationData = data.validationTypeUsage && 
      Object.values(data.validationTypeUsage).some((value: any) => value > 0);
    
    const validationTypeData: PieChartData[] = hasValidationData ?
      Object.entries(data.validationTypeUsage)
        .filter(([_, value]) => (value as number) > 0)
        .map(([key, value], index) => ({
          name: key,
          value: value as number,
          color: usageColors[index % usageColors.length],
        })) : [
          { name: 'Required', value: 0, color: usageColors[0] },
          { name: 'Email', value: 0, color: usageColors[1] },
          { name: 'Phone', value: 0, color: usageColors[2] },
          { name: 'Number', value: 0, color: usageColors[3] },
          { name: 'Date', value: 0, color: usageColors[4] },
          { name: 'URL', value: 0, color: usageColors[5] },
        ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Field Type Distribution</h4>
            <InteractivePieChart data={fieldTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Validation Type Usage</h4>
            <InteractivePieChart data={validationTypeData} height={300} />
            {!hasValidationData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No validation types in use
              </p>
            )}
          </div>
        </div>

        {fieldTypeAnalysisData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Field Type Analysis</h4>
            <StackedBarChart
              data={fieldTypeAnalysisData}
              xAxisKey="name"
              series={[
                { dataKey: 'total', name: 'Total', color: '#3b82f6' },
                { dataKey: 'required', name: 'Required', color: '#ef4444' },
                { dataKey: 'withValidation', name: 'With Validation', color: '#10b981' },
                { dataKey: 'withImage', name: 'With Image', color: '#f59e0b' },
                { dataKey: 'withNotes', name: 'With Notes', color: '#8b5cf6' },
                { dataKey: 'withDropdown', name: 'With Dropdown', color: '#ec4899' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.fieldTypeAnalysis && data.fieldTypeAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Field Type Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Field Type</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Required</th>
                    <th className="px-4 py-3 text-right font-medium">With Validation</th>
                    <th className="px-4 py-3 text-right font-medium">With Image</th>
                    <th className="px-4 py-3 text-right font-medium">With Notes</th>
                    <th className="px-4 py-3 text-right font-medium">With Dropdown</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Completeness</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fieldTypeAnalysis.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.fieldType || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right">{item.totalCount || 0}</td>
                      <td className="px-4 py-3 text-right">
                        {item.requiredCount || 0} ({(item.requiredPercentage || 0).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.validationCount || 0} ({(item.validationPercentage || 0).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.withImage || 0} ({(item.imagePercentage || 0).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.withNotes || 0} ({(item.notesPercentage || 0).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.withDropdown || 0} ({(item.dropdownPercentage || 0).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3 text-right">{item.avgCompletenessScore || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{data.summary.fieldsWithImage || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Fields with Image Support</div>
              <div className="text-xs text-gray-500 mt-1">
                {(data.summary.imageUsagePercentage || 0).toFixed(1)}% of total
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{data.summary.fieldsWithNotes || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Fields with Notes Support</div>
              <div className="text-xs text-gray-500 mt-1">
                {(data.summary.notesUsagePercentage || 0).toFixed(1)}% of total
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">{data.summary.fieldsWithDropdown || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Fields with Dropdown</div>
              <div className="text-xs text-gray-500 mt-1">
                {(data.summary.dropdownUsagePercentage || 0).toFixed(1)}% of total
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.fieldTypeAnalysis) return null;

    const tableData = data.fieldTypeAnalysis.map((item: any) => ({
      fieldType: item.fieldType || 'Unknown',
      totalCount: item.totalCount || 0,
      requiredCount: item.requiredCount || 0,
      requiredPercentage: `${(item.requiredPercentage || 0).toFixed(1)}%`,
      validationCount: item.validationCount || 0,
      validationPercentage: `${(item.validationPercentage || 0).toFixed(1)}%`,
      withImage: item.withImage || 0,
      imagePercentage: `${(item.imagePercentage || 0).toFixed(1)}%`,
      withNotes: item.withNotes || 0,
      notesPercentage: `${(item.notesPercentage || 0).toFixed(1)}%`,
      withDropdown: item.withDropdown || 0,
      dropdownPercentage: `${(item.dropdownPercentage || 0).toFixed(1)}%`,
      withPlaceholder: item.withPlaceholder || 0,
      withHelpText: item.withHelpText || 0,
      avgCompletenessScore: item.avgCompletenessScore || 0,
    }));

    const columns = [
      { key: 'fieldType', label: 'Field Type' },
      { key: 'totalCount', label: 'Total' },
      { key: 'requiredCount', label: 'Required' },
      { key: 'requiredPercentage', label: 'Required %' },
      { key: 'validationCount', label: 'With Validation' },
      { key: 'validationPercentage', label: 'Validation %' },
      { key: 'withImage', label: 'With Image' },
      { key: 'imagePercentage', label: 'Image %' },
      { key: 'withNotes', label: 'With Notes' },
      { key: 'notesPercentage', label: 'Notes %' },
      { key: 'withDropdown', label: 'With Dropdown' },
      { key: 'dropdownPercentage', label: 'Dropdown %' },
      { key: 'withPlaceholder', label: 'With Placeholder' },
      { key: 'withHelpText', label: 'With Help Text' },
      { key: 'avgCompletenessScore', label: 'Avg Completeness' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Inspection Field Analysis"
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

export default InspectionFieldAnalysisReport;
