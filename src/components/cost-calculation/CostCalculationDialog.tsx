import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, Car } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyServices, commonVehicleServices } from "@/api/services";
import CostEntryField from "./CostEntryField";
import CostSummary from "./CostSummary";
import { formatApiNames } from "@/utils/GlobalUtils";

interface CostCalculationDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: any;
}

const CostCalculationDialog: React.FC<CostCalculationDialogProps> = ({
  open,
  onClose,
  vehicle,
}) => {
  const queryClient = useQueryClient();
  const [costData, setCostData] = useState<any>({});

  // Fetch cost configuration based on vehicle type
  const { data: costConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["cost-configuration", vehicle?.vehicle_type],
    queryFn: async () => {
      const vehiclePurchaseType = vehicle?.vehicle_type === "master" ? "local_vehicle" : "import_vehicle";
      const response = await companyServices.getCostConfigurationByVehicleType(vehiclePurchaseType);
      return response.data.data;
    },
    enabled: open && !!vehicle,
  });

  // Initialize cost data with existing values or defaults
  useEffect(() => {
    if (costConfig && vehicle) {
      const initialData: any = {};
      
      costConfig.sections?.forEach((section: any) => {
        section.cost_types.forEach((costType: any) => {
          // Check if vehicle has existing cost_details
          if (vehicle.cost_details && vehicle.cost_details[costType._id]) {
            initialData[costType._id] = vehicle.cost_details[costType._id];
          } else {
            // Initialize with default values
            initialData[costType._id] = {
              currency: costType.currency_id,
              exchange_rate: costType.currency_id?.exchange_rate || 1,
              tax_rate: costType.default_tax_rate || "0",
              tax_type: costType.default_tax_type || "exclusive",
              net_amount: "0",
              total_tax: "0",
              total_amount: "0",
            };
          }
        });
      });
      
      setCostData(initialData);
    }
  }, [costConfig, vehicle]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await commonVehicleServices.saveVehicleCostDetails(
        vehicle._id,
        vehicle.vehicle_type,
        { cost_details: data }
      );
    },
    onSuccess: () => {
      toast.success("Cost details saved successfully");
      queryClient.invalidateQueries({ queryKey: ["pricing-ready-vehicles"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save cost details");
    },
  });

  const handleCostChange = (costTypeId: string, value: any) => {
    setCostData((prev: any) => ({
      ...prev,
      [costTypeId]: value,
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(costData);
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            Cost Details - {vehicle.vehicle_stock_id} / {vehicle.year} {vehicle.make} {vehicle.model}
          </DialogTitle>
        </DialogHeader>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex h-[calc(90vh-80px)]">
            {/* Left Sidebar - Vehicle Info */}
            <div className="w-[20vw] border-r bg-muted/30 p-4">
              <h3 className="font-semibold mb-4">Vehicle Information</h3>
              
              <div className="space-y-4">
                <div className="w-full h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {vehicle.vehicle_hero_image ? (
                    <img
                      src={vehicle.vehicle_hero_image}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Car className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Stock ID:</span>
                    <p className="font-medium">{vehicle.vehicle_stock_id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VIN:</span>
                    <p className="font-medium">{vehicle.vin}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registration:</span>
                    <p className="font-medium">{vehicle.plate_no}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Year:</span>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vehicle:</span>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                  </div>
                  {vehicle.variant && (
                    <div>
                      <span className="text-muted-foreground">Variant:</span>
                      <p className="font-medium">{vehicle.variant}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center - Cost Forms */}
            <div className="flex-1 w-[60vw]">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <h3 className="font-semibold mb-4">Cost Heads</h3>
                  
                  {costConfig?.sections?.map((section: any) => (
                    <div key={section.section_name} className="mb-6">
                      <h4 className="font-medium text-sm mb-3 text-primary">
                        {formatApiNames(section.section_name)}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {section.cost_types.map((costType: any) => (
                          <CostEntryField
                            key={costType._id}
                            costType={costType}
                            availableCurrencies={costConfig.available_company_currency || []}
                            value={costData[costType._id]}
                            onChange={(value) => handleCostChange(costType._id, value)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right Sidebar - Summary */}
            <div className="w-[20vw]">
              <CostSummary
                costData={costData}
                sections={costConfig?.sections || []}
              />
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CostCalculationDialog;
