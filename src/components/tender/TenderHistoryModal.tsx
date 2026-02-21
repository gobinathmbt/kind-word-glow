import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { tenderService } from "@/api/services";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  History,
  Clock,
  User,
  FileText,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TenderHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
}

const TenderHistoryModal: React.FC<TenderHistoryModalProps> = ({
  open,
  onOpenChange,
  tender,
}) => {
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Fetch tender history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["tender-history", tender?._id],
    queryFn: async () => {
      if (!tender?._id) return { data: [] };
      const response = await tenderService.getTenderHistory(tender._id);
      return response.data;
    },
    enabled: open && !!tender?._id,
  });

  const history = historyData?.data || [];

  // Filter history based on filters
  const filteredHistory = history.filter((item: any) => {
    // Action type filter
    if (actionTypeFilter !== "all" && item.action_type !== actionTypeFilter) {
      return false;
    }

    // Date filter
    if (dateFilter) {
      const itemDate = new Date(item.created_at).toISOString().split("T")[0];
      if (itemDate !== dateFilter) {
        return false;
      }
    }

    return true;
  });

  // Get action type badge color
  const getActionTypeBadgeColor = (actionType: string) => {
    switch (actionType) {
      case "created":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "sent":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
      case "viewed":
        return "bg-teal-100 text-teal-800 hover:bg-teal-100";
      case "quote_submitted":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "quote_withdrawn":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "approved":
        return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "order_accepted":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "order_delivered":
        return "bg-violet-100 text-violet-800 hover:bg-violet-100";
      case "order_aborted":
        return "bg-pink-100 text-pink-800 hover:bg-pink-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Format action type for display
  const formatActionType = (actionType: string) => {
    return actionType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleClearFilters = () => {
    setActionTypeFilter("all");
    setDateFilter("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Tender History
          </DialogTitle>
          <DialogDescription>
            Complete timeline of all actions for tender {tender?.tender_id}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 py-3 border-y">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Action Type
            </Label>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="quote_submitted">Quote Submitted</SelectItem>
                <SelectItem value="quote_withdrawn">Quote Withdrawn</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="order_accepted">Order Accepted</SelectItem>
                <SelectItem value="order_delivered">Order Delivered</SelectItem>
                <SelectItem value="order_aborted">Order Aborted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Date
            </Label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-9"
            >
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {actionTypeFilter !== "all" || dateFilter
                  ? "No history records found matching your filters"
                  : "No history records available for this tender"}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6">
                {filteredHistory.map((item: any, index: number) => (
                  <div key={item._id || index} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <Badge
                              variant="secondary"
                              className={getActionTypeBadgeColor(
                                item.action_type
                              )}
                            >
                              {formatActionType(item.action_type)}
                            </Badge>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(
                                  new Date(item.created_at),
                                  "MMM dd, yyyy HH:mm:ss"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Change */}
                        {(item.old_status || item.new_status) && (
                          <div className="flex items-center gap-2 text-sm">
                            {item.old_status && (
                              <Badge variant="outline" className="text-xs">
                                {item.old_status}
                              </Badge>
                            )}
                            {item.old_status && item.new_status && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            )}
                            {item.new_status && (
                              <Badge variant="outline" className="text-xs">
                                {item.new_status}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Performed By */}
                        {item.performed_by && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>
                              {item.performed_by_type === "admin"
                                ? "Admin"
                                : "Dealership User"}
                              {item.performed_by.username &&
                                ` - ${item.performed_by.username}`}
                              {item.performed_by.email &&
                                ` (${item.performed_by.email})`}
                            </span>
                          </div>
                        )}

                        {/* Dealership Info */}
                        {item.tenderDealership_id && (
                          <div className="text-xs text-muted-foreground">
                            Dealership:{" "}
                            {item.dealership?.dealership_name || "Unknown"}
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <div className="mt-2 p-3 bg-muted rounded-lg">
                            <div className="flex items-start gap-2">
                              <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                              <div className="text-xs text-muted-foreground">
                                {item.notes}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        {item.metadata &&
                          Object.keys(item.metadata).length > 0 && (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                              <div className="text-xs space-y-1">
                                {Object.entries(item.metadata).map(
                                  ([key, value]: [string, any]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="font-medium">
                                        {key}:
                                      </span>
                                      <span className="text-muted-foreground">
                                        {typeof value === "object"
                                          ? JSON.stringify(value)
                                          : String(value)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {filteredHistory.length} of {history.length} records
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenderHistoryModal;
