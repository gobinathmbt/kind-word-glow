import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Clock, CheckCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { integrationServices } from "@/api/services";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatApiNames } from "@/utils/GlobalUtils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ExternalApiPricingDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: any;
  onApplyPricing?: (pricingData: any) => void;
  previousEvaluationData?: any[];
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
  onApplyPricing,
  previousEvaluationData
}) => {
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [searchType, setSearchType] = useState<"rego" | "vin">("rego");
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [previousEvaluations, setPreviousEvaluations] = useState<any[]>([]);

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

  React.useEffect(() => {
    if (vehicle?.cost_details?.external_api_evaluations) {
      setPreviousEvaluations(vehicle.cost_details.external_api_evaluations || previousEvaluationData);
    }
  }, [vehicle]);

  React.useEffect(() => {
    if (vehicle) {
      if (searchType === "rego" && vehicle.plate_no) {
        setSearchValue(vehicle.plate_no);
      } else if (searchType === "vin" && vehicle.vin) {
        setSearchValue(vehicle.vin);
      }
    }
  }, [searchType, vehicle]);

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
          condition: "Good",
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
      setPreviousEvaluations(prev => [results, ...prev.slice(0, 9)]);
      
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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">External API Pricing Lookup</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Search for vehicle pricing using external integrations. AutoGrab will first retrieve vehicle details then provide valuation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4 sm:space-y-6">
              {/* Integration Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Select Integration</Label>
                <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
                  <SelectTrigger className="w-full">
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
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm">{integration.display_name}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Search By</Label>
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
                  <Label className="text-sm">{searchType === "rego" ? "Registration Number" : "VIN"}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                      placeholder={searchType === "rego" ? "Enter rego" : "Enter VIN"}
                      className="flex-1 uppercase text-sm"
                    />
                    <Button 
                      onClick={handleSearch} 
                      disabled={isSearching || !selectedIntegration}
                      className="shrink-0"
                      size="sm"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                          <span className="hidden sm:inline">Searching</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Get Pricing</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="border rounded-lg bg-muted/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-4 border-b bg-background">
                    <h3 className="font-semibold text-sm sm:text-base">Latest Results - {searchResults.display_name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        Score: {(searchResults.prediction_details.score * 100).toFixed(1)}%
                      </Badge>
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Retrieved
                      </Badge>
                    </div>
                  </div>

                  <Accordion type="multiple" defaultValue={["vehicle", "valuations"]} className="w-full">
                    {/* Vehicle Details */}
                    <AccordionItem value="vehicle" className="border-b-0">
                      <AccordionTrigger className="px-3 sm:px-4 py-3 hover:no-underline hover:bg-muted/50 text-sm font-medium">
                        Vehicle Details
                      </AccordionTrigger>
                      <AccordionContent className="px-3 sm:px-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Make/Model:</span>
                            <span className="sm:ml-2 font-medium">
                              {searchResults.vehicle_details.make} {searchResults.vehicle_details.model}
                            </span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Year:</span>
                            <span className="sm:ml-2 font-medium">{searchResults.vehicle_details.year}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Variant:</span>
                            <span className="sm:ml-2 font-medium">{searchResults.vehicle_details.variant}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Vehicle ID:</span>
                            <span className="sm:ml-2 font-medium break-all">{searchResults.vehicle_details.vehicle_id}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Valuations */}
                    <AccordionItem value="valuations" className="border-b-0">
                      <AccordionTrigger className="px-3 sm:px-4 py-3 hover:no-underline hover:bg-muted/50 text-sm font-medium">
                        Valuations
                      </AccordionTrigger>
                      <AccordionContent className="px-3 sm:px-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="border rounded p-3 bg-background">
                            <div className="text-xs text-muted-foreground mb-1">Trade-In Range</div>
                            <div className="font-semibold text-xs sm:text-sm">
                              {formatCurrency(searchResults.valuations.trade_in_low)} - {formatCurrency(searchResults.valuations.trade_in_high)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Avg: {formatCurrency(searchResults.valuations.trade_in_average)}
                            </div>
                          </div>
                          <div className="border rounded p-3 bg-background">
                            <div className="text-xs text-muted-foreground mb-1">Retail Range</div>
                            <div className="font-semibold text-xs sm:text-sm">
                              {formatCurrency(searchResults.valuations.retail_low)} - {formatCurrency(searchResults.valuations.retail_high)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Avg: {formatCurrency(searchResults.valuations.retail_average)}
                            </div>
                          </div>
                          <div className="border rounded p-3 bg-background">
                            <div className="text-xs text-muted-foreground mb-1">Wholesale</div>
                            <div className="font-semibold text-xs sm:text-sm">
                              {formatCurrency(searchResults.valuations.wholesale)}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Prediction Details */}
                    <AccordionItem value="prediction" className="border-b-0">
                      <AccordionTrigger className="px-3 sm:px-4 py-3 hover:no-underline hover:bg-muted/50 text-sm font-medium">
                        Prediction Details
                      </AccordionTrigger>
                      <AccordionContent className="px-3 sm:px-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Odometer:</span>
                            <span className="sm:ml-2 font-medium">{searchResults.prediction_details.kms.toLocaleString()} km</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Condition:</span>
                            <span className="sm:ml-2 font-medium">{searchResults.condition_adjustments.condition}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Prediction ID:</span>
                            <span className="sm:ml-2 font-medium text-xs break-all">{searchResults.prediction_details.prediction_id}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Specifications */}
                    {Object.values(searchResults.specifications).some(value => value) && (
                      <AccordionItem value="specifications" className="border-b-0">
                        <AccordionTrigger className="px-3 sm:px-4 py-3 hover:no-underline hover:bg-muted/50 text-sm font-medium">
                          Specifications
                        </AccordionTrigger>
                        <AccordionContent className="px-3 sm:px-4 pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                            {Object.entries(searchResults.specifications)
                              .filter(([_, value]) => value)
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between sm:block">
                                  <span className="text-muted-foreground">{formatApiNames(key)}:</span>
                                  <span className="sm:ml-2 font-medium">{value as string}</span>
                                </div>
                              ))
                            }
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              )}

              {/* Previous Evaluations */}
              {previousEvaluations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm sm:text-base">Previous Evaluations</h3>
                  <div className="space-y-2">
                    {previousEvaluations.map((evaluation, index) => (
                      <div 
                        key={index} 
                        className="border rounded-lg p-3 bg-background hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSearchResults(evaluation)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                              <span className="text-xs sm:text-sm font-medium truncate">
                                {new Date(evaluation.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {evaluation.display_name || formatApiNames(evaluation.integration_type)} • {evaluation.search_type.toUpperCase()}: {evaluation.search_value}
                            </div>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <div className="text-sm font-semibold">
                              {formatCurrency(evaluation.valuations.retail_average)}
                            </div>
                            <div className="text-xs text-muted-foreground">Retail Avg</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Footer */}
        <div className="border-t bg-background px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          {searchResults && (
            <Button 
              onClick={() => handleApplyPricing(searchResults)} 
              className="w-full sm:w-auto"
            >
              Save Pricing Snapshot
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalApiPricingDialog;