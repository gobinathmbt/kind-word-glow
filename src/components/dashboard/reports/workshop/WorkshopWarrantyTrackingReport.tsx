import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Shield, Calendar, Package, Users } from 'lucide-react';

interface WorkshopWarrantyTrackingReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const WorkshopWarrantyTrackingReport: React.FC<WorkshopWarrantyTrackingReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopWarrantyTracking(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load warranty tracking data');
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
    console.log(`Exporting warranty tracking as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.warrantySummary) return null;
    const summary = data.warrantySummary;
    
    // Get top part and supplier
    const validParts = data.warrantyByPart?.filter((p: any) => p._id && p.part) || [];
    const topPart = validParts.sort((a: any, b: any) => (b.count || 0) - (a.count || 0))[0];
    
    const validSuppliers = data.warrantyBySupplier?.filter((s: any) => s._id && s.supplier) || [];
    const topSupplier = validSuppliers.sort((a: any, b: any) => (b.totalWarranties || 0) - (a.totalWarranties || 0))[0];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Warranties"
          value={summary.totalWarranties || 0}
          icon={<Shield className="h-5 w-5" />}
          subtitle={`${summary.uniquePartsCount || 0} unique parts`}
        />
        <MetricCard
          title="Avg Warranty Period"
          value={`${(summary.avgWarrantyMonths || 0).toFixed(0)} months`}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Top Part"
          value={topPart?.part || 'N/A'}
          icon={<Package className="h-5 w-5" />}
          subtitle={topPart ? `${topPart.count || 0} warranties` : ''}
        />
        <MetricCard
          title="Top Supplier"
          value={topSupplier?.supplier || 'N/A'}
          icon={<Users className="h-5 w-5" />}
          subtitle={topSupplier ? `${topSupplier.totalWarranties || 0} warranties` : ''}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const durationColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const partColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const supplierColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];

    // Filter out null values
    const validParts = data.warrantyByPart?.filter((p: any) => p._id && p.part) || [];
    const validSuppliers = data.warrantyBySupplier?.filter((s: any) => s._id && s.supplier) || [];

    const warrantyDurationData: PieChartData[] = data.warrantyDurationDistribution?.map((item: any, index: number) => ({
      name: typeof item._id === 'string' ? item._id : `${item._id} months`,
      value: item.count || 0,
      color: durationColors[index % durationColors.length],
    })) || [];

    const warrantyByPartData = validParts
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.part || item._id || 'Unknown',
        value: item.count || 0,
        label: `${item.count || 0}`,
        color: partColors[index % partColors.length],
      }));

    const warrantyBySupplierData = validSuppliers
      .sort((a: any, b: any) => (b.totalWarranties || 0) - (a.totalWarranties || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item.supplier || item._id || 'Unknown',
        value: item.totalWarranties || 0,
        label: `${item.totalWarranties || 0}`,
        color: supplierColors[index % supplierColors.length],
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Warranty Duration Distribution</h4>
            <InteractivePieChart data={warrantyDurationData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top Parts with Warranties</h4>
            <ComparisonChart data={warrantyByPartData} height={300} />
          </div>
        </div>

        {warrantyBySupplierData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Warranties by Supplier</h4>
            <ComparisonChart data={warrantyBySupplierData} height={300} />
          </div>
        )}

        {data.warrantyDurationDistribution && data.warrantyDurationDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Warranty Duration Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.warrantyDurationDistribution.map((item: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{item.count || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {typeof item._id === 'string' ? item._id : `${item._id} months`}
                  </div>
                  {item.parts && item.parts.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {item.parts.length} part(s): {item.parts.slice(0, 3).join(', ')}
                      {item.parts.length > 3 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {validParts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Warranty Details by Part</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Part</th>
                    <th className="px-4 py-3 text-right font-medium">Warranties</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Period (months)</th>
                    <th className="px-4 py-3 text-right font-medium">Suppliers</th>
                  </tr>
                </thead>
                <tbody>
                  {validParts.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.part || item._id || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.count || 0}</td>
                      <td className="px-4 py-3 text-right">{item.avgWarrantyMonths ? (item.avgWarrantyMonths || 0).toFixed(0) : 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.supplierCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {validSuppliers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Warranty Details by Supplier</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Supplier</th>
                    <th className="px-4 py-3 text-right font-medium">Warranties</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Period (months)</th>
                    <th className="px-4 py-3 text-right font-medium">Parts</th>
                  </tr>
                </thead>
                <tbody>
                  {validSuppliers.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.supplier || item._id || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.totalWarranties || 0}</td>
                      <td className="px-4 py-3 text-right">{item.avgWarrantyMonths ? (item.avgWarrantyMonths || 0).toFixed(0) : 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.partsCount || 0}</td>
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

    // Filter out null values and combine data from multiple sources
    const validParts = data.warrantyByPart?.filter((p: any) => p._id && p.part) || [];
    const validSuppliers = data.warrantyBySupplier?.filter((s: any) => s._id && s.supplier) || [];

    const partData = validParts.map((item: any) => ({
      category: 'By Part',
      name: item.part || item._id || 'Unknown',
      warranties: item.count || 0,
      avgPeriod: item.avgWarrantyMonths ? `${(item.avgWarrantyMonths || 0).toFixed(0)} months` : 'N/A',
      relatedCount: item.supplierCount || 0,
      relatedLabel: 'Suppliers',
    }));

    const supplierData = validSuppliers.map((item: any) => ({
      category: 'By Supplier',
      name: item.supplier || item._id || 'Unknown',
      warranties: item.totalWarranties || 0,
      avgPeriod: item.avgWarrantyMonths ? `${(item.avgWarrantyMonths || 0).toFixed(0)} months` : 'N/A',
      relatedCount: item.partsCount || 0,
      relatedLabel: 'Parts',
    }));

    const tableData = [...partData, ...supplierData];

    const columns = [
      { key: 'category', label: 'Category' },
      { key: 'name', label: 'Name' },
      { key: 'warranties', label: 'Warranties' },
      { key: 'avgPeriod', label: 'Avg Period' },
      { key: 'relatedCount', label: 'Related' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Warranty Tracking"
      subtitle="Warranty claims and coverage analysis"
      icon={<Shield className="h-5 w-5" />}
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

export default WorkshopWarrantyTrackingReport;
