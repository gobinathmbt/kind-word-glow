import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { integrationServices } from "@/api/services";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExternalPricingDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: any;
  onPricingReceived: (pricingData: any, integrationType: string) => void;
}

const ExternalPricingDialog: React.FC<ExternalPricingDialogProps> = ({
  open,
  onClose,
  vehicle,
  onPricingReceived,
}) => {
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [pricingResult, setPricingResult] = useState<any>(null);

  // Fetch available integrations
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ["pricing-integrations"],
    queryFn: async () => {
      const response = await integrationServices.getIntegrations();
      // Filter only pricing integrations
      return response.data.data.filter(
        (integration: any) =>
          (integration.integration_type === "autograb_vehicle_pricing_integration" ||
            integration.integration_type === "redbook_vehicle_pricing_integration") &&
          integration.is_active
      );
    },
    enabled: open,
  });

  // Mutation for fetching pricing
  const getPricingMutation = useMutation({
    mutationFn: async (integrationType: string) => {
      // Mock API call - Replace with actual API integration
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Mock response data
      return {
        success: true,
        integration_type: integrationType,
        lookup_data: {
          vin: vehicle.vin,
          registration: vehicle.plate_no,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          variant: vehicle.variant,
        },
        valuation: {
          trade_low: 25000,
          trade_average: 27500,
          trade_high: 30000,
          retail_low: 32000,
          retail_average: 35000,
          retail_high: 38000,
          wholesale: 24000,
        },
        retrieved_at: new Date().toISOString(),
      };
    },
    onSuccess: (data) => {
      setPricingResult(data);
      toast.success("Pricing data retrieved successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to retrieve pricing data"
      );
    },
  });

  const handleGetPricing = () => {
    if (!selectedIntegration) {
      toast.error("Please select an integration");
      return;
    }

    if (!vehicle.vin && !vehicle.plate_no) {
      toast.error("Vehicle must have either VIN or Registration number");
      return;
    }

    getPricingMutation.mutate(selectedIntegration);
  };

  const handleUsePricing = () => {
    if (pricingResult) {
      onPricingReceived(pricingResult, selectedIntegration);
      onClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getIntegrationName = (type: string) => {
    if (type === "autograb_vehicle_pricing_integration") return "AutoGrab";
    if (type === "redbook_vehicle_pricing_integration") return "RedBook";
    return type;
  };

  // Check if vehicle has previous pricing data
  const hasPreviousPricing = vehicle?.external_pricing_data?.length > 0;
  const previousPricing = vehicle?.external_pricing_data?.[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>External API Pricing</DialogTitle>
          <DialogDescription>
            Fetch vehicle pricing and valuation from external providers
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Vehicle Info */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">Vehicle Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Stock ID:</span>{" "}
                  <span className="font-medium">{vehicle?.vehicle_stock_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">VIN:</span>{" "}
                  <span className="font-medium">{vehicle?.vin || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Registration:</span>{" "}
                  <span className="font-medium">{vehicle?.plate_no || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle:</span>{" "}
                  <span className="font-medium">
                    {vehicle?.year} {vehicle?.make} {vehicle?.model}
                  </span>
                </div>
              </div>
            </div>

            {/* Previous Pricing Data */}
            {hasPreviousPricing && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Previous valuation available</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        From {getIntegrationName(previousPricing?.integration_type)} on{" "}
                        {new Date(previousPricing?.retrieved_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Retail: {formatCurrency(previousPricing?.valuation?.retail_average || 0)}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Integration Selection */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Select Integration Provider</Label>
                <Select
                  value={selectedIntegration}
                  onValueChange={setSelectedIntegration}
                  disabled={isLoadingIntegrations || getPricingMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a pricing integration" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationsData?.map((integration: any) => (
                      <SelectItem
                        key={integration._id}
                        value={integration.integration_type}
                      >
                        <div className="flex items-center gap-2">
                          <span>{integration.display_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {integration.environment || "production"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {integrationsData?.length === 0 && !isLoadingIntegrations && (
                  <p className="text-xs text-red-500">
                    No active pricing integrations found. Please configure an integration first.
                  </p>
                )}
              </div>

              {!vehicle.vin && !vehicle.plate_no && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This vehicle is missing both VIN and Registration number. At least one is required for pricing lookup.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleGetPricing}
                disabled={
                  !selectedIntegration ||
                  (!vehicle.vin && !vehicle.plate_no) ||
                  getPricingMutation.isPending
                }
                className="w-full"
              >
                {getPricingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Pricing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Get Pricing
                  </>
                )}
              </Button>
            </div>

            {/* Pricing Results */}
            {pricingResult && (
              <div className="space-y-4 border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Valuation Results</h4>
                  <Badge className="bg-green-100 text-green-800">
                    {getIntegrationName(pricingResult.integration_type)}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Trade Low</p>
                      <p className="font-semibold">
                        {formatCurrency(pricingResult.valuation.trade_low)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Trade Average</p>
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(pricingResult.valuation.trade_average)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Trade High</p>
                      <p className="font-semibold">
                        {formatCurrency(pricingResult.valuation.trade_high)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Retail Low</p>
                      <p className="font-semibold">
                        {formatCurrency(pricingResult.valuation.retail_low)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-600 mb-1 font-medium">Retail Average</p>
                      <p className="font-bold text-purple-600 text-lg">
                        {formatCurrency(pricingResult.valuation.retail_average)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Retail High</p>
                      <p className="font-semibold">
                        {formatCurrency(pricingResult.valuation.retail_high)}
                      </p>
                    </div>
                  </div>

                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-600 mb-1">Wholesale Price</p>
                    <p className="font-semibold text-orange-600">
                      {formatCurrency(pricingResult.valuation.wholesale)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground text-center">
                  Retrieved at: {new Date(pricingResult.retrieved_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {pricingResult && (
            <Button
              onClick={handleUsePricing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Use This Pricing
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalPricingDialog;
