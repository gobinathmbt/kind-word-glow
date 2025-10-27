import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Car, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyServices, commonVehicleServices } from "@/api/services";
import CostSummary from "./CostSummary";
import CostEditDialog from "./CostEditDialog";
import AddOnExpenses from "./AddOnExpenses";
import ExternalApiPricingDialog from "./ExternalApiPricingDialog";
import { formatApiNames } from "@/utils/GlobalUtils";
import { Button } from "../ui/button";

interface CostCalculationDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: any;
  completeUser: any;
}

const CostCalculationDialog: React.FC<CostCalculationDialogProps> = ({ open, onClose, vehicle, completeUser }) => {
  const queryClient = useQueryClient();
  const [costData, setCostData] = useState<any>({});
  const [editingCost, setEditingCost] = useState<any>(null);
  const [editingCostType, setEditingCostType] = useState<any>(null);
  const [addOnExpenses, setAddOnExpenses] = useState<any[]>([]);
  const [externalPricingOpen, setExternalPricingOpen] = useState(false);
  const [externalApiEvaluations, setExternalApiEvaluations] = useState<any[]>([]);


  const companyCurrency = completeUser?.company_id?.currency;

  // Fetch cost configuration based on vehicle type
  const { data: costConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["cost-configuration", vehicle?.vehicle_type],
    queryFn: async () => {
      const vehiclePurchaseType = vehicle.vehicle_source[0].purchase_type;
      const response = await companyServices.getCostConfigurationByVehicleType(vehiclePurchaseType);
      return response.data.data;
    },
    enabled: open && !!vehicle,
  });

    const getValueFromVehicleDetails = (costType: string) => {
    if (!vehicle?.vehicle_other_details?.[0]) return null;
    
    const vehicleDetails = vehicle.vehicle_other_details[0];
    
    const fieldMapping: { [key: string]: string } = {
      'purchase_price': 'purchase_price',
      'retail_price': 'retail_price',
      'sold_price': 'sold_price'
    };
    
    const fieldName = fieldMapping[costType];
    return fieldName ? vehicleDetails[fieldName] : null;
  };


  // Initialize cost data with existing values or defaults
 useEffect(() => {
    if (costConfig && vehicle) {
      const initialData: any = {};

      costConfig.sections?.forEach((section: any) => {
        section.cost_types.forEach((costType: any) => {
          if (vehicle.cost_details && vehicle.cost_details[costType._id]) {
            initialData[costType._id] = vehicle.cost_details[costType._id];
          } else {
            const vehicleDetailsValue = getValueFromVehicleDetails(costType.cost_type);
            const defaultValue = vehicleDetailsValue !== null ? 
              vehicleDetailsValue : 
              (parseFloat(costType.default_value) || 0);
            
            const netAmount = defaultValue > 0 ? defaultValue.toString() : "0";
            const taxRate = costType.default_tax_rate || "0";
            const taxType = costType.default_tax_type || "exclusive";
            
            let totalTax = "0";
            let totalAmount = "0";
            
            if (taxType === "exclusive") {
              totalTax = ((defaultValue * parseFloat(taxRate)) / 100).toFixed(2);
              totalAmount = (defaultValue + parseFloat(totalTax)).toFixed(2);
            } else if (taxType === "inclusive") {
              totalAmount = netAmount;
              totalTax = ((defaultValue * parseFloat(taxRate)) / (100 + parseFloat(taxRate))).toFixed(2);
            } else if (taxType === "zero_gst") {
              totalTax = "0";
              totalAmount = netAmount;
            }

            initialData[costType._id] = {
              currency: costType.currency_id,
              exchange_rate: costType.currency_id?.exchange_rate || 1,
              tax_rate: taxRate,
              tax_type: taxType,
              net_amount: netAmount,
              total_tax: totalTax,
              total_amount: totalAmount,
            };
          }
        });
      });

      setCostData(initialData);

      // Initialize add-on expenses
      if (vehicle.cost_details && vehicle.cost_details.addon_expenses) {
        setAddOnExpenses(vehicle.cost_details.addon_expenses);
      }
        if (vehicle?.cost_details?.external_api_evaluations) {
      setExternalApiEvaluations(vehicle.cost_details.external_api_evaluations);
    }
    }
  }, [costConfig, vehicle]);

  // Save mutation
   const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await commonVehicleServices.saveVehicleCostDetails(vehicle._id, vehicle.vehicle_type, {
        cost_details: {
          ...data,
          addon_expenses: addOnExpenses,
          external_api_evaluations: externalApiEvaluations,
        },
      });
    },
    onSuccess: () => {
      toast.success("Cost details saved successfully");
      queryClient.invalidateQueries({ queryKey: ["pricing-ready-vehicles"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save cost details");
    },
  });

  const handleApplyExternalPricing = (pricingData: any) => {
    const updatedEvaluations = [
      ...(vehicle.cost_details?.external_api_evaluations || []),
      pricingData,
    ];
    setExternalApiEvaluations(updatedEvaluations);
    saveMutation.mutate({
      ...costData,
      external_api_evaluations: updatedEvaluations,
    });

    setExternalPricingOpen(false);
  };

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

  const handleSave = () => {
   saveMutation.mutate({
      ...costData,
      external_api_evaluations: externalApiEvaluations,
    });
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
      <DialogContent className="max-w-[98vw] h-[98vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            Cost Details - {vehicle.vehicle_stock_id} / {vehicle.year} {vehicle.make} {vehicle.model} - Company
            Currency({companyCurrency})
          </DialogTitle>
        </DialogHeader>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex h-[calc(90vh-80px)]">
            {/* Left Sidebar - Vehicle Info */}
            <div className="w-[10vw] border-r bg-muted/30 p-4">
              <div className="space-y-4">
                <Button 
                  onClick={() => setExternalPricingOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  External Api Pricing
                </Button>
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
                    <p className="font-medium">
                      {vehicle.make} {vehicle.model}
                    </p>
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
                <div className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {costConfig?.sections?.map((section: any) => {
                      const isPricingSection = section.section_name === "pricing_cost";

                      // Render AddOn Expenses before pricing section
                      if (isPricingSection) {
                        return (
                          <React.Fragment key={section.section_name}>
                            <AddOnExpenses
                              vehicleId={vehicle._id}
                              vehicleType={vehicle.vehicle_type}
                              defaultDealershipId={vehicle.dealership_id}
                              companyCurrency={companyCurrency}
                              expenses={addOnExpenses}
                              onChange={setAddOnExpenses}
                              availableCurrencies={costConfig?.available_company_currency || []}
                            />
                            <div className="border rounded-md bg-card shadow-sm overflow-hidden">
                              <h4 className="font-semibold text-sm mb-0 px-4 py-2 bg-muted/30">
                                {formatApiNames(section.section_name)}
                              </h4>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/50 border-b">
                                      <th className="text-left p-2 font-medium">Cost Head</th>
                                      {!isPricingSection && (
                                        <>
                                          <th className="text-center p-2 font-medium w-48">Invoiced Currency</th>
                                          <th className="text-center p-2 font-medium w-20">Fx</th>
                                        </>
                                      )}
                                      <th className="text-center p-2 font-medium w-48">Base Currency</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {section.cost_types.map((costType) => {
                                      const costValue = costData[costType._id];
                                      const invoicedAmount = costValue?.net_amount || "0";
                                      const invoicedTax = costValue?.total_tax || "0";
                                      const invoicedTotal = costValue?.total_amount || "0";
                                      const fxRate = costValue?.exchange_rate || 1;
                                      const baseAmount = (parseFloat(invoicedAmount) * fxRate).toFixed(2);
                                      const baseTax = (parseFloat(invoicedTax) * fxRate).toFixed(2);
                                      const baseTotal = (parseFloat(invoicedTotal) * fxRate).toFixed(2);
                                      const taxLabel = getTaxTypeLabel(costValue?.tax_type || "exclusive");

                                      const costCurrency =
                                        costValue?.currency?.currency_code || costType?.currency_id?.currency_code;
                                      const showInvoicedCurrency =
                                        costCurrency !== companyCurrency && !isPricingSection;

                                      return (
                                        <tr key={costType._id} className="border-b hover:bg-muted/30">
                                          {/* Cost Head */}
                                          <td className="p-2 font-medium">{formatApiNames(costType.cost_type)}</td>

                                          {/* Invoiced Currency */}
                                          {!isPricingSection && (
                                            <>
                                              <td className="p-2">
                                                {showInvoicedCurrency ? (
                                                  <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded">
                                                    <div className="flex-1">
                                                      <div
                                                        className={`text-xs ${parseFloat(invoicedTotal) < 0 ? "text-red-500" : ""}`}
                                                      >
                                                        {costValue?.currency?.symbol} {invoicedTotal} {taxLabel}
                                                      </div>
                                                      <div className="text-[10px] text-muted-foreground">
                                                        (GST {costValue?.tax_rate || 0}%)
                                                      </div>
                                                    </div>
                                                    {costType.change_currency && (
                                                      <button
                                                        onClick={() => handleEditCost(costType, costType._id)}
                                                        className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded flex-shrink-0"
                                                        title="Currency Converter"
                                                      >
                                                        <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
                                                      </button>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="text-center text-muted-foreground">-</div>
                                                )}
                                              </td>

                                              {/* FX Rate */}
                                              <td className="p-2">
                                                {showInvoicedCurrency ? (
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    value={fxRate}
                                                    onChange={(e) =>
                                                      handleCostChange(costType._id, {
                                                        ...costValue,
                                                        exchange_rate: parseFloat(e.target.value) || 1,
                                                      })
                                                    }
                                                    className="w-16 h-8 text-center border rounded bg-background text-xs mx-auto block"
                                                  />
                                                ) : (
                                                  <div className="text-center text-muted-foreground">-</div>
                                                )}
                                              </td>
                                            </>
                                          )}

                                          {/* Base Currency */}
                                          <td className="p-2">
                                            <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded">
                                              <div className="flex-1">
                                                <div
                                                  className={`text-xs ${parseFloat(baseTotal) < 0 ? "text-red-500" : ""}`}
                                                >
                                                  {companyCurrency} {baseTotal} {taxLabel}
                                                </div>
                                                <div
                                                  className={`text-[10px] ${parseFloat(baseTax) < 0 ? "text-red-500" : "text-muted-foreground"}`}
                                                >
                                                  (GST {baseTax})
                                                </div>
                                              </div>
                                              {(!showInvoicedCurrency || isPricingSection) && (
                                                <button
                                                  onClick={() => handleEditCost(costType, costType._id)}
                                                  className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded flex-shrink-0"
                                                  title="Currency Converter"
                                                >
                                                  <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      }

                      return (
                        <div key={section.section_name} className="border rounded-md bg-card shadow-sm overflow-hidden">
                          <h4 className="font-semibold text-sm mb-0 px-4 py-2 bg-muted/30">
                            {formatApiNames(section.section_name)}
                          </h4>

                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/50 border-b">
                                  <th className="text-left p-2 font-medium">Cost Head</th>
                                  {!isPricingSection && (
                                    <>
                                      <th className="text-center p-2 font-medium w-48">Invoiced Currency</th>
                                      <th className="text-center p-2 font-medium w-20">Fx</th>
                                    </>
                                  )}
                                  <th className="text-center p-2 font-medium w-48">Base Currency</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section.cost_types.map((costType) => {
                                  const costValue = costData[costType._id];
                                  const invoicedAmount = costValue?.net_amount || "0";
                                  const invoicedTax = costValue?.total_tax || "0";
                                  const invoicedTotal = costValue?.total_amount || "0";
                                  const fxRate = costValue?.exchange_rate || 1;
                                  const baseAmount = (parseFloat(invoicedAmount) * fxRate).toFixed(2);
                                  const baseTax = (parseFloat(invoicedTax) * fxRate).toFixed(2);
                                  const baseTotal = (parseFloat(invoicedTotal) * fxRate).toFixed(2);
                                  const taxLabel = getTaxTypeLabel(costValue?.tax_type || "exclusive");

                                  const costCurrency =
                                    costValue?.currency?.currency_code || costType?.currency_id?.currency_code;
                                  const showInvoicedCurrency = costCurrency !== companyCurrency && !isPricingSection;

                                  return (
                                    <tr key={costType._id} className="border-b hover:bg-muted/30">
                                      {/* Cost Head */}
                                      <td className="p-2 font-medium">{formatApiNames(costType.cost_type)}</td>

                                      {/* Invoiced Currency */}
                                      {!isPricingSection && (
                                        <>
                                          <td className="p-2">
                                            {showInvoicedCurrency ? (
                                              <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded">
                                                <div className="flex-1">
                                                  <div
                                                    className={`text-xs ${parseFloat(invoicedTotal) < 0 ? "text-red-500" : ""}`}
                                                  >
                                                    {costValue?.currency?.symbol} {invoicedTotal} {taxLabel}
                                                  </div>
                                                  <div className="text-[10px] text-muted-foreground">
                                                    (GST {costValue?.tax_rate || 0}%)
                                                  </div>
                                                </div>
                                                {costType.change_currency && (
                                                  <button
                                                    onClick={() => handleEditCost(costType, costType._id)}
                                                    className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded flex-shrink-0"
                                                    title="Currency Converter"
                                                  >
                                                    <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
                                                  </button>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="text-center text-muted-foreground">-</div>
                                            )}
                                          </td>

                                          {/* FX Rate */}
                                          <td className="p-2">
                                            {showInvoicedCurrency ? (
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={fxRate}
                                                onChange={(e) =>
                                                  handleCostChange(costType._id, {
                                                    ...costValue,
                                                    exchange_rate: parseFloat(e.target.value) || 1,
                                                  })
                                                }
                                                className="w-16 h-8 text-center border rounded bg-background text-xs mx-auto block"
                                              />
                                            ) : (
                                              <div className="text-center text-muted-foreground">-</div>
                                            )}
                                          </td>
                                        </>
                                      )}

                                      {/* Base Currency */}
                                      <td className="p-2">
                                        <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded">
                                          <div className="flex-1">
                                            <div
                                              className={`text-xs ${parseFloat(baseTotal) < 0 ? "text-red-500" : ""}`}
                                            >
                                              {companyCurrency} {baseTotal} {taxLabel}
                                            </div>
                                            <div
                                              className={`text-[10px] ${parseFloat(baseTax) < 0 ? "text-red-500" : "text-muted-foreground"}`}
                                            >
                                              (GST {baseTax})
                                            </div>
                                          </div>
                                          {(!showInvoicedCurrency || isPricingSection) && (
                                            <button
                                              onClick={() => handleEditCost(costType, costType._id)}
                                              className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded flex-shrink-0"
                                              title="Currency Converter"
                                            >
                                              <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Right Sidebar - Summary */}
            <div className="w-[15vw]">
              <CostSummary
                costData={costData}
                sections={costConfig?.sections || []}
                addOnExpenses={addOnExpenses}
                onCancel={onClose}
                onSave={handleSave}
                isSaving={saveMutation.isPending}
              />
            </div>
          </div>
        )}
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

      {/* External API Pricing Dialog */}
      <ExternalApiPricingDialog
        open={externalPricingOpen}
        onClose={() => setExternalPricingOpen(false)}
        vehicle={vehicle}
        onApplyPricing={handleApplyExternalPricing}
        previousEvaluationData={externalApiEvaluations}
      />
    </Dialog>
  );
};

export default CostCalculationDialog;
