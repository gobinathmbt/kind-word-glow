import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign } from 'lucide-react';

interface VehiclePricingAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehiclePricingAnalysisReport: React.FC<VehiclePricingAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehiclePricingAnalysis(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting pricing analysis report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Avg Purchase Price"
          value={`$${data.metrics.avgPurchasePrice?.toLocaleString() || 0}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Retail Price"
          value={`$${data.metrics.avgRetailPrice?.toLocaleString() || 0}`}
        />
        <MetricCard
          title="Avg Sold Price"
          value={`$${data.metrics.avgSoldPrice?.toLocaleString() || 0}`}
        />
        <MetricCard
          title="Avg Profit Margin"
          value={`${data.metrics.avgProfitMargin?.toFixed(1) || 0}%`}
          trend={data.metrics.profitMarginTrend}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const priceTrendData = data.priceTrends || [];
    const priceComparisonData = data.priceComparison || [];
    const profitMarginData = data.profitMargins || [];
    const priceRangeData = data.priceRangeDistribution || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Price Trends Over Time</h4>
            <LineChart
              data={priceTrendData}
              xAxisKey="month"
              lines={[
                { dataKey: 'purchasePrice', name: 'Purchase' },
                { dataKey: 'retailPrice', name: 'Retail' },
                { dataKey: 'soldPrice', name: 'Sold' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Price Comparison by Type</h4>
            <StackedBarChart
              data={priceComparisonData}
              xAxisKey="type"
              series={[
                { dataKey: 'purchasePrice', name: 'Purchase' },
                { dataKey: 'retailPrice', name: 'Retail' },
                { dataKey: 'soldPrice', name: 'Sold' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Profit Margin Analysis</h4>
            <LineChart
              data={profitMarginData}
              xAxisKey="month"
              lines={[
                { dataKey: 'profitMargin', name: 'Profit Margin %' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Price Range Distribution</h4>
            <StackedBarChart
              data={priceRangeData}
              xAxisKey="range"
              series={[
                { dataKey: 'count', name: 'Vehicles' },
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
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'avgPurchasePrice', label: 'Avg Purchase' },
      { key: 'avgRetailPrice', label: 'Avg Retail' },
      { key: 'avgSoldPrice', label: 'Avg Sold' },
      { key: 'profitMargin', label: 'Profit Margin %' },
      { key: 'totalRevenue', label: 'Total Revenue' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Pricing Analysis"
      subtitle="Purchase, retail, sold prices and profit margins"
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

export default VehiclePricingAnalysisReport;
