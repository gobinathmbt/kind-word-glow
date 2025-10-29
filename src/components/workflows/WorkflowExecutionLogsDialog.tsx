import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workflowServices } from "@/api/services";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface WorkflowExecutionLogsDialogProps {
  workflowId: string;
  workflowName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WorkflowExecutionLogsDialog: React.FC<WorkflowExecutionLogsDialogProps> = ({
  workflowId,
  workflowName,
  open,
  onOpenChange,
}) => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["workflow-execution-logs", workflowId, page, statusFilter],
    queryFn: () => workflowServices.getWorkflowExecutionLogs(workflowId, {
      page,
      limit: 20,
      status: statusFilter !== "all" ? statusFilter : undefined,
    }),
    enabled: open,
  });

  const logs = data?.data?.data?.logs || [];
  const pagination = data?.data?.data?.pagination;

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      partial_success: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Execution Logs - {workflowName}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="partial_success">Partial Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No execution logs found
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log._id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      {getStatusBadge(log.execution_status)}
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(log.created_at), "PPpp")}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div>Duration: {log.execution_duration_ms}ms</div>
                      <div>Vehicles: {log.successful_vehicles}/{log.total_vehicles}</div>
                    </div>
                  </div>
                  
                  <p className="text-sm">{log.execution_summary}</p>
                  
                  {log.vehicle_results?.filter(v => v.status === 'failed').length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                      <strong>Failed Vehicles:</strong>
                      {log.vehicle_results.filter(v => v.status === 'failed').map((v, i) => (
                        <div key={i} className="ml-2">
                          • Stock ID {v.vehicle_stock_id}: {v.error_message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {pagination && pagination.total_pages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowExecutionLogsDialog;
