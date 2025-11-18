import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign, Globe, TrendingUp, Layers } from 'lucide-react';

interface CostCurrencyDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const CostCurrencyDistributionReport: React.FC<CostCurrencyDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getCostCurrencyDistribution(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost currency distribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting cost currency distribution as ${format}`);
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
          title="Total Currencies"
          value={summary.totalCurrenciesUsed || 0}
          icon={<Globe className="h-5 w-5" />}
          subtitle={`${summary.activeCurrenciesCount || 0} active, ${summary.unusedCurrenciesCount || 0} unused`}
        />
        <MetricCard
          title="Total Cost Types"
          value={summary.totalCostTypes || 0}
          icon={<Layers className="h-5 w-5" />}
          subtitle={`Avg ${summary.avgCostTypesPerCurrency || 0} per currency`}
        />
        <MetricCard
          title="Currency Utilization"
          value={`${summary.currencyUtilizationRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`Diversity: ${summary.currencyDiversity || 'N/A'}`}
        />
        <MetricCard
          title="Configuration Health"
          value={summary.configurationHealth || 'N/A'}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={`${summary.changeCurrencyPercentage || 0}% changeable`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const sectionColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const currencyColors = ['#10b981', '#3b82f6'];

    // Section Type Distribution
    const sectionTypeData: PieChartData[] = data.sectionTypeCurrencyAnalysis?.map((item: any, index: number) => ({
      name: item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      value: item.totalCostTypes || 0,
      color: sectionColors[index % sectionColors.length],
    })) || [];

    // Change Currency vs No Change
    const changeCurrencyData: PieChartData[] = [
      {
        name: 'Change Currency Enabled',
        value: data.summary?.changeCurrencyEnabled || 0,
        color: '#10b981',
      },
      {
        name: 'Change Currency Disabled',
        value: data.summary?.changeCurrencyDisabled || 0,
        color: '#ef4444',
      },
    ];

    // Cost Types by Section
    const costTypesBySectionData = data.sectionTypeCurrencyAnalysis?.map((item: any) => ({
      name: item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      costTypes: item.totalCostTypes || 0,
      currencies: item.uniqueCurrencies || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Types by Section</h4>
            <InteractivePieChart data={sectionTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Currency Change Configuration</h4>
            <InteractivePieChart data={changeCurrencyData} height={300} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Section Analysis</h4>
            <StackedBarChart
              data={costTypesBySectionData}
              xAxisKey="name"
              series={[
                { dataKey: 'costTypes', name: 'Cost Types', color: '#3b82f6' },
                { dataKey: 'currencies', name: 'Unique Currencies', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.primaryCurrency && (
          <div>
            <h4 className="text-sm font-medium mb-4">Primary Currency Details</h4>
            <div className="border rounded-lg p-6" style={{ borderLeftWidth: '4px', borderLeftColor: '#10b981' }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Currency Code</div>
                  <div className="text-2xl font-bold text-green-600">{data.primaryCurrency.currencyCode || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Currency Name</div>
                  <div className="text-lg font-semibold">{data.primaryCurrency.currencyName || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Cost Types</div>
                  <div className="text-lg font-semibold">{data.primaryCurrency.costTypeCount || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Usage Percentage</div>
                  <div className="text-lg font-semibold">{data.primaryCurrency.usagePercentage || 0}%</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-gray-600">Change Currency Enabled</div>
                  <div className="text-sm font-semibold text-green-600">{data.primaryCurrency.changeCurrencyEnabled || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Change Currency Disabled</div>
                  <div className="text-sm font-semibold text-red-600">{data.primaryCurrency.changeCurrencyDisabled || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">With Default Value</div>
                  <div className="text-sm font-semibold text-blue-600">{data.primaryCurrency.withDefaultValue || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Section Types</div>
                  <div className="text-sm font-semibold">{data.primaryCurrency.sectionTypeCount || 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {data.currencies && data.currencies.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Currency Configuration Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Currency Code</th>
                    <th className="px-4 py-3 text-left font-medium">Currency Name</th>
                    <th className="px-4 py-3 text-right font-medium">Cost Types</th>
                    <th className="px-4 py-3 text-right font-medium">Change Enabled</th>
                    <th className="px-4 py-3 text-right font-medium">Change %</th>
                    <th className="px-4 py-3 text-right font-medium">Default Value</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.currencies.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.currencyCode || 'N/A'}</td>
                      <td className="px-4 py-3">{item.currencyName || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.costTypeCount || 0}</td>
                      <td className="px-4 py-3 text-right">{item.changeCurrencyEnabled || 0}</td>
                      <td className="px-4 py-3 text-right">{item.changeCurrencyPercentage || 0}%</td>
                      <td className="px-4 py-3 text-right">{item.withDefaultValue || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.sectionTypeCurrencyAnalysis && data.sectionTypeCurrencyAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Section Type Currency Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.sectionTypeCurrencyAnalysis.map((section: any, index: number) => (
                <div key={index} className="border rounded-lg p-4" style={{ borderLeftWidth: '4px', borderLeftColor: sectionColors[index % sectionColors.length] }}>
                  <div className="text-lg font-bold mb-2" style={{ color: sectionColors[index % sectionColors.length] }}>
                    {section.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cost Types:</span>
                      <span className="font-semibold">{section.totalCostTypes || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Currencies:</span>
                      <span className="font-semibold">{section.uniqueCurrencies || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Dominant:</span>
                      <span className="font-semibold">{section.dominantCurrency || 'N/A'}</span>
                    </div>
                  </div>
                  {section.currencies && section.currencies.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-600 mb-1">Currency Breakdown:</div>
                      {section.currencies.map((curr: any, cIndex: number) => (
                        <div key={cIndex} className="text-xs flex justify-between">
                          <span>{curr.currencyCode || 'Unknown'}</span>
                          <span className="font-semibold">{curr.count || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.primaryCurrency?.costTypes && data.primaryCurrency.costTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Types in Primary Currency</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Cost Type</th>
                    <th className="px-4 py-3 text-left font-medium">Section Type</th>
                    <th className="px-4 py-3 text-center font-medium">Change Currency</th>
                    <th className="px-4 py-3 text-center font-medium">Has Default Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.primaryCurrency.costTypes.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.costType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3">{item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${item.changeCurrency ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.changeCurrency ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${item.hasDefaultValue ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.hasDefaultValue ? 'Yes' : 'No'}
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

    // Create comprehensive table data combining all information
    const tableData: any[] = [];

    // Add currency summary
    if (data.currencies) {
      data.currencies.forEach((currency: any) => {
        tableData.push({
          category: 'Currency',
          name: currency.currencyName || 'Unknown',
          code: currency.currencyCode || 'N/A',
          value: currency.costTypeCount || 0,
          percentage: `${currency.changeCurrencyPercentage || 0}%`,
          status: currency.isActive ? 'Active' : 'Inactive',
          details: `${currency.changeCurrencyEnabled || 0} changeable, ${currency.withDefaultValue || 0} with default`,
        });
      });
    }

    // Add section type analysis
    if (data.sectionTypeCurrencyAnalysis) {
      data.sectionTypeCurrencyAnalysis.forEach((section: any) => {
        tableData.push({
          category: 'Section Type',
          name: section.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
          code: section.dominantCurrency || 'N/A',
          value: section.totalCostTypes || 0,
          percentage: '-',
          status: `${section.uniqueCurrencies || 0} currencies`,
          details: section.dominantCurrency || 'N/A',
        });
      });
    }

    const columns = [
      { key: 'category', label: 'Category' },
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code/Currency' },
      { key: 'value', label: 'Cost Types' },
      { key: 'percentage', label: 'Change %' },
      { key: 'status', label: 'Status' },
      { key: 'details', label: 'Details' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Cost Currency Distribution"
      subtitle="Currency usage patterns and configuration analysis"
      icon={<DollarSign className="h-5 w-5" />}
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

export default CostCurrencyDistributionReport;
