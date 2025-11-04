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
}

export const InspectionFieldAnalysisReport: React.FC<InspectionFieldAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getInspectionFieldAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection field analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

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
        />
        <MetricCard
          title="Active Fields"
          value={summary.activeFields || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Completion Rate"
          value={`${summary.avgCompletionRate || 0}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Used Field Type"
          value={summary.mostUsedFieldType || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const fieldTypeData: PieChartData[] = data.fieldsByType?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const completionData = data.fields?.slice(0, 10).map((field: any) => ({
      name: field.fieldName || 'Unknown',
      completionRate: field.completionRate || 0,
      usage: field.usageCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Fields by Type</h4>
            <InteractivePieChart data={fieldTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Completion Rate</h4>
            <StackedBarChart
              data={completionData}
              xAxisKey="name"
              series={[
                { dataKey: 'completionRate', name: 'Completion %', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.fields && data.fields.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Field Details</h4>
            <DataTable
              columns={[
                { key: 'fieldName', label: 'Field Name' },
                { key: 'fieldType', label: 'Type' },
                { key: 'usage', label: 'Usage' },
                { key: 'completion', label: 'Completion' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.fields.slice(0, 20).map((field: any) => ({
                fieldName: field.fieldName || 'N/A',
                fieldType: field.fieldType || 'N/A',
                usage: field.usageCount || 0,
                completion: `${field.completionRate || 0}%`,
                status: field.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.fields) return null;

    const tableData = data.fields.map((field: any) => ({
      fieldName: field.fieldName || 'Unknown',
      fieldType: field.fieldType || 'Unknown',
      usageCount: field.usageCount || 0,
      completionRate: `${field.completionRate || 0}%`,
      avgValue: field.avgValue || 'N/A',
      isActive: field.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'fieldName', label: 'Field Name' },
      { key: 'fieldType', label: 'Type' },
      { key: 'usageCount', label: 'Usage Count' },
      { key: 'completionRate', label: 'Completion Rate' },
      { key: 'avgValue', label: 'Avg Value' },
      { key: 'isActive', label: 'Status' },
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
