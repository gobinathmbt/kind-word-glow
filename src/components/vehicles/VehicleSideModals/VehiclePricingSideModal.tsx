import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Car, Calculator, RefreshCw, Trash2 } from "lucide-react";
import { commonVehicleServices, vehicleServices, masterVehicleServices, adPublishingServices } from "@/api/services";
import { toast } from "sonner";
import VehicleOverviewSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleOverviewSection";
import VehicleGeneralInfoSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleGeneralInfoSection";
import VehicleSourceSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleSourceSection";
import VehicleRegistrationSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleRegistrationSection";
import VehicleEngineSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleEngineSection";
import VehicleSpecificationsSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleSpecificationsSection";
import VehicleOdometerSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleOdometerSection";
import VehicleAttachmentsSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleAttachmentsSection";
import VehicleImportSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleImportSection";
import VehicleOwnershipSection from "@/components/vehicles/VehicleSections/PricingSections/VehicleOwnershipSection";
import CostCalculationDialog from "@/components/cost-calculation/CostCalculationDialog";
import { useAuth } from "@/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VehiclePricingSideModalProps {
  vehicle: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const VehiclePricingSideModal: React.FC<VehiclePricingSideModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [isPricingReady, setIsPricingReady] = useState(false);
  const [costCalculationOpen, setCostCalculationOpen] = useState(false);
  const [selectedVehicleForCost, setSelectedVehicleForCost] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "soft_delete";
  } | null>(null);

  const { completeUser } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (vehicle && isOpen) {
      setIsPricingReady(vehicle.is_pricing_ready || false);
      setSelectedVehicleForCost(vehicle);
    }
  }, [vehicle, isOpen]);

  const handleCostCalculation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vehicle) {
      setSelectedVehicleForCost(vehicle);
      setCostCalculationOpen(true);
    }
  };

  const handleCostCalculationClose = () => {
    setCostCalculationOpen(false);
    setSelectedVehicleForCost(null);
    // Refresh data when cost calculation is completed
    onUpdate();
    
    // Invalidate activity logs query to refresh the activity stream
    queryClient.invalidateQueries({
      queryKey: ['vehicle-activity', vehicle.vehicle_type, vehicle.vehicle_stock_id]
    });
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Call onUpdate to refresh all APIs and reload the component
      await onUpdate();
      
      // Invalidate activity logs query to refresh the activity stream
      queryClient.invalidateQueries({
        queryKey: ['vehicle-activity', vehicle.vehicle_type, vehicle.vehicle_stock_id]
      });
      
      toast.success("Vehicle data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh vehicle data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSoftDelete = () => {
    setPendingAction({ type: "soft_delete" });
    setConfirmationOpen(true);
  };

  const handleConfirmAction = async () => {
    try {
      if (!pendingAction) return;

      if (pendingAction.type === "soft_delete") {

        // Route to the correct service based on vehicle type
        if (vehicle.vehicle_type === "master") {
          await masterVehicleServices.softDeleteMasterVehicle(vehicle._id);
        } else if (vehicle.vehicle_type === "advertisement") {
          await adPublishingServices.softDeleteAdVehicle(vehicle._id);
        } else {
          // For inspection, tradein, and other types, use the main vehicle service
          await vehicleServices.softDeleteVehicle(vehicle._id, vehicle.vehicle_type);
        }

        toast.success("Vehicle deleted successfully");

        // First refresh the list to remove the deleted vehicle
        await onUpdate();

        // Then close the modal after the list is updated
        onClose();
      }
    } catch (error) {
      console.error("Soft delete failed:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        vehicleId: vehicle._id,
        vehicleType: vehicle.vehicle_type
      });
      toast.error(`Failed to delete vehicle: ${error.response?.data?.message || error.message}`);
    } finally {
      setConfirmationOpen(false);
      setPendingAction(null);
    }
  };

  const getConfirmationMessage = () => {
    if (!pendingAction) return "";

    if (pendingAction.type === "soft_delete") {
      return "Are you sure you want to delete this vehicle? This action will mark the vehicle as inactive but it can be restored later.";
    }

    return "";
  };

  if (!vehicle) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          onCloseClick={onClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-full sm:w-[600px] md:w-[800px] lg:w-[1000px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] overflow-y-auto"
        >
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Car className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-xl">
                    {vehicle.name || `${vehicle.make} ${vehicle.model}`}
                  </SheetTitle>
                  <SheetDescription>
                    Stock ID: {vehicle.vehicle_stock_id} • {vehicle.year} •{" "}
                    {vehicle.vehicle_type}
                  </SheetDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCostCalculation}
                        className="bg-white hover:bg-white hover:border-blue-500 group"
                        disabled={!vehicle.vehicle_source[0]?.purchase_type}
                      >
                        <Calculator className="h-4 w-4 text-blue-500 transition-colors" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pricing Calculation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="bg-white hover:bg-white text-blue-600 hover:text-blue-700 border-gray-200 hover:border-blue-400 hover:shadow-sm"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh Data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSoftDelete}
                        className="bg-white hover:bg-white text-red-600 hover:text-red-700 border-gray-200 hover:border-red-400 hover:shadow-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Vehicle</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Optional: Show pricing status badge */}
              {vehicle.pricing_status && (
                <Badge
                  variant="outline"
                  className={
                    vehicle.pricing_status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : vehicle.pricing_status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }
                >
                  {vehicle.pricing_status}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <VehicleOverviewSection vehicle={vehicle} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <VehicleGeneralInfoSection
                vehicle={vehicle}
                onUpdate={onUpdate}
              />
              <VehicleSourceSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleRegistrationSection
                vehicle={vehicle}
                onUpdate={onUpdate}
              />
              <VehicleEngineSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleSpecificationsSection
                vehicle={vehicle}
                onUpdate={onUpdate}
              />
              <VehicleOdometerSection vehicle={vehicle} onUpdate={onUpdate} />

              {/* Import Section */}
              <VehicleImportSection vehicle={vehicle} onUpdate={onUpdate} />

              {/* Ownership Section */}
              <VehicleOwnershipSection vehicle={vehicle} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="attachments">
              <VehicleAttachmentsSection
                vehicle={vehicle}
                onUpdate={onUpdate}
                vehicleType="pricing"
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Cost Calculation Dialog */}
      <CostCalculationDialog
        completeUser={completeUser}
        open={costCalculationOpen}
        onClose={handleCostCalculationClose}
        vehicle={selectedVehicleForCost}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmationOpen(false);
                setPendingAction(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VehiclePricingSideModal;