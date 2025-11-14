import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Package, DollarSign, Star, TrendingUp, Award } from 'lucide-react';

interface WorkshopSupplierScorecardReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const WorkshopSupplierScorecardReport: React.FC<WorkshopSupplierScorecardReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopSupplierScorecard(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier scorecard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting supplier scorecard as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    // Filter out null suppliers
    const validSuppliers = data.supplierPerformance?.filter((s: any) => s._id && s.supplierName) || [];
    const topSupplier = data.topSuppliersByRevenue?.filter((s: any) => s._id && s.supplierName)?.[0];
    
    const totalSuppliers = validSuppliers.length;
    const totalJobsCompleted = validSuppliers.reduce((sum: number, s: any) => sum + (s.totalJobsCompleted || 0), 0);
    const totalEarned = validSuppliers.reduce((sum: number, s: any) => sum + (s.totalEarned || 0), 0);
    const avgQualityScore = validSuppliers.length > 0
      ? validSuppliers.reduce((sum: number, s: any) => sum + (s.avgQualityScore || 0), 0) / validSuppliers.length
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Top Supplier"
          value={topSupplier?.supplierName || 'N/A'}
          icon={<Award className="h-5 w-5" />}
          subtitle={topSupplier ? `$${(topSupplier.totalEarned || 0).toLocaleString()} earned` : ''}
        />
        <MetricCard
          title="Total Suppliers"
          value={totalSuppliers}
          icon={<Package className="h-5 w-5" />}
          subtitle={`${totalJobsCompleted} jobs completed`}
        />
        <MetricCard
          title="Total Earned"
          value={`$${totalEarned.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Quality Score"
          value={`${avgQualityScore.toFixed(1)}%`}
          icon={<Star className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const revenueColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const jobsColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
    const qualityColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];

    // Filter out null suppliers
    const validTopSuppliers = data.topSuppliersByRevenue?.filter((s: any) => s._id && s.supplierName) || [];
    const validSuppliers = data.supplierPerformance?.filter((s: any) => s._id && s.supplierName) || [];

    const supplierRevenueData = validTopSuppliers
      .sort((a: any, b: any) => (b.totalEarned || 0) - (a.totalEarned || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.supplierName || 'Unknown',
        value: item.totalEarned || 0,
        label: `$${(item.totalEarned || 0).toLocaleString()}`,
        color: revenueColors[index % revenueColors.length],
      }));

    const supplierJobsData = validSuppliers
      .sort((a: any, b: any) => (b.totalJobsCompleted || 0) - (a.totalJobsCompleted || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.supplierName || 'Unknown',
        value: item.totalJobsCompleted || 0,
        label: `${item.totalJobsCompleted || 0}`,
        color: jobsColors[index % jobsColors.length],
      }));

    const supplierQualityData = validSuppliers
      .sort((a: any, b: any) => (b.avgQualityScore || 0) - (a.avgQualityScore || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.supplierName || 'Unknown',
        value: item.avgQualityScore || 0,
        label: `${(item.avgQualityScore || 0).toFixed(1)}%`,
        color: qualityColors[index % qualityColors.length],
      }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Top Suppliers by Revenue</h4>
          <ComparisonChart data={supplierRevenueData} height={300} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Jobs Completed Performance</h4>
            <ComparisonChart data={supplierJobsData} height={250} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Score Performance (Highest)</h4>
            <ComparisonChart data={supplierQualityData} height={250} />
          </div>
        </div>
        {data.approvedSupplierAnalysis && data.approvedSupplierAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Approved Supplier Analysis</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Supplier</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-right font-medium">Quotes Approved</th>
                    <th className="px-4 py-3 text-right font-medium">Total Quote Amount</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Quote</th>
                    <th className="px-4 py-3 text-right font-medium">Total Final Price</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Final Price</th>
                    <th className="px-4 py-3 text-right font-medium">Quote Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.approvedSupplierAnalysis.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.supplierName || 'N/A'}</td>
                      <td className="px-4 py-3">{item.supplierEmail || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.totalQuotesApproved || 0}</td>
                      <td className="px-4 py-3 text-right">${(item.totalQuoteAmount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${(item.avgQuoteAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${(item.totalFinalPrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${(item.avgFinalPrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{(item.quoteAccuracy || 0).toFixed(1)}%</td>
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

    // Filter out null suppliers and combine data from multiple sources
    const validSuppliers = data.supplierPerformance?.filter((s: any) => s._id && s.supplierName) || [];
    
    const supplierPerformanceData = validSuppliers.map((item: any) => ({
      category: 'Performance Summary',
      supplier: item.supplierName || 'Unknown',
      jobsCompleted: item.totalJobsCompleted || 0,
      workEntries: item.totalWorkEntries || 0,
      avgCost: item.avgCost ? `$${(item.avgCost || 0).toFixed(2)}` : 'N/A',
      avgTime: item.avgTime ? `${(item.avgTime * 24).toFixed(1)}h` : 'N/A',
      totalEarned: `$${(item.totalEarned || 0).toLocaleString()}`,
      qualityScore: item.avgQualityScore ? `${(item.avgQualityScore || 0).toFixed(1)}%` : 'N/A',
      reportsWorkedOn: item.reportsWorkedOn || 0,
    }));

    const topSuppliersData = data.topSuppliersByRevenue?.filter((s: any) => s._id && s.supplierName).map((item: any) => ({
      category: 'Top by Revenue',
      supplier: item.supplierName || 'Unknown',
      jobsCompleted: item.jobsCompleted || 0,
      workEntries: '-',
      avgCost: '-',
      avgTime: '-',
      totalEarned: `$${(item.totalEarned || 0).toLocaleString()}`,
      qualityScore: item.avgQualityScore ? `${(item.avgQualityScore || 0).toFixed(1)}%` : 'N/A',
      reportsWorkedOn: '-',
    })) || [];

    const tableData = [...supplierPerformanceData, ...topSuppliersData];

    const columns = [
      { key: 'category', label: 'Category' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'jobsCompleted', label: 'Jobs' },
      { key: 'workEntries', label: 'Work Entries' },
      { key: 'avgCost', label: 'Avg Cost' },
      { key: 'avgTime', label: 'Avg Time' },
      { key: 'totalEarned', label: 'Total Earned' },
      { key: 'qualityScore', label: 'Quality' },
      { key: 'reportsWorkedOn', label: 'Reports' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Supplier Scorecard"
      subtitle="Supplier performance and earnings analysis"
      icon={<Package className="h-5 w-5" />}
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

export default WorkshopSupplierScorecardReport;
