import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Store, Package, CheckCircle, XCircle } from 'lucide-react';

interface SupplierOverviewReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const SupplierOverviewReport: React.FC<SupplierOverviewReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getSupplierOverview(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting supplier overview report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Suppliers"
          value={data.metrics.totalSuppliers || 0}
          icon={<Store className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Suppliers"
          value={data.metrics.activeSuppliers || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Inactive Suppliers"
          value={data.metrics.inactiveSuppliers || 0}
          icon={<XCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Quotes"
          value={data.metrics.totalQuotes || 0}
          icon={<Package className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusData: PieChartData[] = data.statusDistribution?.map((item: any) => ({
      name: item.status,
      value: item.count,
    })) || [];

    const activityData = data.activityBySupplier || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Activity by Supplier</h4>
            <StackedBarChart
              data={activityData}
              xAxisKey="supplierName"
              series={[
                { dataKey: 'quotes', name: 'Quotes' },
                { dataKey: 'completed', name: 'Completed' },
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
      { key: 'supplierName', label: 'Supplier' },
      { key: 'status', label: 'Status' },
      { key: 'totalQuotes', label: 'Quotes' },
      { key: 'completedQuotes', label: 'Completed' },
      { key: 'avgResponseTime', label: 'Avg Response (hrs)' },
      { key: 'rating', label: 'Rating' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Supplier Overview"
      subtitle="Supplier inventory and status"
      icon={<Store className="h-5 w-5" />}
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

export default SupplierOverviewReport;
