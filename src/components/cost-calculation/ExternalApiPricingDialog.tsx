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
  previousEvaluationData?: any[]; // Add this
}

interface Integration {
  _id: string;
  integration_type: string;
  display_name: string;
  environments: {
    [key: string]: {
      configuration: {
        api_key: string;
        vehicle_retrieval_url: string;
        valuation_url: string;
      };
      is_active: boolean;
    };
  };
  active_environment: string;
  is_active: boolean;
}

interface VehicleDetails {
  id: string;
  region: string;
  title: string;
  year: string;
  make: string;
  model: string;
  badge: string;
  series: string;
  model_year: string;
  release_month: number;
  release_year: number;
  body_type: string;
  body_config: string | null;
  transmission: string;
  transmission_type: string;
  wheelbase: string | null;
  wheelbase_type: string | null;
  fuel: string;
  fuel_type: string;
  engine: string;
  engine_type: string;
  drive: string;
  drive_type: string;
  num_doors: number;
  num_seats: number;
  num_gears: number;
  num_cylinders: number;
  capacity_cc: number;
  power_kw: number;
  torque_nm: number;
  range: number;
  options: string[];
}

interface ValuationPrediction {
  id: string;
  vehicle_id: string;
  kms: number;
  price: number;
  score: number;
  retail_price: number;
  trade_price: number;
  adjustment: any;
}

