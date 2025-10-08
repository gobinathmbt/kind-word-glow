import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench,
  TrendingUp,
  Shield,
  FileText,
  MessageSquare,
  CheckCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { workshopServices } from "@/api/services";
import { toast } from "sonner";

import ProgressSummaryTab from "@/components/workshop/CommentSheetTabs/Tabs/ProgressSummaryTab";
import WorkEntriesTab from "@/components/workshop/CommentSheetTabs/Tabs/WorkEntriesTab";
import QualityWarrantyTab from "@/components/workshop/CommentSheetTabs/Tabs/QualityWarrantyTab";
import DocumentationTab from "@/components/workshop/CommentSheetTabs/Tabs/DocumentationTab";
import CommentsTab from "@/components/workshop/CommentSheetTabs/Tabs/CommentsTab";

interface WorkEntry {
  id: string;
  description: string;
  parts_cost: string;
  labor_cost: string;
  gst: string;
  parts_used: string;
  labor_hours: string;
  technician: string;
  completed: boolean;
  entry_date_time: string;
  estimated_time: string;
  invoices: Array<{ url: string; key: string; description: string }>;
  pdfs: Array<{ url: string; key: string; description: string }>;
  videos: Array<{ url: string; key: string; description: string }>;
  warranties: Array<{
    part: string;
    months: string;
    supplier: string;
    document?: { url: string; key: string; description: string };
  }>;
  documents: Array<{ url: string; key: string; description: string }>;
  images: Array<{ url: string; key: string; description: string }>;
  persons: Array<{ name: string; role: string; contact: string }>;
  quality_check: {
    visual_inspection: boolean;
    functional_test: boolean;
    road_test: boolean;
    safety_check: boolean;
    notes: string;
  };
  comments: string;
}

export interface FormData {
  work_entries: WorkEntry[];
  warranty_months: string;
  maintenance_recommendations: string;
  next_service_due: string;
  supplier_comments: string;
  company_feedback: string;
  customer_satisfaction: string;
  workMode: any;
  technician_company_assigned: string;
  work_completion_date: string;
}

interface CommentSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: any; 
  field?: any; 
  workMode?: any;
  mode: "supplier_submit" | "company_review" | "company_view";
  onSubmit?: (data: any) => void;
  onSuccess?: () => void;
  loading?: boolean;
}

