import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
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
  shouldLoad?: boolean;
}

export const SupplierPerformanceRankingReport: React.FC<SupplierPerformanceRankingReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getSupplierPerformanceRanking(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier performance data');
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
    console.log(`Exporting supplier performance report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const summary = data.summary || {};
    const rankings = data.rankings || [];
    const topPerformer = rankings.length > 0 ? rankings[0] : null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Top Performer"
          value={topPerformer?.name || 'N/A'}
          icon={<Award className="h-5 w-5" />}
          subtitle={topPerformer ? `Rank #${topPerformer.rank}` : ''}
        />
        <MetricCard
          title="Avg Overall Score"
          value={(summary.avgOverallScore || 0).toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Excellent Performers"
          value={summary.excellentPerformers || 0}
          icon={<Star className="h-5 w-5" />}
          subtitle={`${summary.goodPerformers || 0} good performers`}
        />
        <MetricCard
          title="Needs Improvement"
          value={summary.needsImprovement || 0}
          icon={<Target className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const rankingColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const performanceLevelColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const scoreColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

    const rankings = data.rankings || [];
    const summary = data.summary || {};

    // Top 10 Suppliers by Overall Score
    const topSuppliers = rankings
      .sort((a: any, b: any) => (b.performanceScores?.overall || 0) - (a.performanceScores?.overall || 0))
      .slice(0, 10)
      .map((supplier: any, index: number) => ({
        name: supplier.name || 'Unknown',
        value: supplier.performanceScores?.overall || 0,
        label: `${(supplier.performanceScores?.overall || 0).toFixed(1)}`,
        color: rankingColors[index % rankingColors.length],
      }));

    // Performance Level Distribution
    const performanceLevelData: PieChartData[] = [
      { name: 'Excellent', value: summary.excellentPerformers || 0, label: `${summary.excellentPerformers || 0} suppliers`, color: performanceLevelColors[0] },
      { name: 'Good', value: summary.goodPerformers || 0, label: `${summary.goodPerformers || 0} suppliers`, color: performanceLevelColors[1] },
      { name: 'Average', value: summary.averagePerformers || 0, label: `${summary.averagePerformers || 0} suppliers`, color: performanceLevelColors[2] },
      { name: 'Needs Improvement', value: summary.needsImprovement || 0, label: `${summary.needsImprovement || 0} suppliers`, color: performanceLevelColors[3] },
    ].filter(item => item.value > 0);

    // Performance Scores Breakdown
    const scoreBreakdown = rankings.slice(0, 10).map((supplier: any) => ({
      name: supplier.name || 'Unknown',
      responseTime: supplier.performanceScores?.responseTime || 0,
      costEfficiency: supplier.performanceScores?.costEfficiency || 0,
      approvalRate: supplier.performanceScores?.approvalRate || 0,
      completionRate: supplier.performanceScores?.completionRate || 0,
      quality: supplier.performanceScores?.quality || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Suppliers by Overall Score</h4>
            <ComparisonChart data={topSuppliers} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Performance Level Distribution</h4>
            <InteractivePieChart data={performanceLevelData} height={300} />
          </div>
        </div>
        {scoreBreakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Performance Scores Breakdown (Top 10)</h4>
            <StackedBarChart
              data={scoreBreakdown}
              xAxisKey="name"
              series={[
                { dataKey: 'responseTime', name: 'Response Time', color: scoreColors[0] },
                { dataKey: 'costEfficiency', name: 'Cost Efficiency', color: scoreColors[1] },
                { dataKey: 'approvalRate', name: 'Approval Rate', color: scoreColors[2] },
                { dataKey: 'completionRate', name: 'Completion Rate', color: scoreColors[3] },
                { dataKey: 'quality', name: 'Quality', color: scoreColors[4] },
              ]}
              height={300}
            />
          </div>
        )}
        {rankings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Detailed Performance Rankings</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center font-medium">Rank</th>
                    <th className="px-4 py-3 text-left font-medium">Supplier</th>
                    <th className="px-4 py-3 text-right font-medium">Overall Score</th>
                    <th className="px-4 py-3 text-right font-medium">Response Time</th>
                    <th className="px-4 py-3 text-right font-medium">Cost Efficiency</th>
                    <th className="px-4 py-3 text-right font-medium">Approval Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Completion Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Quality</th>
                    <th className="px-4 py-3 text-left font-medium">Performance Level</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((supplier: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          supplier.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                          supplier.rank === 2 ? 'bg-gray-100 text-gray-800' :
                          supplier.rank === 3 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-50 text-blue-800'
                        }`}>
                          {supplier.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{supplier.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{supplier.shopName || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{(supplier.performanceScores?.overall || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(supplier.performanceScores?.responseTime || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(supplier.performanceScores?.costEfficiency || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(supplier.performanceScores?.approvalRate || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(supplier.performanceScores?.completionRate || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(supplier.performanceScores?.quality || 0).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          supplier.performanceLevel === 'Excellent' ? 'bg-green-100 text-green-800' :
                          supplier.performanceLevel === 'Good' ? 'bg-blue-100 text-blue-800' :
                          supplier.performanceLevel === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {supplier.performanceLevel || 'N/A'}
                        </span>
                      </td>
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
    if (!data) return null;

    const rankings = data.rankings || [];

    const columns = [
      { key: 'rank', label: 'Rank' },
      { key: 'supplierName', label: 'Supplier' },
      { key: 'shopName', label: 'Shop Name' },
      { key: 'overallScore', label: 'Overall Score' },
      { key: 'responseTimeScore', label: 'Response Time' },
      { key: 'costEfficiencyScore', label: 'Cost Efficiency' },
      { key: 'approvalRateScore', label: 'Approval Rate' },
      { key: 'completionRateScore', label: 'Completion Rate' },
      { key: 'qualityScore', label: 'Quality' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'approvedQuotes', label: 'Approved' },
      { key: 'completedQuotes', label: 'Completed' },
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'performanceLevel', label: 'Performance Level' },
    ];

    const tableData = rankings.map((supplier: any) => ({
      rank: supplier.rank || 0,
      supplierName: supplier.name || 'Unknown',
      shopName: supplier.shopName || 'N/A',
      overallScore: (supplier.performanceScores?.overall || 0).toFixed(1),
      responseTimeScore: (supplier.performanceScores?.responseTime || 0).toFixed(1),
      costEfficiencyScore: (supplier.performanceScores?.costEfficiency || 0).toFixed(1),
      approvalRateScore: (supplier.performanceScores?.approvalRate || 0).toFixed(1),
      completionRateScore: (supplier.performanceScores?.completionRate || 0).toFixed(1),
      qualityScore: (supplier.performanceScores?.quality || 0).toFixed(1),
      totalQuotes: supplier.metrics?.totalQuotes || 0,
      approvedQuotes: supplier.metrics?.approvedQuotes || 0,
      completedQuotes: supplier.metrics?.completedQuotes || 0,
      totalRevenue: `$${(supplier.metrics?.totalRevenue || 0).toFixed(2)}`,
      performanceLevel: supplier.performanceLevel || 'N/A',
    }));

    return <DataTable columns={columns} data={tableData} />;
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
