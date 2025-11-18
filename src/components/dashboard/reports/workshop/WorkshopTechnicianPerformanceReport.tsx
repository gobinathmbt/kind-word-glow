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
  shouldLoad?: boolean;
}

export const WorkshopTechnicianPerformanceReport: React.FC<WorkshopTechnicianPerformanceReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopTechnicianPerformance(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load technician performance data');
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
    console.log(`Exporting technician performance as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const validTechnicians = data.technicianPerformance?.filter((t: any) => t._id) || [];
    const topTechnician = data.topTechnicians?.filter((t: any) => t.technicianName)?.[0];
    
    const totalTechnicians = validTechnicians.length;
    const totalWorkEntries = validTechnicians.reduce((sum: number, t: any) => sum + (t.totalWorkEntries || 0), 0);
    const avgQualityScore = validTechnicians.length > 0
      ? validTechnicians.reduce((sum: number, t: any) => sum + (t.avgQualityScore || 0), 0) / validTechnicians.length
      : 0;
    const avgCompletionTime = validTechnicians.length > 0
      ? validTechnicians.reduce((sum: number, t: any) => sum + (t.avgCompletionTime || 0), 0) / validTechnicians.length
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Top Technician"
          value={topTechnician?.technicianName || 'N/A'}
          icon={<Star className="h-5 w-5" />}
          subtitle={topTechnician ? `${topTechnician.workEntriesCompleted} work entries` : ''}
        />
        <MetricCard
          title="Total Technicians"
          value={totalTechnicians}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${totalWorkEntries} total work entries`}
        />
        <MetricCard
          title="Avg Quality Score"
          value={`${avgQualityScore.toFixed(1)}%`}
          icon={<Star className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Completion Time"
          value={`${(avgCompletionTime * 24).toFixed(1)}h`}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const workEntryColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
    const qualityScoreColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const completionTimeColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];

    const validTechnicians = data.technicianPerformance?.filter((t: any) => t._id) || [];
    
    const technicianWorkEntryData = validTechnicians
      .sort((a: any, b: any) => (b.totalWorkEntries || 0) - (a.totalWorkEntries || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item._id || 'Unknown',
        value: item.totalWorkEntries || 0,
        label: `${item.totalWorkEntries || 0}`,
        color: workEntryColors[index % workEntryColors.length],
      }));

    const technicianQualityData = validTechnicians
      .sort((a: any, b: any) => (b.avgQualityScore || 0) - (a.avgQualityScore || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item._id || 'Unknown',
        value: item.avgQualityScore || 0,
        label: `${(item.avgQualityScore || 0).toFixed(1)}%`,
        color: qualityScoreColors[index % qualityScoreColors.length],
      }));

    const technicianCompletionTimeData = validTechnicians
      .sort((a: any, b: any) => (a.avgCompletionTime || 0) - (b.avgCompletionTime || 0))
      .slice(0, 10)
      .map((item: any, index: number) => ({
        name: item._id || 'Unknown',
        value: (item.avgCompletionTime || 0) * 24, // Convert days to hours
        label: `${((item.avgCompletionTime || 0) * 24).toFixed(1)}h`,
        color: completionTimeColors[index % completionTimeColors.length],
      }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Top Technicians by Work Entries</h4>
          <ComparisonChart data={technicianWorkEntryData} height={300} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Quality Score Performance (Highest)</h4>
            <ComparisonChart data={technicianQualityData} height={250} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Completion Time Performance (Fastest)</h4>
            <ComparisonChart data={technicianCompletionTimeData} height={250} />
          </div>
        </div>
        {data.topTechnicians && data.topTechnicians.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Performing Technicians</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Technician</th>
                    <th className="px-4 py-3 text-right font-medium">Work Entries</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Time (h)</th>
                    <th className="px-4 py-3 text-right font-medium">Quality Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topTechnicians.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.technicianName || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.workEntriesCompleted || 0}</td>
                      <td className="px-4 py-3 text-right">{((item.avgCompletionTime || 0) * 24).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(item.qualityScore || 0).toFixed(1)}%</td>
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

    // Combine data from multiple sources for comprehensive table view
    const technicianPerformanceData = data.technicianPerformance?.filter((t: any) => t._id).map((item: any) => ({
      category: 'Performance Summary',
      technician: item._id || 'Unknown',
      totalWorkEntries: item.totalWorkEntries || 0,
      avgCompletionTime: `${((item.avgCompletionTime || 0) * 24).toFixed(1)}h`,
      avgQualityScore: `${(item.avgQualityScore || 0).toFixed(1)}%`,
      reportsWorkedOn: item.reportsWorkedOn || 0,
    })) || [];

    const topTechniciansData = data.topTechnicians?.filter((t: any) => t.technicianName).map((item: any) => ({
      category: 'Top Performers',
      technician: item.technicianName || 'Unknown',
      totalWorkEntries: item.workEntriesCompleted || 0,
      avgCompletionTime: `${((item.avgCompletionTime || 0) * 24).toFixed(1)}h`,
      avgQualityScore: `${(item.qualityScore || 0).toFixed(1)}%`,
      reportsWorkedOn: '-',
    })) || [];

    const tableData = [...technicianPerformanceData, ...topTechniciansData];

    const columns = [
      { key: 'category', label: 'Category' },
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
