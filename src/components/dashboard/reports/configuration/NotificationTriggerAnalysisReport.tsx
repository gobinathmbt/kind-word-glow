import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Zap, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface NotificationTriggerAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const NotificationTriggerAnalysisReport: React.FC<NotificationTriggerAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getNotificationTriggerAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notification trigger analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting notification trigger analysis as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Triggers"
          value={summary.totalTriggers || 0}
          icon={<Zap className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Triggers"
          value={summary.activeTriggers || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Effectiveness"
          value={`${summary.avgEffectiveness || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Fired"
          value={summary.totalFired || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const triggerTypeData: PieChartData[] = data.triggersByType?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const effectivenessData = data.triggers?.slice(0, 10).map((trigger: any) => ({
      name: trigger.triggerName || 'Unknown',
      effectiveness: trigger.effectivenessScore || 0,
      fired: trigger.firedCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Triggers by Type</h4>
            <InteractivePieChart data={triggerTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Effectiveness</h4>
            <StackedBarChart
              data={effectivenessData}
              xAxisKey="name"
              series={[
                { dataKey: 'effectiveness', name: 'Effectiveness %', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.triggers && data.triggers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Trigger Details</h4>
            <DataTable
              columns={[
                { key: 'triggerName', label: 'Trigger' },
                { key: 'type', label: 'Type' },
                { key: 'fired', label: 'Fired' },
                { key: 'effectiveness', label: 'Effectiveness' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.triggers.slice(0, 20).map((trigger: any) => ({
                triggerName: trigger.triggerName || 'N/A',
                type: trigger.triggerType || 'N/A',
                fired: trigger.firedCount || 0,
                effectiveness: `${trigger.effectivenessScore || 0}%`,
                status: trigger.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.triggers) return null;

    const tableData = data.triggers.map((trigger: any) => ({
      triggerName: trigger.triggerName || 'Unknown',
      triggerType: trigger.triggerType || 'Unknown',
      firedCount: trigger.firedCount || 0,
      successCount: trigger.successCount || 0,
      effectivenessScore: `${trigger.effectivenessScore || 0}%`,
      avgResponseTime: `${trigger.avgResponseTime || 0}ms`,
      isActive: trigger.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'triggerName', label: 'Trigger' },
      { key: 'triggerType', label: 'Type' },
      { key: 'firedCount', label: 'Fired Count' },
      { key: 'successCount', label: 'Success Count' },
      { key: 'effectivenessScore', label: 'Effectiveness' },
      { key: 'avgResponseTime', label: 'Avg Response Time' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Notification Trigger Analysis"
      subtitle="Trigger effectiveness and performance"
      icon={<Zap className="h-5 w-5" />}
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

export default NotificationTriggerAnalysisReport;