const CommentSheetModal: React.FC<CommentSheetModalProps> = ({
  open,
  onOpenChange,
  quote: propQuote,
  field,
  workMode,
  mode,
  onSubmit,
  onSuccess,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reworkReason, setReworkReason] = useState("");
  const [isDraftSubmission, setIsDraftSubmission] = useState(false);

  const { data: fetchedQuote, isLoading: isFetchingQuote } = useQuery({
    queryKey: [
      "field-work-details",
      field?.vehicle_type,
      field?.vehicle_stock_id,
      field?.field_id,
    ],
    queryFn: async () => {
      if (!field) return null;
      const response = await workshopServices.getQuotesForField(
        field.vehicle_type,
        field.vehicle_stock_id,
        field.field_id
      );
      return response.data.data;
    },
    enabled:
      open && !!field && (mode === "company_review" || mode === "company_view"),
  });

  const quote = mode === "supplier_submit" ? propQuote : fetchedQuote;
  const isLoading = mode === "supplier_submit" ? false : isFetchingQuote;

  const acceptWorkMutation = useMutation({
    mutationFn: async () => {
      const response = await workshopServices.acceptWork(quote._id);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Work accepted successfully");
      onSuccess?.();
    },
    onError: () => toast.error("Failed to accept work"),
  });

  const requestReworkMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await workshopServices.requestRework(quote._id, reason);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Rework request sent to supplier");
      setReworkReason("");
      onSuccess?.();
    },
    onError: () => toast.error("Failed to request rework"),
  });

  const [formData, setFormData] = useState<FormData>({
    work_entries: [],
    warranty_months: "12",
    maintenance_recommendations: "",
    next_service_due: "",
    supplier_comments: "",
    company_feedback: "",
    customer_satisfaction: "",
    workMode: workMode,
    technician_company_assigned: "",
    work_completion_date: "",
  });

  useEffect(() => {
    if (quote?.comment_sheet) {
      const sheet = quote.comment_sheet;
      setFormData({
        work_entries: sheet.work_entries || [],
        warranty_months: sheet.warranty_months || "12",
        maintenance_recommendations: sheet.maintenance_recommendations || "",
        next_service_due: sheet.next_service_due || "",
        supplier_comments: sheet.supplier_comments || "",
        company_feedback: sheet.company_feedback || "",
        customer_satisfaction: sheet.customer_satisfaction || "",
        workMode: sheet.workMode || workMode,
        technician_company_assigned:
          sheet.technician_company_assigned ||
          quote?.supplier_responses?.[0]?.supplier_id?.name ||
          "",
        work_completion_date:
          sheet.work_completion_date ||
          quote?.supplier_responses?.[0]?.estimated_time ||
          "",
      });
    }
  }, [quote, workMode]);

  const calculateEntryTotal = (entry: WorkEntry) => {
    const parts = parseFloat(entry.parts_cost) || 0;
    const labor = parseFloat(entry.labor_cost) || 0;
    const gst = parseFloat(entry.gst) || 0;
    return parts + labor + gst;
  };

  const calculateGrandTotal = () => {
    return formData.work_entries.reduce((total, entry) => {
      return total + calculateEntryTotal(entry);
    }, 0);
  };

  const getQuoteDifference = () => {
    const total = calculateGrandTotal();
    const quoteAmount = quote?.quote_amount || 0;
    return total - quoteAmount;
  };

  const handleSubmit = (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();

    if (mode === "supplier_submit") {
      if (formData.work_entries.length === 0) {
        alert("Please add at least one work entry");
        return;
      }

      const submitData = {
        ...formData,
        total_amount: calculateGrandTotal(),
        quote_difference: getQuoteDifference(),
        workMode: workMode,
        save_as_draft: saveAsDraft,
      };

      onSubmit?.(submitData);
    }
  };

  const handleSaveAsDraft = (e: React.FormEvent) => {
    setIsDraftSubmission(true);
    handleSubmit(e, true);
  };

  const handleAcceptWork = () => {
    acceptWorkMutation.mutate();
  };

  const handleRequestRework = () => {
    if (!reworkReason.trim()) {
      toast.error("Please provide a reason for rework");
      return;
    }
    requestReworkMutation.mutate(reworkReason);
  };

  const isReadOnly =
    mode === "company_view" ||
    (mode === "company_review" && activeTab !== "rework");
  const showReworkTab = mode === "company_review";

  const getModalTitle = () => {
    switch (mode) {
      case "supplier_submit":
        return `${
          workMode === "submit" ? "Submit Work Details" : "Update Work Details"
        }`;
      case "company_review":
        return "Review Work Submission";
      case "company_view":
        return "Work Details";
      default:
        return "Work Details";
    }
  };

  const getModalIcon = () => {
    switch (mode) {
      case "supplier_submit":
        return <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "company_review":
        return (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        );
      case "company_view":
        return <Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
      default:
        return (
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        );
    }
  };

  const commonProps = {
    formData,
    setFormData,
    quote,
    mode,
    isReadOnly,
    uploading,
    setUploading,
    expandedEntry,
    setExpandedEntry,
    calculateEntryTotal,
    calculateGrandTotal,
    getQuoteDifference,
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 overflow-hidden">
        <DialogHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 -m-6 px-4 py-3 mb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
              {getModalIcon()}
            </div>
            <div>
              <div className="text-lg font-bold">{getModalTitle()}</div>
              <div className="text-xs text-muted-foreground font-normal">
                {quote?.field_name || field?.field_name} • Stock ID:{" "}
                {quote?.vehicle_stock_id || field?.vehicle_stock_id}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList
              className={`grid w-full ${
                showReworkTab ? "grid-cols-6" : "grid-cols-5"
              } bg-muted/50 p-0.5 rounded-lg mb-3 h-12 flex-shrink-0`}
            >
              <TabsTrigger
                value="summary"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2"
              >
                <TrendingUp className="h-3 w-3" />
                <span className="hidden sm:inline">Summary</span>
              </TabsTrigger>
              <TabsTrigger
                value="work-entries"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2"
              >
                <Wrench className="h-3 w-3" />
                <span className="hidden sm:inline">Work</span>
              </TabsTrigger>
              <TabsTrigger
                value="quality-warranty"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2"
              >
                <Shield className="h-3 w-3" />
                <span className="hidden sm:inline">Quality</span>
              </TabsTrigger>
              <TabsTrigger
                value="documentation"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2"
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Docs</span>
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2"
              >
                <MessageSquare className="h-3 w-3" />
                <span className="hidden sm:inline">Notes</span>
              </TabsTrigger>
              {showReworkTab && (
                <TabsTrigger
                  value="rework"
                  className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="hidden sm:inline">Review</span>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto px-1">
              <form onSubmit={handleSubmit} className="pb-4">
                <TabsContent value="summary" className="space-y-4 mt-0">
                  <ProgressSummaryTab {...commonProps} />
                </TabsContent>

                <TabsContent value="work-entries" className="space-y-3 mt-0">
                  <WorkEntriesTab {...commonProps} />
                </TabsContent>

                <TabsContent
                  value="quality-warranty"
                  className="space-y-3 mt-0"
                >
                  <QualityWarrantyTab {...commonProps} />
                </TabsContent>

                <TabsContent value="documentation" className="space-y-3 mt-0">
                  <DocumentationTab {...commonProps} />
                </TabsContent>

                <TabsContent value="comments" className="space-y-3 mt-0">
                  <CommentsTab {...commonProps} workMode={workMode} />
                </TabsContent>

                {showReworkTab && (
                  <TabsContent value="rework" className="space-y-4 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Work Review & Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Rework Request Reason (Optional)
                          </label>
                          <Textarea
                            placeholder="Provide detailed reason for rework request if needed..."
                            value={reworkReason}
                            onChange={(e) => setReworkReason(e.target.value)}
                            className="min-h-[100px]"
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            type="button"
                            onClick={handleRequestRework}
                            disabled={
                              !reworkReason.trim() ||
                              requestReworkMutation.isPending
                            }
                            variant="outline"
                            className="flex-1"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {requestReworkMutation.isPending
                              ? "Requesting..."
                              : "Request Rework"}
                          </Button>

                          <Button
                            type="button"
                            onClick={handleAcceptWork}
                            disabled={acceptWorkMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {acceptWorkMutation.isPending
                              ? "Accepting..."
                              : "Accept Work"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </form>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-3 border-t mt-3 flex-shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-4">
            {uploading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span>Uploading...</span>
              </div>
            )}
            <div className="hidden md:block">
              Total:{" "}
              <span className="font-bold text-green-600">
                ${calculateGrandTotal().toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-w-[80px] h-9 text-sm"
            >
              Close
            </Button>

            {mode === "supplier_submit" && (
              <>
                {workMode === "submit" && (
                  <Button
                    type="button"
                    onClick={handleSaveAsDraft}
                    disabled={loading || uploading}
                    variant="outline"
                    className="min-w-[120px] h-9 text-sm"
                  >
                    {loading && isDraftSubmission ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                        Saving Draft...
                      </div>
                    ) : (
                      "Save as Draft"
                    )}
                  </Button>
                )}

                <Button
                  type="submit"
                  onClick={(e) => {
                    setIsDraftSubmission(false);
                    handleSubmit(e, false);
                  }}
                  disabled={loading || uploading}
                  className="min-w-[120px] h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm"
                >
                  {loading && !isDraftSubmission ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    `${workMode === "submit" ? "Submit Work" : "Update Work"}`
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommentSheetModal;