const ExternalApiPricingDialog: React.FC<ExternalApiPricingDialogProps> = ({ 
  open, 
  onClose, 
  vehicle,
  onApplyPricing ,
  previousEvaluationData
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
      return response.data.data?.filter((integration: Integration) => 
        integration.is_active && 
        (integration.integration_type === "autograb_vehicle_pricing_integration")
      );
    },
    enabled: open,
  });

  // Load previous evaluations if available
  React.useEffect(() => {
    if (vehicle?.cost_details?.external_api_evaluations) {
      setPreviousEvaluations(vehicle.cost_details.external_api_evaluations || previousEvaluationData);
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

  // Step 1: Fetch vehicle details from AutoGrab
  const fetchAutoGrabVehicleDetails = async (integration: Integration): Promise<VehicleDetails> => {
    const environment = integration.active_environment || 'production';
    const { configuration } = integration.environments[environment];
    
    let url = "";
    
    if (searchType === "rego") {
      const state = vehicle?.state || "VIC"; 
      url = `${configuration.vehicle_retrieval_url}/${searchValue}?state=${state}&region=au`;
    } else {
     const state = vehicle?.state || "VIC"; 
      url = `${configuration.vehicle_retrieval_url}?vin=${searchValue}?state=${state}&region=au`;
    }

    const headers: HeadersInit = {
      'ApiKey': `${configuration.api_key}`,
      'Accept': 'application/json',
    };

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AutoGrab Vehicle API error: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`AutoGrab API returned error: ${data.message || 'Unknown error'}`);
    }

    return data.vehicle;
  };

  // Step 2: Fetch valuation from AutoGrab
  const fetchAutoGrabValuation = async (integration: Integration, vehicleId: string): Promise<ValuationPrediction> => {
    const environment = integration.active_environment || 'production';
    const { configuration } = integration.environments[environment];
    
    const url = configuration.valuation_url;
    
    const headers: HeadersInit = {
      'ApiKey': `${configuration.api_key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const requestBody = {
      region: "au",
      vehicle_id: vehicleId,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AutoGrab Valuation API error: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`AutoGrab Valuation API returned error: ${data.message || 'Unknown error'}`);
    }

    return data.prediction;
  };

  // Main AutoGrab API call function
  const fetchAutoGrabPricing = async (integration: Integration) => {
    try {
      const vehicleDetails = await fetchAutoGrabVehicleDetails(integration);
      const valuation = await fetchAutoGrabValuation(integration, vehicleDetails.id);
      return {
        integration_type: integration.integration_type,
        display_name: integration.display_name,
        search_type: searchType,
        search_value: searchValue,
        timestamp: new Date().toISOString(),
        vehicle_details: {
          vehicle_id: vehicleDetails.id,
          make: vehicleDetails.make || vehicle?.make,
          model: vehicleDetails.model || vehicle?.model,
          year: vehicleDetails.year || vehicle?.year,
          variant: vehicleDetails.badge || vehicle?.variant,
          series: vehicleDetails.series,
          registration: searchType === "rego" ? searchValue : vehicle?.plate_no,
          vin: searchType === "vin" ? searchValue : vehicle?.vin,
          body_type: vehicleDetails.body_type,
          transmission: vehicleDetails.transmission,
          fuel_type: vehicleDetails.fuel_type,
          engine: vehicleDetails.engine,
          drive_type: vehicleDetails.drive_type,
          capacity_cc: vehicleDetails.capacity_cc,
          power_kw: vehicleDetails.power_kw,
          num_doors: vehicleDetails.num_doors,
          num_seats: vehicleDetails.num_seats,
        },
        valuations: {
          trade_in_low: Math.round(valuation.trade_price * 0.9), 
          trade_in_average: valuation.trade_price,
          trade_in_high: Math.round(valuation.trade_price * 1.1),
          retail_low: Math.round(valuation.retail_price * 0.9),
          retail_average: valuation.retail_price,
          retail_high: Math.round(valuation.retail_price * 1.1),
          wholesale: valuation.trade_price,
        },
        prediction_details: {
          prediction_id: valuation.id,
          score: valuation.score,
          kms: valuation.kms,
          condition_score: 3, 
          adjustment: valuation.adjustment,
        },
        specifications: {
          engine: vehicleDetails.engine_type,
          transmission: vehicleDetails.transmission_type,
          fuel_type: vehicleDetails.fuel_type,
          body_type: vehicleDetails.body_type,
          drive_type: vehicleDetails.drive_type,
          capacity: `${vehicleDetails.capacity_cc}cc`,
          power: `${vehicleDetails.power_kw}kW`,
          doors: vehicleDetails.num_doors,
          seats: vehicleDetails.num_seats,
        },
        condition_adjustments: {
          odometer: valuation.kms,
          condition: "Good", // Based on our default condition_score of 3
          condition_score: 3,
          adjustments: valuation.adjustment ? [valuation.adjustment] : []
        },
        raw_data: {
          vehicle: vehicleDetails,
          prediction: valuation
        }
      };
    } catch (error: any) {
      console.error("AutoGrab API Error:", error);
      throw new Error(`AutoGrab integration failed: ${error.message}`);
    }
  };

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
    setSearchResults(null);
    
    try {
      const selectedIntegrationData = integrationsData.find(
        (integration: Integration) => integration.integration_type === selectedIntegration
      );

      if (!selectedIntegrationData) {
        throw new Error("Selected integration not found");
      }

      let results;
      
      if (selectedIntegration === "autograb_vehicle_pricing_integration") {
        results = await fetchAutoGrabPricing(selectedIntegrationData);
      } else {
        throw new Error("Unsupported integration type");
      }

      setSearchResults(results);
      
      // Add to previous evaluations
      setPreviousEvaluations(prev => [results, ...prev.slice(0, 9)]); // Keep only last 10
      
      toast.success("Pricing data retrieved successfully");
    } catch (error: any) {
      console.error("API Search Error:", error);
      toast.error(error?.message || "Failed to fetch pricing data from external API");
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

  const getSelectedIntegrationConfig = (): Integration | undefined => {
    return integrationsData?.find((integration: Integration) => 
      integration.integration_type === selectedIntegration
    );
  };

  const integrationConfig = getSelectedIntegrationConfig();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>External API Pricing Lookup</DialogTitle>
          <DialogDescription>
            Search for vehicle pricing using external integrations. AutoGrab will first retrieve vehicle details then provide valuation.
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
                  integrationsData?.map((integration: Integration) => (
                    <SelectItem key={integration._id} value={integration.integration_type}>
                      <div className="flex items-center justify-between">
                        <span>{integration.display_name}</span>
                        <Badge 
                          variant={integration.is_active ? "default" : "secondary"} 
                          className="ml-2 text-xs"
                        >
                          {integration.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {integrationConfig && (
              <div className="text-xs text-muted-foreground mt-1">
                Environment: {integrationConfig.active_environment}
              </div>
            )}
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
                  onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                  placeholder={searchType === "rego" ? "Enter rego" : "Enter VIN"}
                  className="flex-1 uppercase"
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
                <h3 className="font-semibold">Latest Results - {searchResults.display_name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Score: {(searchResults.prediction_details.score * 100).toFixed(1)}%
                  </Badge>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Retrieved
                  </Badge>
                </div>
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
                        <span className="text-muted-foreground">Vehicle ID:</span>
                        <span className="ml-2 font-medium">{searchResults.vehicle_details.vehicle_id}</span>
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

                  {/* Prediction Details */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Prediction Details</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Odometer:</span>
                        <span className="ml-2 font-medium">{searchResults.prediction_details.kms.toLocaleString()} km</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Condition:</span>
                        <span className="ml-2 font-medium">{searchResults.condition_adjustments.condition}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prediction ID:</span>
                        <span className="ml-2 font-medium text-xs">{searchResults.prediction_details.prediction_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specifications */}
                  {Object.values(searchResults.specifications).some(value => value) && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Specifications</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(searchResults.specifications)
                          .filter(([_, value]) => value)
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground">{formatApiNames(key)}:</span>
                              <span className="ml-2 font-medium">{value as string}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyPricing(searchResults)} size="sm">
                 Save Pricing Snapshot
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
                            {evaluation.display_name || formatApiNames(evaluation.integration_type)} • {evaluation.search_type.toUpperCase()}: {evaluation.search_value}
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