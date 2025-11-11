import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Package, DollarSign, Star, TrendingUp } from 'lucide-react';

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
    if (!data?.supplierPerformance || data.supplierPerformance.length === 0) return null;
    
    const totalSuppliers = data.supplierPerformance.length;
    const totalJobsCompleted = data.supplierPerformance.reduce((sum: number, s: any) => sum + (s.totalJobsCompleted || 0), 0);
    const totalEarned = data.supplierPerformance.reduce((sum: number, s: any) => sum + (s.totalEarned || 0), 0);
    const avgQualityScore = data.supplierPerformance.reduce((sum: number, s: any) => sum + (s.avgQualityScore || 0), 0) / totalSuppliers;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Suppliers"
          value={totalSuppliers}
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          title="Jobs Completed"
          value={totalJobsCompleted}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Earned"
          value={`$${totalEarned.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Quality Score"
          value={`${(avgQualityScore * 100).toFixed(1)}%`}
          icon={<Star className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const supplierRevenueData = data.topSuppliersByRevenue?.map((item: any) => ({
      name: item.supplierName || 'Unknown',
      value: item.totalEarned || 0,
      percentage: 100,
    })) || [];

    const supplierJobsData = data.supplierPerformance?.map((item: any) => ({
      name: item.supplierName || 'Unknown',
      value: item.totalJobsCompleted || 0,
      percentage: (item.avgQualityScore || 0) * 100,
    })) || [];

    return (
      <div className="space-y-6">
        {supplierRevenueData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Suppliers by Revenue</h4>
            <ComparisonChart data={supplierRevenueData} height={300} />
          </div>
        )}

        {supplierJobsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Jobs Completed</h4>
            <ComparisonChart data={supplierJobsData} height={300} />
          </div>
        )}

        {data.approvedSupplierAnalysis && data.approvedSupplierAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Approved Supplier Analysis</h4>
            <DataTable
              columns={[
                { key: 'supplierName', label: 'Supplier' },
                { key: 'totalQuotesApproved', label: 'Quotes Approved' },
                { key: 'avgQuoteAmount', label: 'Avg Quote' },
                { key: 'avgFinalPrice', label: 'Avg Final' },
                { key: 'quoteAccuracy', label: 'Accuracy' },
              ]}
              data={data.approvedSupplierAnalysis.map((item: any) => ({
                supplierName: item.supplierName || 'N/A',
                totalQuotesApproved: item.totalQuotesApproved || 0,
                avgQuoteAmount: `$${(item.avgQuoteAmount || 0).toLocaleString()}`,
                avgFinalPrice: `$${(item.avgFinalPrice || 0).toLocaleString()}`,
                quoteAccuracy: `${(item.quoteAccuracy || 0).toFixed(1)}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.supplierPerformance) return null;

    const tableData = data.supplierPerformance.map((item: any) => ({
      supplier: item.supplierName || 'Unknown',
      jobsCompleted: item.totalJobsCompleted || 0,
      workEntries: item.totalWorkEntries || 0,
      avgCost: `$${(item.avgCost || 0).toLocaleString()}`,
      totalEarned: `$${(item.totalEarned || 0).toLocaleString()}`,
      qualityScore: `${((item.avgQualityScore || 0) * 100).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'supplier', label: 'Supplier' },
      { key: 'jobsCompleted', label: 'Jobs' },
      { key: 'workEntries', label: 'Work Entries' },
      { key: 'avgCost', label: 'Avg Cost' },
      { key: 'totalEarned', label: 'Total Earned' },
      { key: 'qualityScore', label: 'Quality' },
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
