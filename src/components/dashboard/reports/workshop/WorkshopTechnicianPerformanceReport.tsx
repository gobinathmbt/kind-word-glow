import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, Wrench, Clock, Star } from 'lucide-react';

interface WorkshopTechnicianPerformanceReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const WorkshopTechnicianPerformanceReport: React.FC<WorkshopTechnicianPerformanceReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopTechnicianPerformance(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load technician performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting technician performance as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.technicianPerformance || data.technicianPerformance.length === 0) return null;
    
    const totalTechnicians = data.technicianPerformance.length;
    const totalWorkEntries = data.technicianPerformance.reduce((sum: number, t: any) => sum + (t.totalWorkEntries || 0), 0);
    const avgQualityScore = data.technicianPerformance.reduce((sum: number, t: any) => sum + (t.avgQualityScore || 0), 0) / totalTechnicians;
    const avgCompletionTime = data.technicianPerformance.reduce((sum: number, t: any) => sum + (t.avgCompletionTime || 0), 0) / totalTechnicians;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Technicians"
          value={totalTechnicians}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Work Entries"
          value={totalWorkEntries}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Quality Score"
          value={`${(avgQualityScore * 100).toFixed(1)}%`}
          icon={<Star className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Completion Time"
          value={`${avgCompletionTime.toFixed(1)}h`}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const technicianComparisonData = data.technicianPerformance?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.totalWorkEntries || 0,
      percentage: 100,
    })) || [];

    const workEntryAnalysisData = data.workEntryTechnicianAnalysis?.map((item: any) => ({
      name: item.technicianName || item._id || 'Unknown',
      value: item.totalRevenue || 0,
      percentage: (item.completionRate || 0),
    })) || [];

    return (
      <div className="space-y-6">
        {technicianComparisonData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Technician Work Entry Comparison</h4>
            <ComparisonChart data={technicianComparisonData} height={300} />
          </div>
        )}

        {workEntryAnalysisData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Technician Revenue Performance</h4>
            <ComparisonChart data={workEntryAnalysisData} height={300} />
          </div>
        )}

        {data.topTechnicians && data.topTechnicians.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Performing Technicians</h4>
            <DataTable
              columns={[
                { key: 'technicianName', label: 'Technician' },
                { key: 'workEntriesCompleted', label: 'Work Entries' },
                { key: 'avgCompletionTime', label: 'Avg Time (h)' },
                { key: 'qualityScore', label: 'Quality Score' },
              ]}
              data={data.topTechnicians.map((item: any) => ({
                technicianName: item.technicianName || 'N/A',
                workEntriesCompleted: item.workEntriesCompleted || 0,
                avgCompletionTime: (item.avgCompletionTime || 0).toFixed(1),
                qualityScore: `${((item.qualityScore || 0) * 100).toFixed(1)}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.technicianPerformance) return null;

    const tableData = data.technicianPerformance.map((item: any) => ({
      technician: item._id || 'Unknown',
      totalWorkEntries: item.totalWorkEntries || 0,
      avgCompletionTime: `${(item.avgCompletionTime || 0).toFixed(1)}h`,
      avgQualityScore: `${((item.avgQualityScore || 0) * 100).toFixed(1)}%`,
      reportsWorkedOn: item.reportsWorkedOn || 0,
    }));

    const columns = [
      { key: 'technician', label: 'Technician' },
      { key: 'totalWorkEntries', label: 'Work Entries' },
      { key: 'avgCompletionTime', label: 'Avg Time' },
      { key: 'avgQualityScore', label: 'Quality Score' },
      { key: 'reportsWorkedOn', label: 'Reports' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Technician Performance"
      subtitle="Technician efficiency and quality metrics"
      icon={<Users className="h-5 w-5" />}
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

export default WorkshopTechnicianPerformanceReport;
