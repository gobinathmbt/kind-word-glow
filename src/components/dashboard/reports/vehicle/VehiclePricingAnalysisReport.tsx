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
      console.log('Pricing Analysis API Response:', response);
      console.log('Pricing Analysis Data:', response.data?.data);
      setData(response.data?.data);
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
    if (!data?.revenueMetrics) return null;

    const metrics = data.revenueMetrics;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`$${Math.round(metrics.totalRevenue).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`${metrics.vehiclesWithSoldPrice} vehicles sold`}
        />
        <MetricCard
          title="Gross Profit"
          value={`$${Math.round(metrics.grossProfit).toLocaleString()}`}
          subtitle={`Net: $${Math.round(metrics.netProfit).toLocaleString()}`}
        />
        <MetricCard
          title="Avg Profit/Vehicle"
          value={`$${Math.round(metrics.avgProfitPerVehicle).toLocaleString()}`}
          subtitle={`${metrics.totalVehicles} total vehicles`}
        />
        <MetricCard
          title="Total Retail Value"
          value={`$${Math.round(metrics.totalRetailValue).toLocaleString()}`}
          subtitle={`Purchase: $${Math.round(metrics.totalPurchaseCost).toLocaleString()}`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Pricing Trends Over Time - Transform monthly data
    const priceTrendData: any[] = [];
    const monthMap = new Map<string, any>();

    data.pricingTrends?.forEach((item: any) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: key,
          year: item._id.year,
          monthNum: item._id.month
        });
      }
      const monthData = monthMap.get(key);
      const type = item._id.type;
      monthData[`${type}_purchase`] = item.avgPurchasePrice;
      monthData[`${type}_retail`] = item.avgRetailPrice;
      monthData[`${type}_sold`] = item.avgSoldPrice;
    });

    priceTrendData.push(...Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    }));

    // Price Comparison by Type
    const priceComparisonData = data.pricingByType?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      purchasePrice: Math.round(item.avgPurchasePrice),
      retailPrice: Math.round(item.avgRetailPrice),
      soldPrice: Math.round(item.avgSoldPrice),
      count: item.count,
    })) || [];

    // Profit Margin by Type
    const profitMarginData = data.pricingByType?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      profitMargin: item.profitMargin,
      retailMarkup: item.retailMarkup,
      count: item.count,
    })) || [];

    // Price Range Distribution
    const priceRangeData = data.priceRangeDistribution?.map((item: any) => {
      let rangeLabel = '';
      if (item._id === '500000+') {
        rangeLabel = '$500K+';
      } else if (item._id === 0) {
        rangeLabel = '$0-10K';
      } else {
        const start = item._id / 1000;
        const end = start + (item._id < 100000 ? 10 : item._id < 200000 ? 25 : 50);
        rangeLabel = `$${start}K-${end}K`;
      }
      return {
        range: rangeLabel,
        count: item.count,
        avgPrice: item.avgPrice ? Math.round(item.avgPrice) : 0,
      };
    }).filter((item: any) => item.count > 0) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Price Trends Over Time</h4>
            <LineChart
              data={priceTrendData}
              xAxisKey="month"
              lines={[
                { dataKey: 'inspection_retail', name: 'Inspection Retail', color: '#3b82f6' },
                { dataKey: 'tradein_retail', name: 'Trade-in Retail', color: '#10b981' },
                { dataKey: 'inspection_sold', name: 'Inspection Sold', color: '#8b5cf6' },
                { dataKey: 'tradein_sold', name: 'Trade-in Sold', color: '#f59e0b' },
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
                { dataKey: 'purchasePrice', name: 'Purchase', color: '#ef4444' },
                { dataKey: 'retailPrice', name: 'Retail', color: '#3b82f6' },
                { dataKey: 'soldPrice', name: 'Sold', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Profit Margin by Type</h4>
            <StackedBarChart
              data={profitMarginData}
              xAxisKey="type"
              series={[
                { dataKey: 'profitMargin', name: 'Profit Margin', color: '#10b981' },
                { dataKey: 'retailMarkup', name: 'Retail Markup', color: '#3b82f6' },
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
                { dataKey: 'count', name: 'Vehicles', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.pricingByMakeModel) return null;

    const columns = [
      { key: 'make', label: 'Make', sortable: true },
      { key: 'model', label: 'Model', sortable: true },
      { key: 'count', label: 'Count', sortable: true },
      { key: 'avgPurchasePrice', label: 'Avg Purchase', sortable: true },
      { key: 'avgRetailPrice', label: 'Avg Retail', sortable: true },
      { key: 'avgSoldPrice', label: 'Avg Sold', sortable: true },
      { key: 'totalRevenue', label: 'Total Revenue', sortable: true },
      { key: 'profitMargin', label: 'Profit Margin', sortable: true },
    ];

    const tableData = data.pricingByMakeModel.map((item: any) => ({
      make: item._id.make,
      model: item._id.model,
      count: item.count,
      avgPurchasePrice: `$${Math.round(item.avgPurchasePrice).toLocaleString()}`,
      avgRetailPrice: `$${Math.round(item.avgRetailPrice).toLocaleString()}`,
      avgSoldPrice: `$${Math.round(item.avgSoldPrice).toLocaleString()}`,
      totalRevenue: `$${Math.round(item.totalRevenue).toLocaleString()}`,
      profitMargin: `$${Math.round(item.profitMargin).toLocaleString()}`,
    }));

    return <DataTable columns={columns} data={tableData} />;
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
