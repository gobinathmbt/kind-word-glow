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

interface MasterVehiclePricingStrategyReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const MasterVehiclePricingStrategyReport: React.FC<MasterVehiclePricingStrategyReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getMasterVehiclePricingStrategy(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load master vehicle pricing strategy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting master vehicle pricing strategy report as ${format}`);
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
          title="Avg Margin"
          value={`${data.metrics.avgMargin || 0}%`}
          trend={{ value: data.metrics.marginTrend || 0, isPositive: true }}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${data.metrics.totalRevenue?.toLocaleString() || 0}`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const pricingTrends = data.pricingTrends || [];
    const marginByMake = data.marginByMake || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Pricing Trends</h4>
          <LineChart
            data={pricingTrends}
            xAxisKey="month"
            lines={[
              { dataKey: 'avgPurchase', name: 'Avg Purchase' },
              { dataKey: 'avgRetail', name: 'Avg Retail' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Margin by Make</h4>
          <StackedBarChart
            data={marginByMake}
            xAxisKey="make"
            series={[
              { dataKey: 'margin', name: 'Margin %' },
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
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'avgPurchasePrice', label: 'Avg Purchase' },
      { key: 'avgRetailPrice', label: 'Avg Retail' },
      { key: 'margin', label: 'Margin %' },
      { key: 'totalSold', label: 'Total Sold' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Master Vehicle Pricing Strategy"
      subtitle="Pricing and valuation analysis"
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

export default MasterVehiclePricingStrategyReport;
