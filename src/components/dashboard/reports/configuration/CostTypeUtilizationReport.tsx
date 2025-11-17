import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign, TrendingUp, Activity, Layers } from 'lucide-react';

interface CostTypeUtilizationReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const CostTypeUtilizationReport: React.FC<CostTypeUtilizationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getCostTypeUtilization(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost type utilization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting cost type utilization as ${format}`);
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
          title="Total Cost Types"
          value={summary.totalCostTypes || 0}
          icon={<Layers className="h-5 w-5" />}
          subtitle={`${summary.uniqueSectionTypes || 0} section types`}
        />
        <MetricCard
          title="Currency Enabled"
          value={`${summary.changeCurrencyPercentage || 0}%`}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.changeCurrencyEnabled || 0} of ${summary.totalCostTypes || 0}`}
        />
        <MetricCard
          title="With Default Value"
          value={`${summary.defaultValuePercentage || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${summary.withDefaultValue || 0} cost types`}
        />
        <MetricCard
          title="Configuration Score"
          value={`${summary.configurationCompleteness || 0}%`}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const sectionColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const taxTypeColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const taxRateColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

    // Section Type Distribution
    const sectionTypeData: PieChartData[] = data.sectionTypeAnalysis?.map((item: any, index: number) => ({
      name: item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      value: item.count || 0,
      color: sectionColors[index % sectionColors.length],
    })) || [];

    // Tax Type Distribution
    const taxTypeData: PieChartData[] = data.taxTypeDistribution?.map((item: any, index: number) => ({
      name: item.taxType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      value: item.count || 0,
      color: taxTypeColors[index % taxTypeColors.length],
    })) || [];

    // Tax Rate Distribution for bar chart
    const taxRateChartData = data.taxRateDistribution?.map((item: any) => ({
      name: `${item.taxRate}%`,
      count: item.count || 0,
    })) || [];

    // Section Type Analysis for stacked bar
    const sectionAnalysisData = data.sectionTypeAnalysis?.map((item: any) => ({
      name: item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      count: item.count || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Types by Section</h4>
            <InteractivePieChart data={sectionTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Tax Type Distribution</h4>
            <InteractivePieChart data={taxTypeData} height={300} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Section Type Count</h4>
            <StackedBarChart
              data={sectionAnalysisData}
              xAxisKey="name"
              series={[
                { dataKey: 'count', name: 'Cost Types', color: '#3b82f6' },
              ]}
              height={250}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Tax Rate Distribution</h4>
            <StackedBarChart
              data={taxRateChartData}
              xAxisKey="name"
              series={[
                { dataKey: 'count', name: 'Count', color: '#10b981' },
              ]}
              height={250}
            />
          </div>
        </div>

        {data.topCostTypes && data.topCostTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Cost Types</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Cost Type</th>
                    <th className="px-4 py-3 text-left font-medium">Section</th>
                    <th className="px-4 py-3 text-right font-medium">Tax Rate</th>
                    <th className="px-4 py-3 text-left font-medium">Tax Type</th>
                    <th className="px-4 py-3 text-center font-medium">Currency Change</th>
                    <th className="px-4 py-3 text-center font-medium">Default Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCostTypes.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.costType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3">{item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.defaultTaxRate}%</td>
                      <td className="px-4 py-3">{item.defaultTaxType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${item.changeCurrency ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.changeCurrency ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${item.hasDefaultValue ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.hasDefaultValue ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.sectionTypeAnalysis && data.sectionTypeAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Section Type Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.sectionTypeAnalysis.map((section: any, index: number) => (
                <div key={index} className="border rounded-lg p-4" style={{ borderLeftWidth: '4px', borderLeftColor: sectionColors[index % sectionColors.length] }}>
                  <div className="text-2xl font-bold" style={{ color: sectionColors[index % sectionColors.length] }}>
                    {section.count}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {section.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                  </div>
                  {section.costTypes && section.costTypes.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {section.costTypes.length} cost type(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.costTypes) return null;

    const tableData = data.costTypes.map((item: any) => ({
      costType: item.costType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      sectionType: item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A',
      defaultTaxRate: `${item.defaultTaxRate}%`,
      defaultTaxType: item.defaultTaxType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A',
      changeCurrency: item.changeCurrency ? 'Yes' : 'No',
      defaultValue: item.defaultValue || 'N/A',
      displayOrder: item.displayOrder || 0,
    }));

    const columns = [
      { key: 'costType', label: 'Cost Type' },
      { key: 'sectionType', label: 'Section Type' },
      { key: 'defaultTaxRate', label: 'Tax Rate' },
      { key: 'defaultTaxType', label: 'Tax Type' },
      { key: 'changeCurrency', label: 'Currency Change' },
      { key: 'defaultValue', label: 'Default Value' },
      { key: 'displayOrder', label: 'Display Order' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Cost Type Utilization"
      subtitle="Cost type usage analysis"
      icon={<DollarSign className="h-5 w-5" />}
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

export default CostTypeUtilizationReport;
