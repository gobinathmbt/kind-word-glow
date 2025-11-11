import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign, Globe, TrendingUp, Activity, Percent, Layers } from 'lucide-react';

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
          title="Total Currencies Available"
          value={summary.totalCurrenciesAvailable || 0}
          icon={<Globe className="h-5 w-5" />}
          subtitle={`${summary.activeCurrenciesCount || 0} active`}
        />
        <MetricCard
          title="Total Cost Types"
          value={summary.totalCostTypes || 0}
          icon={<Layers className="h-5 w-5" />}
          subtitle={`${summary.sectionTypeCount || 0} sections`}
        />
        <MetricCard
          title="Currency Utilization"
          value={`${summary.currencyUtilizationRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={summary.currencyDiversity || 'N/A'}
        />
        <MetricCard
          title="Primary Currency"
          value={summary.primaryCurrency?.currencyCode || 'Unknown'}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle={summary.primaryCurrency?.currencyName || 'N/A'}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Section Type Distribution
    const sectionTypeData: PieChartData[] = data.sectionTypeCurrencyAnalysis?.map((item: any) => ({
      name: item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      value: item.totalCostTypes || 0,
    })) || [];

    // Change Currency vs No Change
    const changeCurrencyData: PieChartData[] = [
      {
        name: 'Change Currency Enabled',
        value: data.summary?.changeCurrencyEnabled || 0,
      },
      {
        name: 'Change Currency Disabled',
        value: data.summary?.changeCurrencyDisabled || 0,
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

        {data.currencies && data.currencies.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Currency Configuration Details</h4>
            <DataTable
              columns={[
                { key: 'currencyCode', label: 'Currency Code' },
                { key: 'currencyName', label: 'Currency Name' },
                { key: 'costTypeCount', label: 'Cost Types' },
                { key: 'changeCurrencyEnabled', label: 'Change Enabled' },
                { key: 'changeCurrencyPercentage', label: 'Change %' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.currencies.map((item: any) => ({
                currencyCode: item.currencyCode || 'N/A',
                currencyName: item.currencyName || 'N/A',
                costTypeCount: item.costTypeCount || 0,
                changeCurrencyEnabled: item.changeCurrencyEnabled || 0,
                changeCurrencyPercentage: `${item.changeCurrencyPercentage || 0}%`,
                status: item.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}

        {data.sectionTypeCurrencyAnalysis && data.sectionTypeCurrencyAnalysis.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Section Type Analysis</h4>
            <DataTable
              columns={[
                { key: 'sectionType', label: 'Section Type' },
                { key: 'totalCostTypes', label: 'Total Cost Types' },
                { key: 'uniqueCurrencies', label: 'Unique Currencies' },
                { key: 'dominantCurrency', label: 'Dominant Currency' },
              ]}
              data={data.sectionTypeCurrencyAnalysis.map((item: any) => ({
                sectionType: item.sectionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A',
                totalCostTypes: item.totalCostTypes || 0,
                uniqueCurrencies: item.uniqueCurrencies || 0,
                dominantCurrency: item.dominantCurrency || 'N/A',
              }))}
            />
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
          details: `${currency.changeCurrencyEnabled || 0} changeable`,
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
      { key: 'percentage', label: 'Percentage' },
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