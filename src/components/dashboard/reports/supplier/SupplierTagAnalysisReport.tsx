import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Tag, Tags, TrendingUp } from 'lucide-react';

interface SupplierTagAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const SupplierTagAnalysisReport: React.FC<SupplierTagAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getSupplierTagAnalysis(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier tag analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting supplier tag analysis report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Tags"
          value={data.metrics.totalTags || 0}
          icon={<Tags className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Popular Tag"
          value={data.metrics.mostPopularTag || 'N/A'}
          icon={<Tag className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Tags per Supplier"
          value={data.metrics.avgTagsPerSupplier || 0}
        />
        <MetricCard
          title="Tagged Suppliers"
          value={data.metrics.taggedSuppliers || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const tagDistribution: PieChartData[] = data.tagDistribution?.map((item: any) => ({
      name: item.tag,
      value: item.count,
    })) || [];

    const suppliersByTagData = data.suppliersByTag || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Tag Distribution</h4>
            <InteractivePieChart data={tagDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Suppliers by Tag</h4>
            <StackedBarChart
              data={suppliersByTagData}
              xAxisKey="tag"
              series={[
                { dataKey: 'supplierCount', name: 'Suppliers' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'tag', label: 'Tag' },
      { key: 'supplierCount', label: 'Suppliers' },
      { key: 'totalQuotes', label: 'Quotes' },
      { key: 'avgPerformance', label: 'Avg Performance' },
      { key: 'category', label: 'Category' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Supplier Tag Analysis"
      subtitle="Tag-based categorization"
      icon={<Tags className="h-5 w-5" />}
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

export default SupplierTagAnalysisReport;
