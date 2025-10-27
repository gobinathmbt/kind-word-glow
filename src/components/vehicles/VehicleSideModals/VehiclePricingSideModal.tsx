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
import { Car, Calculator } from "lucide-react";
import { commonVehicleServices } from "@/api/services";
import { toast } from "sonner";
import VehicleOverviewSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleOverviewSection";
import VehicleGeneralInfoSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleGeneralInfoSection";
import VehicleSourceSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleSourceSection";
import VehicleRegistrationSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleRegistrationSection";
import VehicleImportSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleImportSection";
import VehicleEngineSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleEngineSection";
import VehicleSpecificationsSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleSpecificationsSection";
import VehicleOdometerSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleOdometerSection";
import VehicleOwnershipSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleOwnershipSection";
import VehicleAttachmentsSection from "@/components/vehicles/VehicleSections/TradeInSections/VehicleAttachmentsSection";
import CostCalculationDialog from "@/components/cost-calculation/CostCalculationDialog";
import { useAuth } from "@/auth/AuthContext";
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
  
  const { completeUser } = useAuth();

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
  };

  if (!vehicle) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          onCloseClick={onClose}
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
                        size="sm"
                        variant="outline"
                        onClick={handleCostCalculation}
                        className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!vehicle.vehicle_source[0].purchase_type}
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pricing Calculation</p>
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
              <VehicleImportSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleEngineSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleSpecificationsSection
                vehicle={vehicle}
                onUpdate={onUpdate}
              />
              <VehicleOdometerSection vehicle={vehicle} onUpdate={onUpdate} />
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
    </>
  );
};

export default VehiclePricingSideModal;