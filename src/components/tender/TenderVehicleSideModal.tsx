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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [selectedVehicleForApproval, setSelectedVehicleForApproval] = useState<any>(null);

  // Check if vehicle data has the new structure (sent_vehicle + alternate_vehicles)
  const hasCompleteData = vehicle?.sent_vehicle && vehicle?.dealership;
  const sentVehicle = hasCompleteData ? vehicle.sent_vehicle : vehicle;
  const alternateVehicles = hasCompleteData ? (vehicle.alternate_vehicles || []) : [];
  const dealershipInfo = hasCompleteData ? vehicle.dealership : vehicle.dealership;

  const handleApproveQuote = async () => {
    setIsApproving(true);

    try {
      const vehicleToApprove = selectedVehicleForApproval || sentVehicle;
      await tenderService.approveQuote(tender._id, {
        tenderVehicle_id: vehicleToApprove._id,
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

  const handleApproveClick = (vehicleData: any) => {
    setSelectedVehicleForApproval(vehicleData);
    setShowApproveDialog(true);
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

  const canApprove = (vehicleData: any) =>
    vehicleData.quote_status === "Submitted" && tender.tender_status !== "Approved";

  const renderVehicleDetails = (vehicleData: any) => (
    <div className="space-y-6">
      {/* Status and Type */}
      <div className="flex items-center justify-between">
        <Badge
          variant="secondary"
          className={getStatusBadgeColor(vehicleData.quote_status)}
        >
          {vehicleData.quote_status}
        </Badge>
        <Badge
          variant="outline"
          className={
            vehicleData.vehicle_type === "sent_vehicle"
              ? "bg-blue-50 text-blue-700"
              : "bg-purple-50 text-purple-700"
          }
        >
          {vehicleData.vehicle_type === "sent_vehicle"
            ? "Received Vehicle"
            : "Alternate Vehicle"}
        </Badge>
      </div>

      {/* Quote Price */}
      {vehicleData.quote_price && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-green-700" />
            <Label className="text-sm font-medium text-green-900">
              Quote Price
            </Label>
          </div>
          <div className="text-2xl font-bold text-green-700">
            ${vehicleData.quote_price.toLocaleString()}
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
            <Label className="text-xs text-muted-foreground">Make</Label>
            <div className="text-sm font-medium">
              {vehicleData.make || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <div className="text-sm font-medium">
              {vehicleData.model || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Year</Label>
            <div className="text-sm font-medium">
              {vehicleData.year || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Variant</Label>
            <div className="text-sm font-medium">
              {vehicleData.variant || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Body Style
            </Label>
            <div className="text-sm font-medium">
              {vehicleData.body_style || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="text-sm font-medium">
              {vehicleData.color || "-"}
            </div>
          </div>

          {vehicleData.registration_number && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Registration
              </Label>
              <div className="text-sm font-medium">
                {vehicleData.registration_number}
              </div>
            </div>
          )}

          {vehicleData.vin && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">VIN</Label>
              <div className="text-sm font-medium">{vehicleData.vin}</div>
            </div>
          )}

          {vehicleData.odometer_reading && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Odometer
              </Label>
              <div className="text-sm font-medium">
                {vehicleData.odometer_reading.toLocaleString()} km
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Engine Details */}
      {vehicleData.engine_details &&
        Object.values(vehicleData.engine_details).some((v) => v) && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Engine Details</Label>

              <div className="grid grid-cols-2 gap-4">
                {vehicleData.engine_details.engine_type && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Engine Type
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicleData.engine_details.engine_type}
                    </div>
                  </div>
                )}

                {vehicleData.engine_details.engine_capacity && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Capacity
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicleData.engine_details.engine_capacity}
                    </div>
                  </div>
                )}

                {vehicleData.engine_details.fuel_type && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Fuel Type
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicleData.engine_details.fuel_type}
                    </div>
                  </div>
                )}

                {vehicleData.engine_details.transmission && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Transmission
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicleData.engine_details.transmission}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      {/* Specifications */}
      {vehicleData.specifications &&
        Object.values(vehicleData.specifications).some((v) => v) && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Specifications</Label>

              <div className="grid grid-cols-2 gap-4">
                {vehicleData.specifications.doors && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Doors
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicleData.specifications.doors}
                    </div>
                  </div>
                )}

                {vehicleData.specifications.seats && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Seats
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicleData.specifications.seats}
                    </div>
                  </div>
                )}

                {vehicleData.specifications.drive_type && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Drive Type
                    </Label>
                    <div className="text-sm font-medium">
                      {vehicleData.specifications.drive_type}
                    </div>
                  </div>
                )}
              </div>

              {vehicleData.specifications.features &&
                vehicleData.specifications.features.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Features
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {vehicleData.specifications.features.map(
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
      {vehicleData.quote_notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Quote Notes</span>
            </div>
            <div className="text-sm p-3 bg-muted rounded-lg">
              {vehicleData.quote_notes}
            </div>
          </div>
        </>
      )}

      {/* Approve Button */}
      {canApprove(vehicleData) && (
        <div className="pt-4">
          <Button
            onClick={() => handleApproveClick(vehicleData)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve This Quote
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Vehicle Quote Details</SheetTitle>
            <SheetDescription>
              View quote information from{" "}
              {dealershipInfo?.dealership_name || "dealership"}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
            {alternateVehicles.length > 0 ? (
              <Tabs defaultValue="sent" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="sent">
                    Received Vehicle
                    {sentVehicle.quote_price && (
                      <span className="ml-2 text-xs text-green-600">
                        ${sentVehicle.quote_price.toLocaleString()}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="alternates">
                    Alternate Vehicles ({alternateVehicles.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sent">
                  {renderVehicleDetails(sentVehicle)}
                </TabsContent>

                <TabsContent value="alternates">
                  <div className="space-y-6">
                    {alternateVehicles.map((altVehicle: any, index: number) => (
                      <div key={altVehicle._id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">
                            Alternate Vehicle {index + 1}
                          </h3>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            {altVehicle.make} {altVehicle.model} {altVehicle.year}
                          </Badge>
                        </div>
                        {renderVehicleDetails(altVehicle)}
                        {index < alternateVehicles.length - 1 && (
                          <Separator className="mt-6" />
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              renderVehicleDetails(sentVehicle)
            )}
          </ScrollArea>

          {/* Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
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
              {dealershipInfo?.dealership_name}? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Convert this quote to an approved order</li>
                <li>Close all other quotes for this tender</li>
                <li>Send notifications to all dealerships</li>
                <li>Update the tender status to "Approved"</li>
              </ul>
              {selectedVehicleForApproval && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">
                    {selectedVehicleForApproval.vehicle_type === "alternate_vehicle" && (
                      <Badge variant="outline" className="mb-2 bg-purple-50 text-purple-700">
                        Alternate Vehicle
                      </Badge>
                    )}
                    <div>
                      {selectedVehicleForApproval.make} {selectedVehicleForApproval.model}{" "}
                      {selectedVehicleForApproval.year}
                    </div>
                    <div className="text-green-600 font-bold mt-1">
                      ${selectedVehicleForApproval.quote_price?.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
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
