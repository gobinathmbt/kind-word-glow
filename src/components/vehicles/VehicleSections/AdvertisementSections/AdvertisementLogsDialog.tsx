import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdvertisementLogsDialogProps {
  vehicleId: string;
  advertisementId: string;
  provider: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdvertisementLogsDialog: React.FC<AdvertisementLogsDialogProps> = ({
  vehicleId,
  advertisementId,
  provider,
  open,
  onOpenChange,
}) => {
  const [eventFilter, setEventFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["advertisement-logs", vehicleId, advertisementId, eventFilter],
    queryFn: async () => {
      const params: any = {
        limit: 50,
      };
      
      if (eventFilter !== "all") {
        params.event_action = eventFilter;
      }

      const response = await axios.get(
        `/api/adpublishing/${vehicleId}/advertisements/${advertisementId}/logs`,
        { params }
      );
      return response.data;
    },
    enabled: open,
  });

  const logs = data?.data || [];

  const getEventLabel = (eventAction: string) => {
    const labels: Record<string, string> = {
      advertisement_draft_created: "Draft Created",
      advertisement_draft_updated: "Draft Updated",
      advertisement_published: "Published Successfully",
      advertisement_publish_failed: "Publish Failed",
      advertisement_withdrawn: "Withdrawn",
      advertisement_provider_changed: "Provider Changed",
      advertisement_updated: "Updated",
    };
    return labels[eventAction] || eventAction.replace(/_/g, " ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">Execution Logs - {provider}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 bg-gray-50/50">
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-40 h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="advertisement_draft_created">Draft Created</SelectItem>
              <SelectItem value="advertisement_draft_updated">Draft Updated</SelectItem>
              <SelectItem value="advertisement_published">Published</SelectItem>
              <SelectItem value="advertisement_publish_failed">Publish Failed</SelectItem>
              <SelectItem value="advertisement_withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No execution logs found
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => {
                const isSuccess = log.status === "success";
                
                return (
                  <div 
                    key={log._id} 
                    className="bg-white rounded-md p-4 shadow-sm"
                  >
                    {/* Top Row: Badge and Duration/Vehicles */}
                    <div className="flex items-start justify-between mb-2">
                      <Badge 
                        className={`text-[10px] font-semibold px-2.5 py-0.5 uppercase ${
                          isSuccess 
                            ? "bg-blue-600 hover:bg-blue-600 text-white" 
                            : "bg-red-600 hover:bg-red-600 text-white"
                        }`}
                      >
                        {isSuccess ? "SUCCESS" : "FAILURE"}
                      </Badge>
                      <div className="text-right">
                        {log.response_time_ms && (
                          <div className="text-xs text-gray-600">
                            Duration: {log.response_time_ms}ms
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date/Time */}
                    <div className="text-xs text-gray-500 mb-2.5">
                      {format(new Date(log.created_at), "MMM dd, yyyy, h:mm:ss a")}
                    </div>

                    {/* Description */}
                    <div className="text-sm text-gray-800 leading-relaxed">
                      {log.event_description}
                    </div>

                    {/* Error Message */}
                    {log.error_message && (
                      <div className="mt-3 text-xs text-red-700 bg-red-50 px-3 py-2 rounded border border-red-100">
                        {log.error_message}
                      </div>
                    )}

                    {/* Image Upload Results */}
                    {log.metadata?.api_response?.image_upload && (
                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <span>Image Upload Results:</span>
                          <Badge variant="outline" className="text-[10px]">
                            {log.metadata.api_response.image_upload.uploaded}/{log.metadata.api_response.image_upload.total} uploaded
                          </Badge>
                        </div>
                        
                        {log.metadata.api_response.image_upload.results && (
                          <div className="space-y-1.5">
                            {log.metadata.api_response.image_upload.results.map((result: any, idx: number) => (
                              <div 
                                key={idx}
                                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
                                  result.success 
                                    ? 'bg-green-50 text-green-800' 
                                    : 'bg-red-50 text-red-800'
                                }`}
                              >
                                {result.success ? (
                                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span className="font-medium">Position {result.position}:</span>
                                {result.success ? (
                                  <span>
                                    Uploaded successfully
                                    {result.attempts > 1 && ` (${result.attempts} attempts)`}
                                    {result.photoId && ` • ID: ${result.photoId}`}
                                  </span>
                                ) : (
                                  <span>
                                    Failed - {result.error}
                                    {result.attempts > 1 && ` (${result.attempts} attempts)`}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvertisementLogsDialog;
