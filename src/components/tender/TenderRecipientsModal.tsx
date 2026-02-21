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
import { Building2, Eye, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { tenderService } from "@/services/tenderService";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import TenderVehicleSideModal from "./TenderVehicleSideModal";

interface TenderRecipientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
}

const TenderRecipientsModal: React.FC<TenderRecipientsModalProps> = ({
  open,
  onOpenChange,
  tender,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  // Fetch tender recipients
  const { data: recipientsData, isLoading } = useQuery({
    queryKey: ["tender-recipients", tender?._id],
    queryFn: async () => {
      if (!tender?._id) return { data: [] };
      const response = await tenderService.getTenderRecipients(tender._id);
      return response.data;
    },
    enabled: open && !!tender?._id,
  });

  const recipients = recipientsData?.data || [];

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "In Progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Submitted":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Withdrawn":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "Closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "Order - Approved":
        return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
      case "Accepted":
        return "bg-teal-100 text-teal-800 hover:bg-teal-100";
      case "Delivered":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Aborted":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const handleViewClick = (recipient: any) => {
    setSelectedVehicle(recipient);
    setIsVehicleModalOpen(true);
  };

  const handleVehicleModalClose = () => {
    setIsVehicleModalOpen(false);
    setSelectedVehicle(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Tender Recipients</DialogTitle>
            <DialogDescription>
              Dealerships that received tender {tender?.tender_id} and their
              response status
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recipients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  This tender hasn't been sent to any dealerships yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recipients.map((recipient: any) => (
                  <div
                    key={recipient._id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {recipient.dealership?.dealership_name ||
                              "Unknown Dealership"}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          {recipient.dealership?.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs">
                                {recipient.dealership.email}
                              </span>
                            </div>
                          )}
                          {recipient.dealership?.brand_or_make && (
                            <div className="text-xs">
                              Brand: {recipient.dealership.brand_or_make}
                            </div>
                          )}
                          {recipient.submitted_at && (
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Responded:{" "}
                                {format(
                                  new Date(recipient.submitted_at),
                                  "MMM dd, yyyy HH:mm"
                                )}
                              </span>
                            </div>
                          )}
                          {recipient.quote_price && (
                            <div className="text-xs font-medium text-green-700">
                              Quote: ${recipient.quote_price.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="secondary"
                          className={getStatusBadgeColor(
                            recipient.quote_status
                          )}
                        >
                          {recipient.quote_status}
                        </Badge>

                        {(recipient.quote_status === "Submitted" ||
                          recipient.quote_status === "In Progress" ||
                          recipient.quote_status === "Order - Approved" ||
                          recipient.quote_status === "Accepted" ||
                          recipient.quote_status === "Delivered") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewClick(recipient)}
                            className="h-8"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Side Modal */}
      {selectedVehicle && (
        <TenderVehicleSideModal
          open={isVehicleModalOpen}
          onOpenChange={setIsVehicleModalOpen}
          vehicle={selectedVehicle}
          tender={tender}
          onClose={handleVehicleModalClose}
        />
      )}
    </>
  );
};

export default TenderRecipientsModal;
