import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Paperclip } from 'lucide-react';

interface VehicleAttachmentAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const VehicleAttachmentAnalysisReport: React.FC<VehicleAttachmentAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleAttachmentAnalysis(params);
      console.log('Attachment Analysis API Response:', response);
      console.log('Attachment Analysis Data:', response.data?.data);
      setData(response.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load attachment analysis data');
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
    console.log(`Exporting attachment analysis report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.attachmentOverview) return null;
    
    const totalAttachments = data.attachmentOverview.reduce((sum: number, item: any) => sum + item.count, 0);
    const totalSizeMB = data.attachmentOverview.reduce((sum: number, item: any) => sum + (item.totalSizeMB || 0), 0);
    const imageData = data.attachmentOverview.find((item: any) => item._id === 'image');
    const fileData = data.attachmentOverview.find((item: any) => item._id === 'file');
    
    const totalVehicles = data.avgAttachmentsPerVehicle?.reduce((sum: number, item: any) => sum + item.totalVehicles, 0) || 0;
    const avgPerVehicle = totalVehicles > 0 ? totalAttachments / totalVehicles : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Attachments"
          value={totalAttachments.toLocaleString()}
          icon={<Paperclip className="h-5 w-5" />}
          subtitle={`${totalSizeMB.toFixed(2)} MB total`}
        />
        <MetricCard
          title="Avg per Vehicle"
          value={avgPerVehicle.toFixed(1)}
          subtitle={`${totalVehicles} vehicles`}
        />
        <MetricCard
          title="Images"
          value={(imageData?.count || 0).toLocaleString()}
          subtitle={`${(imageData?.totalSizeMB || 0).toFixed(2)} MB`}
        />
        <MetricCard
          title="Files"
          value={(fileData?.count || 0).toLocaleString()}
          subtitle={`${(fileData?.totalSizeMB || 0).toFixed(2)} MB`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Attachment Type Distribution Pie Chart
    const typeColors: Record<string, string> = {
      'Image': '#3b82f6',
      'File': '#10b981',
      'Null': '#6b7280',
    };

    const typeData: PieChartData[] = data.attachmentOverview
      ?.filter((item: any) => item.count > 0 && item._id)
      .map((item: any) => {
        const name = item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Unknown';
        return {
          name,
          value: item.count,
          color: typeColors[name] || '#6b7280',
        };
      }) || [];

    // Attachments per Vehicle by Type
    const avgAttachmentsData = data.avgAttachmentsPerVehicle?.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      withAttachments: item.vehiclesWithAttachments,
      withoutAttachments: item.vehiclesWithoutAttachments,
      avgAttachments: item.avgAttachments,
      avgImages: item.avgImages,
      avgFiles: item.avgFiles,
      coverage: item.attachmentCoverage,
    })) || [];

    // Image Category Analysis
    const imageCategoryData = data.imageCategoryAnalysis?.map((item: any) => ({
      category: item._id || 'Unknown',
      count: item.count,
      avgSizeMB: item.avgSizeMB,
      totalSizeMB: item.totalSizeMB,
    })) || [];

    // MIME Type Distribution
    const mimeTypeData = data.mimeTypeDistribution
      ?.filter((item: any) => item._id && item.count > 100)
      .map((item: any) => ({
        mimeType: item._id.split('/')[1] || item._id,
        count: item.count,
        avgSizeMB: item.avgSizeMB || 0,
      })) || [];

    // Upload Timeline
    const timelineData: any[] = [];
    const monthMap = new Map<string, any>();
    
    data.uploadTimeline?.forEach((item: any) => {
      if (!item._id.year || !item._id.month) return;
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { 
          month: key, 
          year: item._id.year, 
          monthNum: item._id.month 
        });
      }
      const monthData = monthMap.get(key);
      if (item._id.type) {
        monthData[`${item._id.type}_count`] = item.count;
        monthData[`${item._id.type}_sizeMB`] = item.totalSizeMB;
      }
    });
    
    timelineData.push(...Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    }));

    // Dealership Comparison
    const dealershipData = data.dealershipComparison
      ?.filter((item: any) => item.totalVehicles > 0)
      .map((item: any) => ({
        dealership: item._id || 'No Dealership',
        totalVehicles: item.totalVehicles,
        totalAttachments: item.totalAttachments,
        avgAttachments: item.avgAttachmentsPerVehicle,
        totalStorageMB: item.totalStorageSizeMB,
        avgStorageMB: item.avgStoragePerVehicleMB,
      })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Attachment Type Distribution</h4>
            <InteractivePieChart data={typeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Attachments by Vehicle Type</h4>
            <StackedBarChart
              data={avgAttachmentsData}
              xAxisKey="type"
              series={[
                { dataKey: 'withAttachments', name: 'With Attachments', color: '#10b981' },
                { dataKey: 'withoutAttachments', name: 'Without Attachments', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Upload Timeline</h4>
            <LineChart
              data={timelineData}
              xAxisKey="month"
              lines={[
                { dataKey: 'image_count', name: 'Images', color: '#3b82f6' },
                { dataKey: 'file_count', name: 'Files', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Image Category Distribution</h4>
            <StackedBarChart
              data={imageCategoryData}
              xAxisKey="category"
              series={[
                { dataKey: 'count', name: 'Count', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Dealership Storage Comparison</h4>
          <StackedBarChart
            data={dealershipData}
            xAxisKey="dealership"
            series={[
              { dataKey: 'totalAttachments', name: 'Total Attachments', color: '#3b82f6' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.avgAttachmentsPerVehicle) return null;

    const columns = [
      { key: 'type', label: 'Vehicle Type', sortable: true },
      { key: 'totalVehicles', label: 'Total Vehicles', sortable: true },
      { key: 'withAttachments', label: 'With Attachments', sortable: true },
      { key: 'withoutAttachments', label: 'Without Attachments', sortable: true },
      { key: 'avgAttachments', label: 'Avg Attachments', sortable: true },
      { key: 'avgImages', label: 'Avg Images', sortable: true },
      { key: 'avgFiles', label: 'Avg Files', sortable: true },
      { key: 'coverage', label: 'Coverage %', sortable: true },
    ];

    const tableData = data.avgAttachmentsPerVehicle.map((item: any) => ({
      type: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      totalVehicles: item.totalVehicles,
      withAttachments: item.vehiclesWithAttachments,
      withoutAttachments: item.vehiclesWithoutAttachments,
      avgAttachments: item.avgAttachments.toFixed(2),
      avgImages: item.avgImages.toFixed(2),
      avgFiles: item.avgFiles.toFixed(2),
      coverage: `${item.attachmentCoverage.toFixed(1)}%`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Attachment Analysis"
      subtitle="Attachment patterns, storage metrics, and coverage analysis"
      icon={<Paperclip className="h-5 w-5" />}
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

export default VehicleAttachmentAnalysisReport;
