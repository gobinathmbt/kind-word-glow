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
      setData(response.data?.data || response.data);
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
    if (!data) return null;

    const summary = data.summary || {};
    const totalSuppliers = summary.totalSuppliers || 0;
    const activeSuppliers = summary.activeSuppliers || 0;
    const inactiveSuppliers = summary.inactiveSuppliers || 0;
    const suppliersWithQuotes = summary.suppliersWithQuotes || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Suppliers"
          value={totalSuppliers}
          icon={<Store className="h-5 w-5" />}
          subtitle={`${activeSuppliers} active`}
        />
        <MetricCard
          title="Active Suppliers"
          value={activeSuppliers}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Inactive Suppliers"
          value={inactiveSuppliers}
          icon={<XCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="With Quotes"
          value={suppliersWithQuotes}
          icon={<Package className="h-5 w-5" />}
          subtitle={`${summary.suppliersWithCompletedWork || 0} with completed work`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const suppliers = data.suppliers || [];
    const summary = data.summary || {};

    // Color palettes
    const statusColors = ['#10b981', '#ef4444'];
    const activityColors = ['#3b82f6', '#f59e0b', '#10b981'];

    // Status Distribution
    const statusData: PieChartData[] = [
      { name: 'Active', value: summary.activeSuppliers || 0, label: `${summary.activeSuppliers || 0} suppliers`, color: statusColors[0] },
      { name: 'Inactive', value: summary.inactiveSuppliers || 0, label: `${summary.inactiveSuppliers || 0} suppliers`, color: statusColors[1] },
    ].filter(item => item.value > 0);

    // Activity Level Distribution
    const activityLevelMap = new Map();
    suppliers.forEach((supplier: any) => {
      const level = supplier.activityLevel || 'Low';
      activityLevelMap.set(level, (activityLevelMap.get(level) || 0) + 1);
    });

    const activityLevelData: PieChartData[] = Array.from(activityLevelMap.entries()).map(([level, count], index) => ({
      name: level,
      value: count as number,
      label: `${count} suppliers`,
      color: activityColors[index % activityColors.length],
    }));

    // Quote metrics by supplier
    const quoteData = suppliers
      .filter((s: any) => s.quoteMetrics?.total > 0)
      .slice(0, 10)
      .map((supplier: any) => ({
        name: supplier.name || 'Unknown',
        total: supplier.quoteMetrics?.total || 0,
        approved: supplier.quoteMetrics?.approved || 0,
        completed: supplier.quoteMetrics?.completed || 0,
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Activity Level Distribution</h4>
            <InteractivePieChart data={activityLevelData} height={300} />
          </div>
        </div>
        {quoteData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Quote Activity by Supplier</h4>
            <StackedBarChart
              data={quoteData}
              xAxisKey="name"
              series={[
                { dataKey: 'total', name: 'Total Quotes', color: '#3b82f6' },
                { dataKey: 'approved', name: 'Approved', color: '#10b981' },
                { dataKey: 'completed', name: 'Completed', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}
        {suppliers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Supplier</th>
                    <th className="px-4 py-3 text-left font-medium">Shop Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-right font-medium">Total Quotes</th>
                    <th className="px-4 py-3 text-right font-medium">Approved</th>
                    <th className="px-4 py-3 text-right font-medium">Completed</th>
                    <th className="px-4 py-3 text-right font-medium">Approval Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Total Revenue</th>
                    <th className="px-4 py-3 text-left font-medium">Activity Level</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{supplier.name || 'Unknown'}</div>
                        {supplier.tags && supplier.tags.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {supplier.tags.slice(0, 2).join(', ')}
                            {supplier.tags.length > 2 && ` +${supplier.tags.length - 2}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{supplier.shopName || 'N/A'}</td>
                      <td className="px-4 py-3">{supplier.email || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{supplier.quoteMetrics?.total || 0}</td>
                      <td className="px-4 py-3 text-right">{supplier.quoteMetrics?.approved || 0}</td>
                      <td className="px-4 py-3 text-right">{supplier.quoteMetrics?.completed || 0}</td>
                      <td className="px-4 py-3 text-right">{(supplier.quoteMetrics?.approvalRate || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">${(supplier.performanceMetrics?.totalRevenue || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${supplier.activityLevel === 'High' ? 'bg-green-100 text-green-800' :
                            supplier.activityLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {supplier.activityLevel || 'Low'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {supplier.isActive ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
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

    const suppliers = data.suppliers || [];

    const columns = [
      { key: 'supplierName', label: 'Supplier' },
      { key: 'shopName', label: 'Shop Name' },
      { key: 'email', label: 'Email' },
      { key: 'tags', label: 'Tags' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'approvedQuotes', label: 'Approved' },
      { key: 'completedQuotes', label: 'Completed' },
      { key: 'approvalRate', label: 'Approval Rate %' },
      { key: 'completionRate', label: 'Completion Rate %' },
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'avgRevenue', label: 'Avg Revenue' },
      { key: 'engagementScore', label: 'Engagement Score' },
      { key: 'activityLevel', label: 'Activity Level' },
      { key: 'status', label: 'Status' },
    ];

    const tableData = suppliers.map((supplier: any) => ({
      supplierName: supplier.name || 'Unknown',
      shopName: supplier.shopName || 'N/A',
      email: supplier.email || 'N/A',
      tags: supplier.tags && supplier.tags.length > 0 ? supplier.tags.join(', ') : 'None',
      totalQuotes: supplier.quoteMetrics?.total || 0,
      approvedQuotes: supplier.quoteMetrics?.approved || 0,
      completedQuotes: supplier.quoteMetrics?.completed || 0,
      approvalRate: `${(supplier.quoteMetrics?.approvalRate || 0).toFixed(1)}%`,
      completionRate: `${(supplier.quoteMetrics?.completionRate || 0).toFixed(1)}%`,
      totalRevenue: `$${(supplier.performanceMetrics?.totalRevenue || 0).toFixed(2)}`,
      avgRevenue: `$${(supplier.performanceMetrics?.avgRevenue || 0).toFixed(2)}`,
      engagementScore: (supplier.engagementScore || 0).toFixed(1),
      activityLevel: supplier.activityLevel || 'Low',
      status: supplier.isActive ? 'Active' : 'Inactive',
    }));

    return <DataTable columns={columns} data={tableData} />;
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
