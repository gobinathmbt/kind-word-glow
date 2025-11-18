import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Clock, TrendingUp, Zap, AlertCircle, Award } from 'lucide-react';

interface ConversationResponseTimesReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const ConversationResponseTimesReport: React.FC<ConversationResponseTimesReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getConversationResponseTimes(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation response times data');
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
    console.log(`Exporting conversation response times as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const { summary } = data;
    const companyMetrics = summary.companyMetrics || {};
    const supplierMetrics = summary.supplierMetrics || {};
    const comparison = summary.comparison || {};

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Company Avg Response"
          value={`${(companyMetrics.avgResponseTimeMinutes || 0).toFixed(1)} min`}
          icon={<Clock className="h-5 w-5" />}
          subtitle={`${(companyMetrics.avgResponseTimeHours || 0).toFixed(1)}h`}
        />
        <MetricCard
          title="Supplier Avg Response"
          value={`${(supplierMetrics.avgResponseTimeMinutes || 0).toFixed(1)} min`}
          icon={<Clock className="h-5 w-5" />}
          subtitle={`${(supplierMetrics.avgResponseTimeHours || 0).toFixed(1)}h`}
        />
        <MetricCard
          title="Total Conversations"
          value={summary.totalConversationsAnalyzed || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${summary.totalResponses || 0} responses`}
        />
        <MetricCard
          title="Faster Responder"
          value={comparison.fasterResponder || 'N/A'}
          icon={<Zap className="h-5 w-5" />}
          subtitle={comparison.timeDifferenceMinutes ? `by ${comparison.timeDifferenceMinutes.toFixed(1)} min` : ''}
        />
        <MetricCard
          title="Company Performance"
          value={companyMetrics.performanceRating || 'N/A'}
          icon={<Award className="h-5 w-5" />}
          subtitle={`${companyMetrics.totalResponses || 0} responses`}
        />
        <MetricCard
          title="Supplier Performance"
          value={supplierMetrics.performanceRating || 'N/A'}
          icon={<Award className="h-5 w-5" />}
          subtitle={`${supplierMetrics.totalResponses || 0} responses`}
        />
        <MetricCard
          title="Company Fastest"
          value={`${(companyMetrics.fastestResponseMinutes || 0).toFixed(1)} min`}
          icon={<Zap className="h-5 w-5" />}
        />
        <MetricCard
          title="Supplier Fastest"
          value={`${(supplierMetrics.fastestResponseMinutes || 0).toFixed(1)} min`}
          icon={<Zap className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const companyMetrics = data.summary?.companyMetrics || {};
    const supplierMetrics = data.summary?.supplierMetrics || {};

    // Color palettes for different charts
    const distributionColors = ['#10b981', '#34d399', '#f59e0b', '#ef4444', '#991b1b'];
    const performanceColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];

    // Company Distribution Data
    const companyDistData: PieChartData[] = companyMetrics.distribution ? [
      { name: 'Immediate (<1min)', value: companyMetrics.distribution.immediate || 0, color: distributionColors[0] },
      { name: 'Fast (1-5min)', value: companyMetrics.distribution.fast || 0, color: distributionColors[1] },
      { name: 'Moderate (5-30min)', value: companyMetrics.distribution.moderate || 0, color: distributionColors[2] },
      { name: 'Slow (30-60min)', value: companyMetrics.distribution.slow || 0, color: distributionColors[3] },
      { name: 'Very Slow (>60min)', value: companyMetrics.distribution.verySlow || 0, color: distributionColors[4] },
    ] : [];

    // Supplier Distribution Data
    const supplierDistData: PieChartData[] = supplierMetrics.distribution ? [
      { name: 'Immediate (<1min)', value: supplierMetrics.distribution.immediate || 0, color: distributionColors[0] },
      { name: 'Fast (1-5min)', value: supplierMetrics.distribution.fast || 0, color: distributionColors[1] },
      { name: 'Moderate (5-30min)', value: supplierMetrics.distribution.moderate || 0, color: distributionColors[2] },
      { name: 'Slow (30-60min)', value: supplierMetrics.distribution.slow || 0, color: distributionColors[3] },
      { name: 'Very Slow (>60min)', value: supplierMetrics.distribution.verySlow || 0, color: distributionColors[4] },
    ] : [];

    // Supplier Performance Data
    const supplierPerformanceData = data.supplierPerformance?.slice(0, 10).map((supplier: any, index: number) => ({
      name: supplier.supplierName || 'Unknown',
      value: supplier.avgResponseTimeMinutes || 0,
      label: `${(supplier.avgResponseTimeMinutes || 0).toFixed(1)} min`,
      color: performanceColors[index % performanceColors.length],
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Company Response Time Distribution</h4>
            <InteractivePieChart data={companyDistData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Response Time Distribution</h4>
            <InteractivePieChart data={supplierDistData} height={300} />
          </div>
        </div>

        {supplierPerformanceData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Performance (Avg Response Time)</h4>
            <ComparisonChart data={supplierPerformanceData} height={300} />
          </div>
        )}

        {data.trends && data.trends.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Response Time Trends</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Company Avg (min)</th>
                    <th className="px-4 py-3 text-right font-medium">Supplier Avg (min)</th>
                    <th className="px-4 py-3 text-right font-medium">Total Responses</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trends.map((trend: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{trend.date || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{(trend.companyAvgMinutes || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(trend.supplierAvgMinutes || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{trend.totalResponses || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.supplierPerformance) return null;

    const tableData = data.supplierPerformance.map((supplier: any) => ({
      supplierName: supplier.supplierName || 'Unknown',
      totalResponses: supplier.totalResponses || 0,
      avgResponseTimeMinutes: `${(supplier.avgResponseTimeMinutes || 0).toFixed(1)} min`,
      avgResponseTimeHours: `${(supplier.avgResponseTimeHours || 0).toFixed(1)}h`,
      fastestResponseMinutes: `${(supplier.fastestResponseMinutes || 0).toFixed(1)} min`,
      slowestResponseMinutes: `${(supplier.slowestResponseMinutes || 0).toFixed(1)} min`,
      immediate: supplier.distribution?.immediate || 0,
      fast: supplier.distribution?.fast || 0,
      moderate: supplier.distribution?.moderate || 0,
      slow: supplier.distribution?.slow || 0,
      verySlow: supplier.distribution?.verySlow || 0,
      performanceRating: supplier.performanceRating || 'N/A',
    }));

    const columns = [
      { key: 'supplierName', label: 'Supplier Name' },
      { key: 'totalResponses', label: 'Total Responses' },
      { key: 'avgResponseTimeMinutes', label: 'Avg Time (min)' },
      { key: 'avgResponseTimeHours', label: 'Avg Time (hours)' },
      { key: 'fastestResponseMinutes', label: 'Fastest' },
      { key: 'slowestResponseMinutes', label: 'Slowest' },
      { key: 'immediate', label: 'Immediate' },
      { key: 'fast', label: 'Fast' },
      { key: 'moderate', label: 'Moderate' },
      { key: 'slow', label: 'Slow' },
      { key: 'verySlow', label: 'Very Slow' },
      { key: 'performanceRating', label: 'Rating' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Conversation Response Times"
      subtitle="Response time metrics and analysis"
      icon={<Clock className="h-5 w-5" />}
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

export default ConversationResponseTimesReport;
