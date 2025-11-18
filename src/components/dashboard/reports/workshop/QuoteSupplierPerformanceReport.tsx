import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, Award, Clock, TrendingUp } from 'lucide-react';

interface QuoteSupplierPerformanceReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteSupplierPerformanceReport: React.FC<QuoteSupplierPerformanceReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteSupplierPerformance(params);
      setData(response.data?.data || response.data);
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
    if (!data) return null;
    
    // Filter out null suppliers
    const validSuppliers = data.supplierRanking?.filter((s: any) => s._id) || [];
    const topSupplier = data.topSuppliers?.filter((s: any) => s._id)?.[0];
    
    const avgApprovalRate = validSuppliers.length > 0
      ? validSuppliers.reduce((sum: number, s: any) => sum + (s.approvalRate || 0), 0) / validSuppliers.length
      : 0;
    
    const avgResponseTime = validSuppliers.length > 0
      ? validSuppliers.reduce((sum: number, s: any) => sum + (s.avgResponseTime || 0), 0) / validSuppliers.length
      : 0;
    
    const totalQuotesReceived = validSuppliers.reduce((sum: number, s: any) => sum + (s.totalQuotesReceived || 0), 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Top Supplier"
          value={topSupplier?.supplierName || 'N/A'}
          icon={<Award className="h-5 w-5" />}
          subtitle={topSupplier ? `${topSupplier.totalApprovedQuotes} approved quotes` : ''}
        />
        <MetricCard
          title="Total Suppliers"
          value={validSuppliers.length}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${totalQuotesReceived} total quotes`}
        />
        <MetricCard
          title="Avg Approval Rate"
          value={`${avgApprovalRate.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(1)}h`}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const approvalRateColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const responseTimeColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
    const costColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];

    // Filter out null suppliers and sort by approval rate
    const validSuppliers = data.supplierRanking?.filter((s: any) => s._id) || [];
    const supplierRankingData = validSuppliers
      .sort((a: any, b: any) => (b.approvalRate || 0) - (a.approvalRate || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.supplierName || 'Unknown',
        value: item.approvalRate || 0,
        label: `${(item.approvalRate || 0).toFixed(1)}%`,
        color: approvalRateColors[index % approvalRateColors.length],
      }));

    const responseTimeData = validSuppliers
      .sort((a: any, b: any) => (a.avgResponseTime || 0) - (b.avgResponseTime || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.supplierName || 'Unknown',
        value: item.avgResponseTime || 0,
        label: `${(item.avgResponseTime || 0).toFixed(1)}h`,
        color: responseTimeColors[index % responseTimeColors.length],
      }));

    const validCostAnalysis = data.costAnalysis?.filter((s: any) => s._id) || [];
    const costCompetitivenessData = validCostAnalysis
      .sort((a: any, b: any) => (b.lowestBidderRate || 0) - (a.lowestBidderRate || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.supplierName || 'Unknown',
        value: item.lowestBidderRate || 0,
        label: `${(item.lowestBidderRate || 0).toFixed(1)}%`,
        color: costColors[index % costColors.length],
      }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Top Suppliers by Approval Rate</h4>
          <ComparisonChart data={supplierRankingData} height={300} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Response Time Performance (Fastest)</h4>
            <ComparisonChart data={responseTimeData} height={250} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Competitiveness (Lowest Bidder Rate)</h4>
            <ComparisonChart data={costCompetitivenessData} height={250} />
          </div>
        </div>
        {data.qualityMetrics && data.qualityMetrics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Metrics</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Supplier</th>
                    <th className="px-4 py-3 text-right font-medium">Completed Jobs</th>
                    <th className="px-4 py-3 text-right font-medium">Rework Count</th>
                    <th className="px-4 py-3 text-right font-medium">Rework Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Quote Diff</th>
                    <th className="px-4 py-3 text-right font-medium">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.qualityMetrics.map((metric: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{metric.supplierName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right">{metric.completedJobs || 0}</td>
                      <td className="px-4 py-3 text-right">{metric.reworkCount || 0}</td>
                      <td className="px-4 py-3 text-right">{(metric.reworkRate || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">${(metric.avgQuoteDifference || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${(metric.totalRevenue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {data.responseTimeAnalysis && data.responseTimeAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Response Time Distribution</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.responseTimeAnalysis.map((timeRange: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{timeRange.count}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {timeRange._id === 0 ? 'Within 24 hours' : 
                     timeRange._id === 'Over 1 week' ? 'Over 1 week' : 
                     `${timeRange._id} hours`}
                  </div>
                  {timeRange.suppliers && timeRange.suppliers.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {timeRange.suppliers.length} supplier(s)
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
    if (!data?.supplierRanking) return null;

    // Filter out null suppliers
    const validSuppliers = data.supplierRanking.filter((s: any) => s._id);
    
    const tableData = validSuppliers.map((item: any) => {
      // Find corresponding quality metrics
      const qualityMetric = data.qualityMetrics?.find((q: any) => q._id === item._id);
      // Find corresponding cost analysis
      const costAnalysis = data.costAnalysis?.find((c: any) => c._id === item._id);
      
      return {
        supplierName: item.supplierName || 'Unknown',
        supplierEmail: item.supplierEmail || 'N/A',
        totalQuotes: item.totalQuotesReceived || 0,
        approvedQuotes: item.approvedQuotes || 0,
        rejectedQuotes: item.rejectedQuotes || 0,
        approvalRate: `${(item.approvalRate || 0).toFixed(1)}%`,
        responseRate: `${(item.responseRate || 0).toFixed(1)}%`,
        avgResponseTime: item.avgResponseTime ? `${item.avgResponseTime.toFixed(1)}h` : 'N/A',
        avgEstimatedCost: item.avgEstimatedCost ? `$${item.avgEstimatedCost.toFixed(2)}` : 'N/A',
        lowestBidderRate: costAnalysis ? `${(costAnalysis.lowestBidderRate || 0).toFixed(1)}%` : 'N/A',
        completedJobs: qualityMetric?.completedJobs || 0,
        reworkRate: qualityMetric ? `${(qualityMetric.reworkRate || 0).toFixed(1)}%` : 'N/A',
      };
    });

    const columns = [
      { key: 'supplierName', label: 'Supplier Name' },
      { key: 'supplierEmail', label: 'Email' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'approvedQuotes', label: 'Approved' },
      { key: 'rejectedQuotes', label: 'Rejected' },
      { key: 'approvalRate', label: 'Approval Rate' },
      { key: 'responseRate', label: 'Response Rate' },
      { key: 'avgResponseTime', label: 'Avg Response Time' },
      { key: 'avgEstimatedCost', label: 'Avg Cost' },
      { key: 'lowestBidderRate', label: 'Lowest Bidder Rate' },
      { key: 'completedJobs', label: 'Completed Jobs' },
      { key: 'reworkRate', label: 'Rework Rate' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Supplier Performance"
      subtitle="Supplier ranking with performance scorecard and metrics"
      icon={<Users className="h-5 w-5" />}
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

export default QuoteSupplierPerformanceReport;
