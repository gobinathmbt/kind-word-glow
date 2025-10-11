import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { integrationServices } from "@/api/services";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatApiNames } from "@/utils/GlobalUtils";

interface ExternalApiPricingDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: any;
  onApplyPricing?: (pricingData: any) => void;
}

const ExternalApiPricingDialog: React.FC<ExternalApiPricingDialogProps> = ({ 
  open, 
  onClose, 
  vehicle,
  onApplyPricing 
}) => {
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [searchType, setSearchType] = useState<"rego" | "vin">("rego");
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [previousEvaluations, setPreviousEvaluations] = useState<any[]>([]);

  // Fetch active integrations
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ["active-integrations"],
    queryFn: async () => {
      const response = await integrationServices.getIntegrations();
      return response.data.data?.filter((integration: any) => 
        integration.is_active && 
        (integration.integration_type === "autograb_vehicle_pricing_integration" || 
         integration.integration_type === "redbook_vehicle_pricing_integration")
      );
    },
    enabled: open,
  });

  // Load previous evaluations if available
  React.useEffect(() => {
    if (vehicle?.cost_details?.external_api_evaluations) {
      setPreviousEvaluations(vehicle.cost_details.external_api_evaluations);
    }
  }, [vehicle]);

  // Pre-fill search value based on vehicle data
  React.useEffect(() => {
    if (vehicle) {
      if (searchType === "rego" && vehicle.plate_no) {
        setSearchValue(vehicle.plate_no);
      } else if (searchType === "vin" && vehicle.vin) {
        setSearchValue(vehicle.vin);
      }
    }
  }, [searchType, vehicle]);

  const handleSearch = async () => {
    if (!selectedIntegration) {
      toast.error("Please select an integration");
      return;
    }

    if (!searchValue.trim()) {
      toast.error(`Please enter ${searchType === "rego" ? "registration" : "VIN"} number`);
      return;
    }

    setIsSearching(true);
    try {
      // Simulate API call - Replace with actual API integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock data - Replace with actual API response
      const mockResults = {
        integration_type: selectedIntegration,
        search_type: searchType,
        search_value: searchValue,
        timestamp: new Date().toISOString(),
        vehicle_details: {
          make: vehicle.make || "Toyota",
          model: vehicle.model || "Camry",
          year: vehicle.year || 2020,
          variant: vehicle.variant || "Ascent Sport",
          registration: searchType === "rego" ? searchValue : vehicle.plate_no,
          vin: searchType === "vin" ? searchValue : vehicle.vin,
        },
        valuations: {
          trade_in_low: 22000,
          trade_in_average: 24500,
          trade_in_high: 27000,
          retail_low: 28000,
          retail_average: 31000,
          retail_high: 34000,
          wholesale: 25000,
        },
        specifications: {
          engine: "2.5L 4-Cylinder",
          transmission: "Automatic",
          fuel_type: "Petrol",
          body_type: "Sedan",
          drive_type: "FWD",
        },
        condition_adjustments: {
          odometer: vehicle.odometer || 0,
          condition: "Good",
          adjustments: [
            { factor: "Odometer", impact: -500 },
            { factor: "Condition", impact: 0 },
          ]
        }
      };

      setSearchResults(mockResults);
      
      // Add to previous evaluations
      setPreviousEvaluations(prev => [mockResults, ...prev]);
      
      toast.success("Pricing data retrieved successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to fetch pricing data");
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplyPricing = (evaluation: any) => {
    if (onApplyPricing) {
      onApplyPricing(evaluation);
      toast.success("Pricing applied to cost details");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', { 
      style: 'currency', 
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>External API Pricing Lookup</DialogTitle>
          <DialogDescription>
            Search for vehicle pricing using external integrations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Integration Selection */}
          <div className="space-y-2">
            <Label>Select Integration</Label>
            <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
              <SelectTrigger>
                <SelectValue placeholder="Choose pricing integration" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingIntegrations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  integrationsData?.map((integration: any) => (
                    <SelectItem key={integration._id} value={integration.integration_type}>
                      {integration.display_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Search Type and Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Search By</Label>
              <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rego">Registration Number</SelectItem>
                  <SelectItem value="vin">VIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{searchType === "rego" ? "Registration Number" : "VIN"}</Label>
              <div className="flex gap-2">
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={searchType === "rego" ? "Enter rego" : "Enter VIN"}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching || !selectedIntegration}
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Get Pricing
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Latest Results</h3>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Retrieved
                </Badge>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {/* Vehicle Details */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Vehicle Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Make/Model:</span>
                        <span className="ml-2 font-medium">
                          {searchResults.vehicle_details.make} {searchResults.vehicle_details.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Year:</span>
                        <span className="ml-2 font-medium">{searchResults.vehicle_details.year}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Variant:</span>
                        <span className="ml-2 font-medium">{searchResults.vehicle_details.variant}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Registration:</span>
                        <span className="ml-2 font-medium">{searchResults.vehicle_details.registration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Valuations */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Valuations</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="border rounded p-3 bg-background">
                        <div className="text-xs text-muted-foreground mb-1">Trade-In Range</div>
                        <div className="font-semibold text-sm">
                          {formatCurrency(searchResults.valuations.trade_in_low)} - {formatCurrency(searchResults.valuations.trade_in_high)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Avg: {formatCurrency(searchResults.valuations.trade_in_average)}
                        </div>
                      </div>
                      <div className="border rounded p-3 bg-background">
                        <div className="text-xs text-muted-foreground mb-1">Retail Range</div>
                        <div className="font-semibold text-sm">
                          {formatCurrency(searchResults.valuations.retail_low)} - {formatCurrency(searchResults.valuations.retail_high)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Avg: {formatCurrency(searchResults.valuations.retail_average)}
                        </div>
                      </div>
                      <div className="border rounded p-3 bg-background">
                        <div className="text-xs text-muted-foreground mb-1">Wholesale</div>
                        <div className="font-semibold text-sm">
                          {formatCurrency(searchResults.valuations.wholesale)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Specifications</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(searchResults.specifications).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{formatApiNames(key)}:</span>
                          <span className="ml-2 font-medium">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyPricing(searchResults)} size="sm">
                  Apply to Cost Details
                </Button>
              </div>
            </div>
          )}

          {/* Previous Evaluations */}
          {previousEvaluations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Previous Evaluations</h3>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {previousEvaluations.map((evaluation, index) => (
                    <div 
                      key={index} 
                      className="border rounded-lg p-3 bg-background hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSearchResults(evaluation)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {new Date(evaluation.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatApiNames(evaluation.integration_type)} • {evaluation.search_type.toUpperCase()}: {evaluation.search_value}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatCurrency(evaluation.valuations.retail_average)}
                          </div>
                          <div className="text-xs text-muted-foreground">Retail Avg</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalApiPricingDialog;
