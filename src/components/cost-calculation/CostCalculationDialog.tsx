import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, Car, Pencil, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyServices, commonVehicleServices } from "@/api/services";
import CostSummary from "./CostSummary";
import CostEditDialog from "./CostEditDialog";
import CurrencySelectionDialog from "./CurrencySelectionDialog";
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
  const [editingCost, setEditingCost] = useState<any>(null);
  const [editingCostType, setEditingCostType] = useState<any>(null);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [selectedCostForCurrency, setSelectedCostForCurrency] = useState<any>(null);

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

  const handleEditCost = (costType: any, costTypeId: string) => {
    setEditingCostType(costType);
    setEditingCost(costData[costTypeId]);
  };

  const handleOpenCurrencyDialog = (costType: any, costTypeId: string) => {
    setSelectedCostForCurrency({ costType, costTypeId });
    setCurrencyDialogOpen(true);
  };

  const handleCurrencyChange = (currency: any) => {
    if (selectedCostForCurrency) {
      const { costTypeId } = selectedCostForCurrency;
      const currentCost = costData[costTypeId];
      handleCostChange(costTypeId, {
        ...currentCost,
        currency: currency,
        exchange_rate: currency.exchange_rate,
      });
    }
  };

  const handleSave = () => {
    saveMutation.mutate(costData);
  };

  const getTaxTypeLabel = (taxType: string) => {
    if (taxType === "exclusive") return "excl";
    if (taxType === "inclusive") return "incl";
    if (taxType === "zero_gst") return "excl";
    return "excl";
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
            <div className="w-[15vw] border-r bg-muted/30 p-4">
              <div className="space-y-4">
                <div className="w-full h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
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

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px]">Stock ID</span>
                    <p className="font-medium">{vehicle.vehicle_stock_id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">VIN</span>
                    <p className="font-medium text-xs">{vehicle.vin}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">Registration</span>
                    <p className="font-medium">{vehicle.plate_no}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">Year</span>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">Vehicle</span>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                  </div>
                  {vehicle.variant && (
                    <div>
                      <span className="text-muted-foreground text-[10px]">Variant</span>
                      <p className="font-medium">{vehicle.variant}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center - Cost Tables */}
            <div className="flex-1">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <h3 className="font-semibold mb-4 text-lg">Cost Heads</h3>
                  
                  {costConfig?.sections?.map((section: any) => {
                    const isPricingSection = section.section_name === "pricing_cost";
                    
                    return (
                      <div key={section.section_name} className="mb-6">
                        <h4 className="font-semibold text-sm mb-3 px-2">
                          {formatApiNames(section.section_name)}
                        </h4>
                        
                        {/* Table Header */}
                        <div className={`grid ${isPricingSection ? 'grid-cols-[40px_1fr_200px]' : 'grid-cols-[40px_1fr_150px_80px_200px]'} gap-2 bg-muted/50 p-2 rounded-t-lg text-xs font-medium`}>
                          <div>Actions</div>
                          <div>Cost Head</div>
                          {!isPricingSection && (
                            <>
                              <div>Invoiced Currency</div>
                              <div>Fx</div>
                            </>
                          )}
                          <div>Base Currency</div>
                        </div>
                        
                        {/* Table Rows */}
                        <div className="space-y-1">
                          {section.cost_types.map((costType: any) => {
                            const costValue = costData[costType._id];
                            const invoicedAmount = costValue?.net_amount || "0";
                            const invoicedTax = costValue?.total_tax || "0";
                            const invoicedTotal = costValue?.total_amount || "0";
                            const fxRate = costValue?.exchange_rate || 1;
                            const baseAmount = (parseFloat(invoicedAmount) * fxRate).toFixed(2);
                            const baseTax = (parseFloat(invoicedTax) * fxRate).toFixed(2);
                            const baseTotal = (parseFloat(invoicedTotal) * fxRate).toFixed(2);
                            const taxLabel = getTaxTypeLabel(costValue?.tax_type || "exclusive");
                            
                            return (
                              <div
                                key={costType._id}
                                className={`grid ${isPricingSection ? 'grid-cols-[40px_1fr_200px]' : 'grid-cols-[40px_1fr_150px_80px_200px]'} gap-2 p-2 border-b hover:bg-muted/30 text-xs items-center`}
                              >
                                {/* Actions */}
                                <div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleEditCost(costType, costType._id)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                {/* Cost Head */}
                                <div className="font-medium">
                                  {formatApiNames(costType.cost_type)}
                                </div>
                                
                                {/* Invoiced Currency (only for non-pricing sections) */}
                                {!isPricingSection && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <div className="text-[11px]">
                                        {costValue?.currency?.symbol} {invoicedTotal} {taxLabel}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        (GST {costValue?.tax_rate || 0}%)
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      className="h-7 w-7 p-0 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
                                      onClick={() => handleOpenCurrencyDialog(costType, costType._id)}
                                    >
                                      <ArrowLeftRight className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                
                                {/* FX Rate (only for non-pricing sections) */}
                                {!isPricingSection && (
                                  <div className="text-center">
                                    {costType.fx_rate ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={fxRate}
                                        onChange={(e) => {
                                          handleCostChange(costType._id, {
                                            ...costValue,
                                            exchange_rate: parseFloat(e.target.value) || 1,
                                          });
                                        }}
                                        className="w-16 h-7 px-1 text-center text-xs border rounded"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground">{fxRate}</span>
                                    )}
                                  </div>
                                )}
                                
                                {/* Base Currency */}
                                <div>
                                  <div className="text-[11px]">
                                    {costValue?.currency?.symbol} {baseTotal} {taxLabel}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    (GST {baseTax})
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[hsl(var(--primary))]">
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </DialogContent>

      {/* Edit Cost Dialog */}
      {editingCost && editingCostType && (
        <CostEditDialog
          open={!!editingCost}
          onClose={() => {
            setEditingCost(null);
            setEditingCostType(null);
          }}
          costType={editingCostType}
          value={editingCost}
          onChange={(value) => {
            handleCostChange(editingCostType._id, value);
            setEditingCost(null);
            setEditingCostType(null);
          }}
          availableCurrencies={costConfig?.available_company_currency || []}
        />
      )}

      {/* Currency Selection Dialog */}
      <CurrencySelectionDialog
        open={currencyDialogOpen}
        onClose={() => {
          setCurrencyDialogOpen(false);
          setSelectedCostForCurrency(null);
        }}
        availableCurrencies={costConfig?.available_company_currency || []}
        selectedCurrency={selectedCostForCurrency ? costData[selectedCostForCurrency.costTypeId]?.currency : null}
        onSelectCurrency={handleCurrencyChange}
      />
    </Dialog>
  );
};

export default CostCalculationDialog;
