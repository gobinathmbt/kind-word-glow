import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Gauge } from 'lucide-react';

interface VehicleEngineSpecificationsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const VehicleEngineSpecificationsReport: React.FC<VehicleEngineSpecificationsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleEngineSpecifications(params);
      console.log('Engine Specifications API Response:', response);
      console.log('Engine Specifications Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load engine specifications data');
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
    console.log(`Exporting engine specifications report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const totalVehicles = data.engineTypeDistribution?.reduce((sum: number, item: any) => sum + item.totalCount, 0) || 0;
    const avgEngineSize = data.engineTypeDistribution?.reduce((sum: number, item: any) => sum + (item.avgEngineSize || 0), 0) / 
      (data.engineTypeDistribution?.filter((item: any) => item.avgEngineSize).length || 1);
    const avgCylinders = data.engineTypeDistribution?.reduce((sum: number, item: any) => sum + (item.avgCylinders || 0), 0) / 
      (data.engineTypeDistribution?.filter((item: any) => item.avgCylinders).length || 1);
    
    const turboCount = data.turboAnalysis?.find((item: any) => item._id === '122')?.count || 0;
    const nonTurboCount = data.turboAnalysis?.find((item: any) => item._id === null)?.count || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={<Gauge className="h-5 w-5" />}
          subtitle={`${avgCylinders.toFixed(1)} avg cylinders`}
        />
        <MetricCard
          title="Avg Engine Size"
          value={`${avgEngineSize.toFixed(0)}cc`}
          subtitle="Average displacement"
        />
        <MetricCard
          title="Turbocharged"
          value={turboCount}
          subtitle={`${((turboCount / totalVehicles) * 100).toFixed(1)}% of total`}
        />
        <MetricCard
          title="Naturally Aspirated"
          value={nonTurboCount}
          subtitle={`${((nonTurboCount / totalVehicles) * 100).toFixed(1)}% of total`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Fuel Type Distribution Pie Chart
    const fuelTypeColors: Record<string, string> = {
      'Petrol': '#3b82f6',
      'Diesel': '#10b981',
      'Hybrid': '#f59e0b',
      'Electric': '#8b5cf6',
      'Unknown': '#6b7280',
    };

    const fuelTypeData: PieChartData[] = data.fuelTypeAnalysis
      ?.filter((item: any) => item._id && item._id !== '' && item.totalCount > 20)
      .slice(0, 5)
      .map((item: any) => {
        const name = item._id === '90' ? 'Petrol' : 
                     item._id === '1814' ? 'Hybrid' : 
                     item._id === '89' ? 'Diesel' : 
                     item._id === '95' ? 'Electric' : 'Other';
        return {
          name,
          value: item.totalCount,
          color: fuelTypeColors[name] || '#6b7280',
        };
      }) || [];

    // Transmission Distribution
    const transmissionData: PieChartData[] = data.transmissionDistribution
      ?.filter((item: any) => item._id && item._id !== '' && item.count > 20)
      .slice(0, 5)
      .map((item: any, index: number) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
        const name = item._id === '117' ? 'Automatic' : 
                     item._id === '118' ? 'Manual' : 
                     item._id === '108' ? 'CVT' : `Type ${item._id}`;
        return {
          name,
          value: item.count,
          color: colors[index % colors.length],
        };
      }) || [];

    // Engine Size Distribution
    const engineSizeData = data.engineSizeDistribution
      ?.filter((item: any) => item._id !== '10000+')
      .map((item: any) => {
        let rangeLabel = '';
        if (item._id === 0) {
          rangeLabel = '0-1000cc';
        } else {
          const start = item._id;
          const end = start + 500;
          rangeLabel = `${start}-${end}cc`;
        }
        return {
          range: rangeLabel,
          count: item.count,
          avgCylinders: item.avgCylinders || 0,
        };
      }) || [];

    // Cylinder Distribution
    const cylinderData = data.cylinderDistribution
      ?.filter((item: any) => item._id !== null && item.count > 0)
      .map((item: any) => ({
        cylinders: `${item._id} Cyl`,
        count: item.count,
        avgEngineSize: item.avgEngineSize || 0,
      })) || [];

    // Engine Type by Vehicle Type
    const engineTypeByVehicleData = data.engineTypeDistribution
      ?.filter((item: any) => item._id && item._id !== '' && item.totalCount > 10)
      .slice(0, 8)
      .map((item: any) => {
        const typeObj: any = { 
          engineType: item._id,
          total: item.totalCount,
          avgEngineSize: item.avgEngineSize || 0,
          avgCylinders: item.avgCylinders || 0,
        };
        item.vehicleTypeBreakdown?.forEach((vType: any) => {
          typeObj[vType.type] = vType.count;
        });
        return typeObj;
      }) || [];

    // Turbo Analysis
    const turboData: PieChartData[] = [
      { name: 'Turbocharged', value: data.turboAnalysis?.find((item: any) => item._id === '122')?.count || 0, color: '#ef4444' },
      { name: 'Non-Turbo', value: data.turboAnalysis?.find((item: any) => item._id === null)?.count || 0, color: '#3b82f6' },
    ].filter(item => item.value > 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Fuel Type Distribution</h4>
            <InteractivePieChart data={fuelTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Transmission Distribution</h4>
            <InteractivePieChart data={transmissionData} height={300} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Turbo vs Non-Turbo</h4>
            <InteractivePieChart data={turboData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Cylinder Distribution</h4>
            <StackedBarChart
              data={cylinderData}
              xAxisKey="cylinders"
              series={[
                { dataKey: 'count', name: 'Count', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Engine Size Distribution</h4>
            <StackedBarChart
              data={engineSizeData}
              xAxisKey="range"
              series={[
                { dataKey: 'count', name: 'Count', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Engine Type by Vehicle Type</h4>
            <StackedBarChart
              data={engineTypeByVehicleData}
              xAxisKey="engineType"
              series={[
                { dataKey: 'inspection', name: 'Inspection', color: '#3b82f6' },
                { dataKey: 'tradein', name: 'Trade-in', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.engineTypeDistribution) return null;

    const columns = [
      { key: 'engineType', label: 'Engine Type', sortable: true },
      { key: 'totalCount', label: 'Total', sortable: true },
      { key: 'avgEngineSize', label: 'Avg Size (cc)', sortable: true },
      { key: 'avgCylinders', label: 'Avg Cylinders', sortable: true },
      { key: 'inspection', label: 'Inspection', sortable: true },
      { key: 'tradein', label: 'Trade-in', sortable: true },
    ];

    const tableData = data.engineTypeDistribution
      .filter((item: any) => item._id && item.totalCount > 0)
      .map((item: any) => {
        const inspection = item.vehicleTypeBreakdown?.find((v: any) => v.type === 'inspection')?.count || 0;
        const tradein = item.vehicleTypeBreakdown?.find((v: any) => v.type === 'tradein')?.count || 0;
        
        return {
          engineType: item._id,
          totalCount: item.totalCount,
          avgEngineSize: item.avgEngineSize ? Math.round(item.avgEngineSize) : 'N/A',
          avgCylinders: item.avgCylinders ? item.avgCylinders.toFixed(1) : 'N/A',
          inspection,
          tradein,
        };
      });

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Engine Specifications"
      subtitle="Engine types, transmission, fuel, and performance analysis"
      icon={<Gauge className="h-5 w-5" />}
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

export default VehicleEngineSpecificationsReport;
