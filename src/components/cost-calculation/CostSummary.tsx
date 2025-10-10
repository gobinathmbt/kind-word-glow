import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatApiNames } from "@/utils/GlobalUtils";

interface CostSummaryProps {
  costData: any;
  sections: any[];
}

const CostSummary: React.FC<CostSummaryProps> = ({ costData, sections }) => {
  const summary = useMemo(() => {
    const expenseSummary: any = {};
    const marginSummary: any = {};
    let totalExpenses = 0;
    let totalCosts = 0;
    let totalGST = 0;

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
      retailPrice,
      grossProfit,
      netProfit,
      netMargin,
    };
  }, [costData, sections]);

  return (
    <div className="h-full flex flex-col bg-card border-l">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Summary</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Expense Summary - Compact */}
          <div className="space-y-1.5">
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Exact Expenses</span>
                <span>0 Incl</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Expenses</span>
                <span>0 Incl</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span>Total Expenses</span>
                <span className="font-medium">0 Incl</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-xs">
                <span>Total Costs</span>
                <span>{summary.totalCosts.toFixed(2)} Incl</span>
              </div>
              <div className="text-[10px] text-muted-foreground text-right">
                (GST {summary.totalGST.toFixed(2)})
              </div>
            </div>
          </div>

          <Separator />

          {/* Margin Summary - Compact */}
          <div className="space-y-1.5 border rounded-lg p-2 bg-muted/20">
            <h4 className="font-semibold text-xs mb-2">Margin Summary</h4>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retail Price</span>
                <span className="font-medium">{summary.retailPrice.toFixed(2)} Incl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Profit</span>
                <span>{summary.grossProfit.toFixed(2)} Incl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST Payable</span>
                <span>{summary.totalGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Appraisal</span>
                <span>0 Incl</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold text-xs">
                <span>Net Profit</span>
                <span>{summary.netProfit.toFixed(2)} Excl</span>
              </div>
              <div className="flex justify-between font-semibold text-xs">
                <span>Net Margin</span>
                <span>{summary.netMargin}%</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>After Sales</span>
                <span>0.00</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CostSummary;
