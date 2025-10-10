import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calculator, User, Calendar } from "lucide-react";
import { FormData } from "@/components/workshop/CommentSheetModal";
import DateTimePicker from "@/components/workshop/CommentSheetTabs/DateTimePicker";

interface ProgressSummaryTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  quote: any;
  isReadOnly: boolean;
  calculateGrandTotal: () => number;
  getQuoteDifference: () => number;
}

const ProgressSummaryTab: React.FC<ProgressSummaryTabProps> = ({
  formData,
  setFormData,
  quote,
  isReadOnly,
  calculateGrandTotal,
  getQuoteDifference,
}) => {
  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Work Progress Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formData.work_entries.length}
              </div>
              <div className="text-xs text-muted-foreground">Total Entries</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {formData.work_entries.filter((e) => e.completed).length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {formData.work_entries.reduce((acc, entry) => {
                  return (
                    acc +
                    Object.values(entry.quality_check).filter((v) => v === true)
                      .length
                  );
                }, 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                Quality Checks
              </div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {formData.work_entries.reduce(
                  (acc, entry) =>
                    acc + entry.images.length + entry.videos.length,
                  0
                )}
              </div>
              <div className="text-xs text-muted-foreground">Media Files</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="technician_main" className="text-sm">
                Assigned Technician Company
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="technician_main"
                  value={formData.technician_company_assigned}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      technician_company_assigned: e.target.value,
                    }))
                  }
                  placeholder="Enter technician name"
                  className="pl-10 h-9"
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div className="space-y-1">
              <DateTimePicker
                value={formData.work_completion_date}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    work_completion_date: value,
                  }))
                }
                label="Work Completion Date"
                placeholder="Pick work completion date & time"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-green-600" />
            Automatic Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600 mb-1">
                  $
                  {formData.work_entries
                    .reduce(
                      (total, entry) =>
                        total + (parseFloat(entry.parts_cost) || 0),
                      0
                    )
                    .toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Parts Cost
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600 mb-1">
                  $
                  {formData.work_entries
                    .reduce(
                      (total, entry) =>
                        total + (parseFloat(entry.labor_cost) || 0),
                      0
                    )
                    .toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Labor Cost
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600 mb-1">
                  $
                  {formData.work_entries
                    .reduce(
                      (total, entry) => total + (parseFloat(entry.gst) || 0),
                      0
                    )
                    .toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total GST/Tax
                </div>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-emerald-600">
                  ${calculateGrandTotal().toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Grand Total</div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Original Quote: $
                  {quote?.quote_amount || quote?.manual_quote_amount || 0}
                </div>
                <div
                  className={`text-sm font-bold ${
                    getQuoteDifference() >= 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  Difference: {getQuoteDifference() >= 0 ? "+" : ""}$
                  {getQuoteDifference().toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quote Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground text-xs">
                Field Name
              </Label>
              <p className="font-medium mt-1 truncate">{quote?.field_name}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground text-xs">
                Original Quote
              </Label>
              <p className="font-medium mt-1">
                ${quote?.quote_amount || quote?.manual_quote_amount || 0}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground text-xs">
                Vehicle Stock ID
              </Label>
              <p className="font-medium mt-1 truncate">
                {quote?.vehicle_stock_id}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Badge variant="outline" className="mt-1 text-xs">
                {quote?.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressSummaryTab;
