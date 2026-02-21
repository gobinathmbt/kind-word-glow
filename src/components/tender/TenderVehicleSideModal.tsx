import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { tenderService } from "@/api/services";
import {
  Car,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TenderVehicleSideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any;
  tender: any;
  onClose: () => void;
}

const TenderVehicleSideModal: React.FC<TenderVehicleSideModalProps> = ({
  open,
  onOpenChange,
  vehicle,
  tender,
  onClose,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const handleApproveQuote = async () => {
    setIsApproving(true);

    try {
      await tenderService.approveQuote(tender._id, {
        tenderVehicle_id: vehicle._id,
      });
      toast.success("Quote approved successfully");
      setShowApproveDialog(false);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve quote");
    } finally {
      setIsApproving(false);
    }
  };

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

  const canApprove =
    vehicle.quote_status === "Submitted" && tender.tender_status !== "Approved";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Vehicle Quote Details</SheetTitle>
            <SheetDescription>
              View quote information from{" "}
              {vehicle.dealership?.dealership_name || "dealership"}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
            <div className="space-y-6">
              {/* Status and Type */}
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className={getStatusBadgeColor(vehicle.quote_status)}
                >
                  {vehicle.quote_status}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    vehicle.vehicle_type === "sent_vehicle"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }
                >
                  {vehicle.vehicle_type === "sent_vehicle"
                    ? "Sent Vehicle"
                    : "Alternate Vehicle"}
                </Badge>
              </div>

              {/* Quote Price */}
              {vehicle.quote_price && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-5 w-5 text-green-700" />
                    <Label className="text-sm font-medium text-green-900">
                      Quote Price
                    </Label>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    ${vehicle.quote_price.toLocaleString()}
                  </div>
                </div>
              )}

              <Separator />

              {/* Vehicle Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>Vehicle Information</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Make
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicle.make || "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Model
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicle.model || "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Year
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicle.year || "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Variant
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicle.variant || "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Body Style
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicle.body_style || "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Color
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicle.color || "-"}
                    </div>
                  </div>

                  {vehicle.registration_number && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Registration
                      </Label>
                      <div className="text-sm font-medium">
                        {vehicle.registration_number}
                      </div>
                    </div>
                  )}

                  {vehicle.vin && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        VIN
                      </Label>
                      <div className="text-sm font-medium">{vehicle.vin}</div>
                    </div>
                  )}

                  {vehicle.odometer_reading && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Odometer
                      </Label>
                      <div className="text-sm font-medium">
                        {vehicle.odometer_reading.toLocaleString()} km
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Engine Details */}
              {vehicle.engine_details &&
                Object.values(vehicle.engine_details).some((v) => v) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold">
                        Engine Details
                      </Label>

                      <div className="grid grid-cols-2 gap-4">
                        {vehicle.engine_details.engine_type && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Engine Type
                            </Label>
                            <div className="text-sm font-medium">
                              {vehicle.engine_details.engine_type}
                            </div>
                          </div>
                        )}

                        {vehicle.engine_details.engine_capacity && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Capacity
                            </Label>
                            <div className="text-sm font-medium">
                              {vehicle.engine_details.engine_capacity}
                            </div>
                          </div>
                        )}

                        {vehicle.engine_details.fuel_type && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Fuel Type
                            </Label>
                            <div className="text-sm font-medium">
                              {vehicle.engine_details.fuel_type}
                            </div>
                          </div>
                        )}

                        {vehicle.engine_details.transmission && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Transmission
                            </Label>
                            <div className="text-sm font-medium">
                              {vehicle.engine_details.transmission}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

              {/* Specifications */}
              {vehicle.specifications &&
                Object.values(vehicle.specifications).some((v) => v) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold">
                        Specifications
                      </Label>

                      <div className="grid grid-cols-2 gap-4">
                        {vehicle.specifications.doors && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Doors
                            </Label>
                            <div className="text-sm font-medium">
                              {vehicle.specifications.doors}
                            </div>
                          </div>
                        )}

                        {vehicle.specifications.seats && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Seats
                            </Label>
                            <div className="text-sm font-medium">
                              {vehicle.specifications.seats}
                            </div>
                          </div>
                        )}

                        {vehicle.specifications.drive_type && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Drive Type
                            </Label>
                            <div className="text-sm font-medium">
                              {vehicle.specifications.drive_type}
                            </div>
                          </div>
                        )}
                      </div>

                      {vehicle.specifications.features &&
                        vehicle.specifications.features.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Features
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {vehicle.specifications.features.map(
                                (feature: string, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {feature}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </>
                )}

              {/* Quote Notes */}
              {vehicle.quote_notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Quote Notes</span>
                    </div>
                    <div className="text-sm p-3 bg-muted rounded-lg">
                      {vehicle.quote_notes}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canApprove && (
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Quote
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Approve Quote
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this quote from{" "}
              {vehicle.dealership?.dealership_name}? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Convert this quote to an approved order</li>
                <li>Close all other quotes for this tender</li>
                <li>Send notifications to all dealerships</li>
                <li>Update the tender status to "Approved"</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveQuote}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? "Approving..." : "Approve Quote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TenderVehicleSideModal;
