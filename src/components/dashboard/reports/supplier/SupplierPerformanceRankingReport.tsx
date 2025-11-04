import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Award, TrendingUp, Star, Target } from 'lucide-react';

interface SupplierPerformanceRankingReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const SupplierPerformanceRankingReport: React.FC<SupplierPerformanceRankingReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getSupplierPerformanceRanking(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting supplier performance report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Top Performer"
          value={data.metrics.topPerformer || 'N/A'}
          icon={<Award className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Performance Score"
          value={data.metrics.avgPerformanceScore || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Rating"
          value={`${data.metrics.avgRating || 0}/5`}
          icon={<Star className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Completion Rate"
          value={`${data.metrics.avgCompletionRate || 0}%`}
          icon={<Target className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const rankingData = data.rankings || [];
    const performanceData = data.performanceMetrics || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Supplier Performance Ranking</h4>
          <ComparisonChart
            data={rankingData}
            nameKey="supplierName"
            valueKey="performanceScore"
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Performance Metrics Comparison</h4>
          <StackedBarChart
            data={performanceData}
            xAxisKey="supplierName"
            series={[
              { dataKey: 'responseTime', name: 'Response Time' },
              { dataKey: 'completionRate', name: 'Completion Rate' },
              { dataKey: 'qualityScore', name: 'Quality Score' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'rank', label: 'Rank' },
      { key: 'supplierName', label: 'Supplier' },
      { key: 'performanceScore', label: 'Score' },
      { key: 'completionRate', label: 'Completion %' },
      { key: 'avgResponseTime', label: 'Response Time (hrs)' },
      { key: 'rating', label: 'Rating' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Supplier Performance Ranking"
      subtitle="Performance-based ranking"
      icon={<Award className="h-5 w-5" />}
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

export default SupplierPerformanceRankingReport;
