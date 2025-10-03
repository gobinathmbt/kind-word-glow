import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, AlertCircle } from "lucide-react";
import { FormData } from "../../CommentSheetModal";

interface CommentsTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  quote: any;
  mode: "supplier_submit" | "company_review" | "company_view";
  isReadOnly: boolean;
  workMode?: any;
  uploading?: boolean;
  setUploading?: (uploading: boolean) => void;
  expandedEntry?: string | null;
  setExpandedEntry?: (entry: string | null) => void;
  calculateEntryTotal?: (entry: any) => number;
  calculateGrandTotal?: () => number;
  getQuoteDifference?: () => number;
}

const CommentsTab: React.FC<CommentsTabProps> = ({
  formData,
  setFormData,
  quote,
  mode,
  isReadOnly,
  workMode, // Now properly defined and optional
  uploading,
  setUploading,
  expandedEntry,
  setExpandedEntry,
  calculateEntryTotal,
  calculateGrandTotal,
  getQuoteDifference,
}) => {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            Overall Comments & Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mode === "supplier_submit" ? (
              <div className="space-y-2">
                <Label htmlFor="supplier_comments" className="text-sm">
                  Overall Work Summary & Comments *
                </Label>
                <Textarea
                  id="supplier_comments"
                  value={formData.supplier_comments}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      supplier_comments: e.target.value
                    }))
                  }
                  placeholder="Provide an overall summary of all work completed, any general observations, recommendations, or important notes..."
                  rows={5}
                  required
                  className="text-xs"
                  readOnly={isReadOnly} // Added readOnly prop
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Supplier Overall Work Summary & Comments</Label>
                  <div className="p-3 bg-muted/50 rounded-lg min-h-[80px] mt-2 text-xs">
                    {formData.supplier_comments || "No overall comments provided"}
                  </div>
                </div>

                {(mode === "company_review" && quote?.status === "work_review") && (
                  <div className="space-y-2">
                    <Label htmlFor="company_feedback" className="text-sm">
                      Company Review & Feedback
                    </Label>
                    <Textarea
                      id="company_feedback"
                      value={formData.company_feedback}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          company_feedback: e.target.value
                        }))
                      }
                      placeholder="Provide overall feedback on the completed work, quality assessment, approval status, etc."
                      rows={3}
                      className="text-xs"
                      readOnly={isReadOnly} // Added readOnly prop
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="customer_satisfaction" className="text-sm">
                    Customer Satisfaction Rating
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() =>
                          !isReadOnly && setFormData(prev => ({
                            ...prev,
                            customer_satisfaction: rating.toString()
                          }))
                        }
                        className={`p-1 transition-colors ${
                          parseInt(formData.customer_satisfaction) >= rating
                            ? 'text-yellow-500'
                            : 'text-gray-300'
                        } hover:text-yellow-400 ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        disabled={isReadOnly}
                      >
                        <Star className="h-5 w-5 fill-current" />
                      </button>
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formData.customer_satisfaction ? `${formData.customer_satisfaction}/5` : 'Not rated'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Individual Entry Comments Summary */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Comments by Entry</Label>
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                {formData.work_entries.map((entry, index) => (
                  <div key={entry.id} className="p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">Entry #{index + 1}</Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.description || "No description"}
                      </span>
                    </div>
                    <div className="text-xs">
                      {entry.comments ? (
                        <p className="bg-white dark:bg-slate-800 p-2 rounded">{entry.comments}</p>
                      ) : (
                        <p className="text-muted-foreground italic">No comments for this entry</p>
                      )}
                    </div>
                  </div>
                ))}
                {formData.work_entries.length === 0 && (
                  <div className="text-center py-3 text-muted-foreground text-xs">
                    No entries available
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-muted-foreground text-xs">Work Mode</Label>
                <p className="font-medium text-sm capitalize">{workMode || 'N/A'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-muted-foreground text-xs">Last Updated</Label>
                <p className="font-medium text-sm">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-muted-foreground text-xs">Total Documents</Label>
                <p className="font-medium text-sm">
                  {formData.work_entries.reduce((acc, entry) => 
                    acc + (entry.invoices?.length || 0) + (entry.pdfs?.length || 0) + (entry.images?.length || 0) + (entry.videos?.length || 0), 0
                  )} files
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-muted-foreground text-xs">Overall Quality Status</Label>
                <p className="font-medium text-sm">
                  {formData.work_entries.reduce((acc, entry) => 
                    acc + Object.values(entry.quality_check || {}).filter(v => v === true).length, 0
                  )} total checks passed
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentsTab;