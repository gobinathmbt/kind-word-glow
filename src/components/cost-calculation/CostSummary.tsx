import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { formatApiNames } from "@/utils/GlobalUtils";

interface CostSummaryProps {
  costData: any;
  sections: any[];
  addOnExpenses?: any[];
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
}

const CostSummary: React.FC<CostSummaryProps> = ({ costData, sections, addOnExpenses = [], onCancel, onSave, isSaving }) => {
  const summary = useMemo(() => {
    const expenseSummary: any = {};
    const marginSummary: any = {};
    let totalExpenses = 0;
    let totalCosts = 0;
    let totalGST = 0;
    let exactExpenses = 0;
    let estimatedExpenses = 0;

    sections.forEach((section) => {
      const sectionTotal = section.cost_types.reduce((sum: number, costType: any) => {
        const data = costData[costType._id];
        if (data && data.total_amount) {
          const amount = parseFloat(data.total_amount) || 0;
          const tax = parseFloat(data.total_tax) || 0;
          totalGST += tax;
          return sum + amount;
        }
        return sum;
      }, 0);

      if (section.section_name === "pricing_cost") {
        section.cost_types.forEach((costType: any) => {
          const data = costData[costType._id];
          if (data && data.total_amount) {
            const amount = parseFloat(data.total_amount) || 0;
            marginSummary[formatApiNames(costType.cost_type)] = amount;
          }
        });
      } else {
        expenseSummary[formatApiNames(section.section_name)] = sectionTotal;
        totalExpenses += sectionTotal;
      }
    });

    // Calculate add-on expenses
    addOnExpenses.forEach((expense) => {
      const amount = parseFloat(expense.total_amount) * expense.exchange_rate || 0;
      const tax = parseFloat(expense.total_tax) * expense.exchange_rate || 0;
      
      if (expense.is_estimated) {
        estimatedExpenses += amount;
      } else {
        exactExpenses += amount;
      }
      
      totalExpenses += amount;
      totalGST += tax;
    });

    totalCosts = totalExpenses;

    // Calculate margin summary values
    const retailPrice = marginSummary["Retail Price"] || 0;
    const grossProfit = retailPrice - totalCosts;
    const netProfit = grossProfit - totalGST;
    const netMargin = retailPrice > 0 ? ((netProfit / retailPrice) * 100).toFixed(2) : "0.00";

    return {
      expenseSummary,
      marginSummary,
      totalExpenses,
      totalCosts,
      totalGST,
      exactExpenses,
      estimatedExpenses,
      retailPrice,
      grossProfit,
      netProfit,
      netMargin,
    };
  }, [costData, sections, addOnExpenses]);

  return (
    <div className="h-full flex flex-col bg-card border-l">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Summary</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Expense Summary */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Expense Summary</h4>
            <div className="space-y-1.5 text-sm">
              {Object.entries(summary.expenseSummary).map(([key, value]: any) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground text-xs">{key}</span>
                  <span className={`text-xs ${value < 0 ? 'text-red-500' : ''}`}>
                    {value.toFixed(2)} Incl
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-xs">Total Expenses</span>
                <span className={`text-xs ${summary.totalExpenses < 0 ? 'text-red-500' : ''}`}>
                  {summary.totalExpenses.toFixed(2)} Incl
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs text-green-600">Exact Expenses</span>
                <span className="text-xs text-green-600">{summary.exactExpenses.toFixed(2)} Incl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs text-amber-600">Estimated Expenses</span>
                <span className="text-xs text-amber-600">{summary.estimatedExpenses.toFixed(2)} Incl</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-xs">Total Costs</span>
                <span className={`text-xs ${summary.totalCosts < 0 ? 'text-red-500' : ''}`}>
                  {summary.totalCosts.toFixed(2)} Incl
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Margin Summary */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Margin Summary</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Retail Price</span>
                <span className={`text-xs ${summary.retailPrice < 0 ? 'text-red-500' : ''}`}>
                  {summary.retailPrice.toFixed(2)} Incl
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Gross Profit</span>
                <span className={`text-xs ${summary.grossProfit < 0 ? 'text-red-500' : ''}`}>
                  {summary.grossProfit.toFixed(2)} Incl
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">GST Payable</span>
                <span className={`text-xs ${summary.totalGST < 0 ? 'text-red-500' : ''}`}>
                  {summary.totalGST.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Appraisal</span>
                <span className="text-xs">0 Incl</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-xs">Net Profit</span>
                <span className={`text-xs ${summary.netProfit < 0 ? 'text-red-500' : ''}`}>
                  {summary.netProfit.toFixed(2)} Excl
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-xs">Net Margin</span>
                <span className={`text-xs ${parseFloat(summary.netMargin) < 0 ? 'text-red-500' : ''}`}>
                  {summary.netMargin}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">After Sales</span>
                <span className="text-xs">0.00</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* Action Buttons */}
      <div className="p-4 border-t flex justify-end gap-2 bg-card">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSaving && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
};

export default CostSummary;
