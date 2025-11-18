import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, MessageSquare, Heart, TrendingUp } from 'lucide-react';

interface SupplierRelationshipMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const SupplierRelationshipMetricsReport: React.FC<SupplierRelationshipMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getSupplierRelationshipMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier relationship data');
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
    console.log(`Exporting supplier relationship report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const summary = data.summary || {};
    const totalSuppliers = summary.totalSuppliers || 0;
    const activeSuppliers = summary.activeSuppliers || 0;
    const suppliersWithCommunication = summary.suppliersWithCommunication || 0;
    const avgRelationshipStrength = summary.avgRelationshipStrength || 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Suppliers"
          value={totalSuppliers}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${activeSuppliers} active`}
        />
        <MetricCard
          title="With Communication"
          value={suppliersWithCommunication}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Relationship Strength"
          value={avgRelationshipStrength.toFixed(1)}
          icon={<Heart className="h-5 w-5" />}
        />
        <MetricCard
          title="With Completed Work"
          value={summary.suppliersWithCompletedWork || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const relationships = data.relationships || [];
    const summary = data.summary || {};
    const relationshipDist = summary.relationshipDistribution || {};
    const engagementDist = summary.engagementDistribution || {};

    // Color palettes
    const relationshipColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const engagementColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const strengthColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

    // Relationship Level Distribution
    const relationshipLevelData: PieChartData[] = [
      { name: 'Strong', value: relationshipDist.strong || 0, label: `${relationshipDist.strong || 0} suppliers`, color: relationshipColors[0] },
      { name: 'Moderate', value: relationshipDist.moderate || 0, label: `${relationshipDist.moderate || 0} suppliers`, color: relationshipColors[1] },
      { name: 'Developing', value: relationshipDist.developing || 0, label: `${relationshipDist.developing || 0} suppliers`, color: relationshipColors[2] },
      { name: 'Weak', value: relationshipDist.weak || 0, label: `${relationshipDist.weak || 0} suppliers`, color: relationshipColors[3] },
    ].filter(item => item.value > 0);

    // Engagement Status Distribution
    const engagementStatusData: PieChartData[] = [
      { name: 'Active', value: engagementDist.active || 0, label: `${engagementDist.active || 0} suppliers`, color: engagementColors[0] },
      { name: 'Moderate', value: engagementDist.moderate || 0, label: `${engagementDist.moderate || 0} suppliers`, color: engagementColors[1] },
      { name: 'Inactive', value: engagementDist.inactive || 0, label: `${engagementDist.inactive || 0} suppliers`, color: engagementColors[2] },
      { name: 'No Activity', value: engagementDist.noActivity || 0, label: `${engagementDist.noActivity || 0} suppliers`, color: engagementColors[3] },
    ].filter(item => item.value > 0);

    // Top Suppliers by Relationship Strength
    const topSuppliers = relationships
      .sort((a: any, b: any) => (b.relationshipStrength || 0) - (a.relationshipStrength || 0))
      .slice(0, 10)
      .map((supplier: any, index: number) => ({
        name: supplier.name || 'Unknown',
        value: supplier.relationshipStrength || 0,
        label: `${(supplier.relationshipStrength || 0).toFixed(1)}`,
        color: strengthColors[index % strengthColors.length],
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Relationship Level Distribution</h4>
            <InteractivePieChart data={relationshipLevelData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement Status Distribution</h4>
            <InteractivePieChart data={engagementStatusData} height={300} />
          </div>
        </div>
        {topSuppliers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Suppliers by Relationship Strength</h4>
            <ComparisonChart data={topSuppliers} height={300} />
          </div>
        )}
        {relationships.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Supplier Relationship Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Supplier</th>
                    <th className="px-4 py-3 text-right font-medium">Account Age (days)</th>
                    <th className="px-4 py-3 text-right font-medium">Total Messages</th>
                    <th className="px-4 py-3 text-right font-medium">Total Quotes</th>
                    <th className="px-4 py-3 text-right font-medium">Success Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Lifetime Value</th>
                    <th className="px-4 py-3 text-right font-medium">Relationship Strength</th>
                    <th className="px-4 py-3 text-left font-medium">Relationship Level</th>
                    <th className="px-4 py-3 text-left font-medium">Engagement Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relationships.map((supplier: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{supplier.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{supplier.shopName || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{supplier.accountAge?.days || 0}</td>
                      <td className="px-4 py-3 text-right">{supplier.communicationMetrics?.totalMessages || 0}</td>
                      <td className="px-4 py-3 text-right">{supplier.engagementMetrics?.totalQuotes || 0}</td>
                      <td className="px-4 py-3 text-right">{(supplier.collaborationMetrics?.successRate || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">${(supplier.valueMetrics?.lifetimeValue || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{(supplier.relationshipStrength || 0).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          supplier.relationshipLevel === 'Strong' ? 'bg-green-100 text-green-800' :
                          supplier.relationshipLevel === 'Moderate' ? 'bg-blue-100 text-blue-800' :
                          supplier.relationshipLevel === 'Developing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {supplier.relationshipLevel || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          supplier.engagementStatus === 'Active' ? 'bg-green-100 text-green-800' :
                          supplier.engagementStatus === 'Moderate' ? 'bg-blue-100 text-blue-800' :
                          supplier.engagementStatus === 'Inactive' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {supplier.engagementStatus || 'N/A'}
                        </span>
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

    const relationships = data.relationships || [];

    const columns = [
      { key: 'supplierName', label: 'Supplier' },
      { key: 'shopName', label: 'Shop Name' },
      { key: 'accountAgeDays', label: 'Account Age (days)' },
      { key: 'totalMessages', label: 'Total Messages' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'approvedQuotes', label: 'Approved Quotes' },
      { key: 'completedQuotes', label: 'Completed Quotes' },
      { key: 'successRate', label: 'Success Rate %' },
      { key: 'lifetimeValue', label: 'Lifetime Value' },
      { key: 'relationshipStrength', label: 'Relationship Strength' },
      { key: 'relationshipLevel', label: 'Relationship Level' },
      { key: 'engagementStatus', label: 'Engagement Status' },
    ];

    const tableData = relationships.map((supplier: any) => ({
      supplierName: supplier.name || 'Unknown',
      shopName: supplier.shopName || 'N/A',
      accountAgeDays: supplier.accountAge?.days || 0,
      totalMessages: supplier.communicationMetrics?.totalMessages || 0,
      totalQuotes: supplier.engagementMetrics?.totalQuotes || 0,
      approvedQuotes: supplier.collaborationMetrics?.approvedQuotes || 0,
      completedQuotes: supplier.collaborationMetrics?.completedQuotes || 0,
      successRate: `${(supplier.collaborationMetrics?.successRate || 0).toFixed(1)}%`,
      lifetimeValue: `$${(supplier.valueMetrics?.lifetimeValue || 0).toFixed(2)}`,
      relationshipStrength: (supplier.relationshipStrength || 0).toFixed(1),
      relationshipLevel: supplier.relationshipLevel || 'N/A',
      engagementStatus: supplier.engagementStatus || 'N/A',
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Supplier Relationship Metrics"
      subtitle="Engagement and communication metrics"
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

export default SupplierRelationshipMetricsReport;
