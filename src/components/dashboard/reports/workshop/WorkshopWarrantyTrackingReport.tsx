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
}

export const WorkshopWarrantyTrackingReport: React.FC<WorkshopWarrantyTrackingReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopWarrantyTracking(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load warranty tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting warranty tracking as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.warrantySummary) return null;
    const summary = data.warrantySummary;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Warranties"
          value={summary.totalWarranties || 0}
          icon={<Shield className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Warranty Period"
          value={`${(summary.avgWarrantyMonths || 0).toFixed(0)} months`}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Unique Parts"
          value={summary.uniquePartsCount || 0}
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          title="Unique Suppliers"
          value={summary.uniqueSuppliersCount || 0}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const warrantyDurationData: PieChartData[] = data.warrantyDurationDistribution?.map((item: any) => ({
      name: typeof item._id === 'string' ? item._id : `${item._id} months`,
      value: item.count || 0,
    })) || [];

    const warrantyByPartData = data.warrantyByPart?.map((item: any) => ({
      name: item.part || item._id || 'Unknown',
      value: item.count || 0,
      percentage: 100,
    })) || [];

    const warrantyBySupplierData = data.warrantyBySupplier?.map((item: any) => ({
      name: item.supplier || item._id || 'Unknown',
      value: item.totalWarranties || 0,
      percentage: 100,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Warranty Duration Distribution</h4>
            <InteractivePieChart data={warrantyDurationData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top Parts with Warranties</h4>
            <ComparisonChart data={warrantyByPartData.slice(0, 10)} height={300} />
          </div>
        </div>

        {warrantyBySupplierData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Warranties by Supplier</h4>
            <ComparisonChart data={warrantyBySupplierData} height={300} />
          </div>
        )}

        {data.warrantyByPart && data.warrantyByPart.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Warranty Details by Part</h4>
            <DataTable
              columns={[
                { key: 'part', label: 'Part' },
                { key: 'count', label: 'Warranties' },
                { key: 'avgWarrantyMonths', label: 'Avg Period (months)' },
                { key: 'supplierCount', label: 'Suppliers' },
              ]}
              data={data.warrantyByPart.slice(0, 20).map((item: any) => ({
                part: item.part || item._id || 'N/A',
                count: item.count || 0,
                avgWarrantyMonths: (item.avgWarrantyMonths || 0).toFixed(0),
                supplierCount: item.supplierCount || 0,
              }))}
            />
          </div>
        )}

        {data.warrantyBySupplier && data.warrantyBySupplier.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Warranty Details by Supplier</h4>
            <DataTable
              columns={[
                { key: 'supplier', label: 'Supplier' },
                { key: 'totalWarranties', label: 'Warranties' },
                { key: 'avgWarrantyMonths', label: 'Avg Period (months)' },
                { key: 'partsCount', label: 'Parts' },
              ]}
              data={data.warrantyBySupplier.map((item: any) => ({
                supplier: item.supplier || item._id || 'N/A',
                totalWarranties: item.totalWarranties || 0,
                avgWarrantyMonths: (item.avgWarrantyMonths || 0).toFixed(0),
                partsCount: item.partsCount || 0,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.warrantyByPart) return null;

    const tableData = data.warrantyByPart.map((item: any) => ({
      part: item.part || item._id || 'Unknown',
      count: item.count || 0,
      avgWarrantyMonths: `${(item.avgWarrantyMonths || 0).toFixed(0)} months`,
      supplierCount: item.supplierCount || 0,
    }));

    const columns = [
      { key: 'part', label: 'Part' },
      { key: 'count', label: 'Warranties' },
      { key: 'avgWarrantyMonths', label: 'Avg Period' },
      { key: 'supplierCount', label: 'Suppliers' },
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
