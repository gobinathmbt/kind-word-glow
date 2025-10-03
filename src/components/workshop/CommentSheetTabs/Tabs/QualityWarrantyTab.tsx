import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { FormData } from "../../CommentSheetModal";
import DateTimePicker from "../DateTimePicker";

interface QualityWarrantyTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  isReadOnly: boolean;
}

const QualityWarrantyTab: React.FC<QualityWarrantyTabProps> = ({
  formData,
  setFormData,
  isReadOnly,
}) => {
  return (
    <div className="space-y-3">
      {/* Overall Warranty Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-blue-600" />
            Overall Warranty Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="warranty_months" className="text-sm">
                Work Warranty (Months)
              </Label>
              <Input
                id="warranty_months"
                type="number"
                value={formData.warranty_months}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    warranty_months: e.target.value,
                  }))
                }
                readOnly={isReadOnly}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <DateTimePicker
                value={formData.next_service_due}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    next_service_due: value,
                  }))
                }
                label="Next Service Due"
                placeholder="Pick Next Service Due date & time"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="maintenance_recommendations" className="text-sm">
              Maintenance Recommendations
            </Label>
            <Textarea
              id="maintenance_recommendations"
              value={formData.maintenance_recommendations}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maintenance_recommendations: e.target.value,
                }))
              }
              placeholder="Recommend future maintenance or services"
              rows={3}
              readOnly={isReadOnly}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quality Summary by Entry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-green-600" />
            Quality Check Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.work_entries.map((entry, index) => (
              <div key={entry.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Entry #{index + 1}</h4>
                  <Badge variant="outline" className="text-xs">
                    {
                      Object.values(entry.quality_check).filter(
                        (v) => v === true
                      ).length
                    }
                    /4 checks passed
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(entry.quality_check)
                    .filter(([key]) => key !== "notes")
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className={`text-xs p-2 rounded ${
                          value
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {value ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          <span className="capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                {entry.quality_check.notes && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <strong>Notes:</strong> {entry.quality_check.notes}
                  </div>
                )}
              </div>
            ))}
            {formData.work_entries.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No entries available for quality check summary
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warranty Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-purple-600" />
            Warranty Summary by Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.work_entries.map((entry, index) => (
              <div key={entry.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Entry #{index + 1}</h4>
                  <Badge variant="outline" className="text-xs">
                    {entry.warranties?.length || 0} warranties
                  </Badge>
                </div>
                {entry.warranties && entry.warranties.length > 0 ? (
                  <div className="grid gap-2">
                    {entry.warranties.map((warranty: any, idx: number) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 gap-2 text-xs p-2 bg-blue-50 dark:bg-blue-950/20 rounded"
                      >
                        <div>
                          <span className="font-medium">Part:</span>{" "}
                          {warranty.part}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>{" "}
                          {warranty.months} months
                        </div>
                        <div>
                          <span className="font-medium">Supplier:</span>{" "}
                          {warranty.supplier}
                        </div>
                        {warranty.document && (
                          <div className="col-span-3 text-green-600">
                            <span className="font-medium">Document:</span>{" "}
                            {warranty.document.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No warranties for this entry
                  </div>
                )}
              </div>
            ))}
            {formData.work_entries.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No entries available for warranty summary
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityWarrantyTab;
