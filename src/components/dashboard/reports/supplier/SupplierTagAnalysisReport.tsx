import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Tag, Tags, TrendingUp, Users } from 'lucide-react';

interface SupplierTagAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const SupplierTagAnalysisReport: React.FC<SupplierTagAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getSupplierTagAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier tag analysis data');
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
    console.log(`Exporting supplier tag analysis report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const tagStats = data.tagStats || {};
    const tagDistribution = data.tagDistribution || [];
    const mostPopularTag = tagDistribution.length > 0 
      ? tagDistribution.sort((a: any, b: any) => (b.supplierCount || 0) - (a.supplierCount || 0))[0]
      : null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Unique Tags"
          value={tagStats.uniqueTags || 0}
          icon={<Tags className="h-5 w-5" />}
          subtitle={`${tagStats.totalSuppliers || 0} total suppliers`}
        />
        <MetricCard
          title="Most Popular Tag"
          value={mostPopularTag?._id || 'N/A'}
          icon={<Tag className="h-5 w-5" />}
          subtitle={mostPopularTag ? `${mostPopularTag.supplierCount} suppliers` : ''}
        />
        <MetricCard
          title="Avg Tags/Supplier"
          value={(tagStats.avgTagsPerSupplier || 0).toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Tag Coverage"
          value={`${tagStats.tagCoverageRate || 0}%`}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${tagStats.suppliersWithTags || 0}/${tagStats.totalSuppliers || 0} with tags`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const tagColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
    const combinationColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

    const tagDistribution = data.tagDistribution || [];
    const tagCombinations = data.tagCombinations || [];
    const commonTagPairs = data.commonTagPairs || [];

    // Tag Distribution by Supplier Count
    const tagData = tagDistribution
      .sort((a: any, b: any) => (b.supplierCount || 0) - (a.supplierCount || 0))
      .slice(0, 10)
      .map((tag: any, index: number) => ({
        name: tag._id || 'Unknown',
        value: tag.supplierCount || 0,
        label: `${tag.supplierCount || 0} suppliers`,
        color: tagColors[index % tagColors.length],
      }));

    // Tag Combination Distribution
    const combinationData: PieChartData[] = tagCombinations.map((combo: any, index: number) => ({
      name: combo._id === 0 ? 'No Tags' : `${combo._id} Tag${combo._id > 1 ? 's' : ''}`,
      value: combo.count || 0,
      label: `${combo.count || 0} suppliers`,
      color: combinationColors[index % combinationColors.length],
    }));

    // Common Tag Pairs - format the tag pair names for better display
    const tagPairData = commonTagPairs
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, 10)
      .map((pair: any, index: number) => ({
        name: pair._id || 'Unknown',
        value: pair.count || 0,
        color: tagColors[index % tagColors.length],
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Tags by Supplier Count</h4>
            <ComparisonChart data={tagData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Tag Combination Distribution</h4>
            <InteractivePieChart data={combinationData} height={300} />
          </div>
        </div>
        {tagPairData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Common Tag Pairs</h4>
            <ComparisonChart data={tagPairData} height={400} showPercentages={false} />
          </div>
        )}
        {tagDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Tag Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Tag</th>
                    <th className="px-4 py-3 text-right font-medium">Supplier Count</th>
                    <th className="px-4 py-3 text-right font-medium">Active Suppliers</th>
                    <th className="px-4 py-3 text-left font-medium">Suppliers</th>
                  </tr>
                </thead>
                <tbody>
                  {tagDistribution.map((tag: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{tag._id || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right">{tag.supplierCount || 0}</td>
                      <td className="px-4 py-3 text-right">{tag.activeSuppliers || 0}</td>
                      <td className="px-4 py-3">
                        {tag.suppliers && tag.suppliers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tag.suppliers.map((supplier: any, sIndex: number) => (
                              <span key={sIndex} className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                                {supplier.name}
                              </span>
                            ))}
                          </div>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {commonTagPairs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Common Tag Pair Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Tag Pair</th>
                    <th className="px-4 py-3 text-right font-medium">Count</th>
                    <th className="px-4 py-3 text-left font-medium">Suppliers</th>
                  </tr>
                </thead>
                <tbody>
                  {commonTagPairs.map((pair: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{pair._id || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right">{pair.count || 0}</td>
                      <td className="px-4 py-3">
                        {pair.suppliers && pair.suppliers.length > 0 
                          ? pair.suppliers.join(', ') 
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tagCombinations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Tag Combination Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tagCombinations.map((combo: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{combo.count || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {combo._id === 0 ? 'No Tags' : `${combo._id} Tag${combo._id > 1 ? 's' : ''}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {combo.activeCount || 0} active supplier{(combo.activeCount || 0) !== 1 ? 's' : ''}
                  </div>
                  {combo.suppliers && combo.suppliers.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {combo.suppliers.map((supplier: any, sIndex: number) => (
                        <div key={sIndex} className="text-xs border-t pt-1">
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.tags && supplier.tags.length > 0 && (
                            <div className="text-gray-500 truncate">
                              {supplier.tags.slice(0, 2).join(', ')}
                              {supplier.tags.length > 2 && ` +${supplier.tags.length - 2}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    const tagDistribution = data.tagDistribution || [];

    const columns = [
      { key: 'tag', label: 'Tag' },
      { key: 'supplierCount', label: 'Supplier Count' },
      { key: 'activeSuppliers', label: 'Active Suppliers' },
      { key: 'suppliers', label: 'Supplier Names' },
    ];

    const tableData = tagDistribution.map((tag: any) => ({
      tag: tag._id || 'Unknown',
      supplierCount: tag.supplierCount || 0,
      activeSuppliers: tag.activeSuppliers || 0,
      suppliers: tag.suppliers && tag.suppliers.length > 0 
        ? tag.suppliers.map((s: any) => s.name).join(', ') 
        : 'N/A',
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Supplier Tag Analysis"
      subtitle="Tag-based categorization"
      icon={<Tags className="h-5 w-5" />}
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

export default SupplierTagAnalysisReport;
