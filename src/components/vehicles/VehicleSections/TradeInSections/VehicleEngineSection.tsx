
import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { vehicleServices, companyServices } from "@/api/services";
import ReactSelect from "react-select";
import FieldWithHistory from "@/components/common/FieldWithHistory";

interface VehicleEngineSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleEngineSection: React.FC<VehicleEngineSectionProps> = ({ vehicle, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const engineData = vehicle.vehicle_eng_transmission?.[0] || {};

  const [formData, setFormData] = useState({
    engine_no: engineData.engine_no || "",
    engine_type: engineData.engine_type || "",
    transmission_type: engineData.transmission_type || "",
    primary_fuel_type: engineData.primary_fuel_type || "",
    no_of_cylinders: engineData.no_of_cylinders || "",
    turbo: engineData.turbo || "",
    engine_size: engineData.engine_size || "",
    engine_size_unit: engineData.engine_size_unit || "",
    engine_features: engineData.engine_features || [],
  });



  // Fetch dropdown values for the four fields
  const { data: dropdownData, isLoading: isLoadingDropdowns, error: dropdownError } = useQuery({
    queryKey: ["engine-dropdown-values"],
    queryFn: async () => {
      try {
        const response = await companyServices.getMasterdropdownvalues({
          dropdown_name: ["engine_type", "transmission_type", "primary_fuel_type", "engine_features"],
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        throw error;
      }
    },
  });

  // Extract dropdown options
  const getDropdownOptions = (dropdownName: string) => {
    if (isLoadingDropdowns) {
      return [];
    }

    if (dropdownError) {
      console.error(`Error loading dropdown ${dropdownName}:`, dropdownError);
      return [];
    }

    if (!dropdownData?.success) {
      return [];
    }

    const dropdown = dropdownData.data.find((item: any) => item.dropdown_name === dropdownName);
    const options = dropdown?.values || [];

    // Ensure each option has the required fields
    return options.map((option: any) => ({
      ...option,
      _id: option._id || option.option_value,
      option_value: option.option_value,
      display_value: option.display_value || option.option_value
    }));
  };

  // Convert to react-select format for Engine Features - using display_value as value
  const engineFeaturesOptions = useMemo(() => {
    return getDropdownOptions("engine_features")
      .filter((item: any) => item.is_active !== false && (item.display_value || item.option_value) && (item.display_value?.trim() !== "" || item.option_value?.trim() !== ""))
      .map((option: any) => ({
        value: option.display_value || option.option_value,
        label: option.display_value || option.option_value,
      }));
  }, [dropdownData, isLoadingDropdowns, dropdownError]);

  // Get selected values for Engine Features
  const selectedEngineFeatures = useMemo(() => {
    return engineFeaturesOptions.filter((option: any) =>
      formData.engine_features.includes(option.value)
    );
  }, [formData.engine_features, engineFeaturesOptions]);

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleEngine(vehicle._id, vehicle.vehicle_type, {
        module_section: "Engine & Transmission",
        vehicle_eng_transmission: [{
          engine_no: formData.engine_no,
          engine_type: formData.engine_type,
          transmission_type: formData.transmission_type,
          primary_fuel_type: formData.primary_fuel_type,
          no_of_cylinders: formData.no_of_cylinders,
          turbo: formData.turbo,
          engine_size: formData.engine_size,
          engine_size_unit: formData.engine_size_unit,
          engine_features: formData.engine_features,
        }]
      });

      toast.success("Engine information updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update engine information");
    }
  };

  const handleCancel = () => {
    setFormData({
      engine_no: engineData.engine_no || "",
      engine_type: engineData.engine_type || "",
      transmission_type: engineData.transmission_type || "",
      primary_fuel_type: engineData.primary_fuel_type || "",
      no_of_cylinders: engineData.no_of_cylinders || "",
      turbo: engineData.turbo || "",
      engine_size: engineData.engine_size || "",
      engine_size_unit: engineData.engine_size_unit || "",
      engine_features: engineData.engine_features || [],
    });
    setIsEditing(false);
  };




  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="engine">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Engine & Transmission</span>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Card>
            <CardContent className="pt-6">
              {isEditing ? (
                <div className="space-y-4">
                  {/* Debug info - remove after testing */}
                  {(isLoadingDropdowns || dropdownError || !dropdownData?.success) && (
                    <div className="p-3 border rounded-md bg-blue-50">
                      <p className="text-sm">
                        <strong>Debug Info:</strong>
                        {isLoadingDropdowns && " Loading dropdowns..."}
                        {dropdownError && ` Error: ${dropdownError.message}`}
                        {!dropdownData?.success && dropdownData && " API returned unsuccessful response"}
                        {!dropdownData && " No dropdown data"}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <FieldWithHistory
                      fieldName="engine_no"
                      fieldDisplayName="Engine No"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Engine No"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="engine_no"
                        value={formData.engine_no}
                        onChange={(e) => setFormData({ ...formData, engine_no: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="engine_type"
                      fieldDisplayName="Engine Type"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Engine Type"
                      showHistoryIcon={!isEditing}
                    >
                      <Select
                        value={formData.engine_type}
                        onValueChange={(value) => {
                          if (value && value !== "__no_engine_type__") {
                            setFormData({ ...formData, engine_type: value });
                          }
                        }}
                        disabled={isLoadingDropdowns}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select engine type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {getDropdownOptions("engine_type").length > 0 ? (
                            getDropdownOptions("engine_type").map((option: any) => (
                              <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                {option.display_value || option.option_value}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__no_engine_type__" disabled>
                              {isLoadingDropdowns ? "Loading options..." : "No options available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="transmission_type"
                      fieldDisplayName="Transmission Type"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Transmission Type"
                      showHistoryIcon={!isEditing}
                    >
                      <Select
                        value={formData.transmission_type}
                        onValueChange={(value) => {
                          if (value && value !== "__no_transmission_type__") {
                            setFormData({ ...formData, transmission_type: value });
                          }
                        }}
                        disabled={isLoadingDropdowns}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select transmission type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {getDropdownOptions("transmission_type").length > 0 ? (
                            getDropdownOptions("transmission_type").map((option: any) => (
                              <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                {option.display_value || option.option_value}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__no_transmission_type__" disabled>
                              {isLoadingDropdowns ? "Loading options..." : "No options available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="primary_fuel_type"
                      fieldDisplayName="Primary Fuel Type"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Primary Fuel Type"
                      showHistoryIcon={!isEditing}
                    >
                      <Select
                        value={formData.primary_fuel_type}
                        onValueChange={(value) => {
                          if (value && value !== "__no_fuel_type__") {
                            setFormData({ ...formData, primary_fuel_type: value });
                          }
                        }}
                        disabled={isLoadingDropdowns}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select fuel type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {getDropdownOptions("primary_fuel_type").length > 0 ? (
                            getDropdownOptions("primary_fuel_type").map((option: any) => (
                              <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                {option.display_value || option.option_value}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__no_fuel_type__" disabled>
                              {isLoadingDropdowns ? "Loading options..." : "No options available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="no_of_cylinders"
                      fieldDisplayName="Number of Cylinders"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Number of Cylinders"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="no_of_cylinders"
                        type="number"
                        value={formData.no_of_cylinders}
                        onChange={(e) => setFormData({ ...formData, no_of_cylinders: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="turbo"
                      fieldDisplayName="Turbo"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Turbo"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="turbo"
                        value={formData.turbo}
                        onChange={(e) => setFormData({ ...formData, turbo: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="engine_size"
                      fieldDisplayName="Engine Size"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Engine Size"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="engine_size"
                        type="number"
                        value={formData.engine_size}
                        onChange={(e) => setFormData({ ...formData, engine_size: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="engine_size_unit"
                      fieldDisplayName="Engine Size Unit"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Engine Size Unit"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="engine_size_unit"
                        value={formData.engine_size_unit}
                        onChange={(e) => setFormData({ ...formData, engine_size_unit: e.target.value })}
                      />
                    </FieldWithHistory>
                  </div>

                  <FieldWithHistory
                    fieldName="engine_features"
                    fieldDisplayName="Engine Features"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Engine Features"
                    showHistoryIcon={!isEditing}
                  >
                    <ReactSelect
                      isMulti
                      options={engineFeaturesOptions}
                      value={selectedEngineFeatures}
                      onChange={(selectedOptions: any) => {
                        const selectedValues = selectedOptions
                          ? selectedOptions.map((option: any) => option.value)
                          : [];
                        setFormData({
                          ...formData,
                          engine_features: selectedValues,
                        });
                      }}
                      placeholder={isLoadingDropdowns ? "Loading..." : "Select engine features"}
                      isDisabled={isLoadingDropdowns}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "40px",
                        }),
                      }}
                    />
                  </FieldWithHistory>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <FieldWithHistory
                    fieldName="engine_no"
                    fieldDisplayName="Engine No"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Engine No"
                  >
                    <p className="text-sm text-muted-foreground">{formData.engine_no || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="engine_type"
                    fieldDisplayName="Engine Type"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Engine Type"
                  >
                    <p className="text-sm text-muted-foreground">{formData.engine_type || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="transmission_type"
                    fieldDisplayName="Transmission Type"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Transmission Type"
                  >
                    <p className="text-sm text-muted-foreground">{formData.transmission_type || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="primary_fuel_type"
                    fieldDisplayName="Primary Fuel Type"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Primary Fuel Type"
                  >
                    <p className="text-sm text-muted-foreground">{formData.primary_fuel_type || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="no_of_cylinders"
                    fieldDisplayName="Number of Cylinders"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Number of Cylinders"
                  >
                    <p className="text-sm text-muted-foreground">{formData.no_of_cylinders || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="turbo"
                    fieldDisplayName="Turbo"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Turbo"
                  >
                    <p className="text-sm text-muted-foreground">{formData.turbo || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="engine_size"
                    fieldDisplayName="Engine Size"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "tradein"}
                    moduleName="Engine & Transmission"
                    label="Engine Size"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.engine_size ? `${formData.engine_size} ${formData.engine_size_unit}` : "N/A"}
                    </p>
                  </FieldWithHistory>
                  <div className="col-span-3">
                    <FieldWithHistory
                      fieldName="engine_features"
                      fieldDisplayName="Engine Features"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "tradein"}
                      moduleName="Engine & Transmission"
                      label="Engine Features"
                    >
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.engine_features.length > 0 ? (
                          formData.engine_features.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No features listed</p>
                        )}
                      </div>
                    </FieldWithHistory>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default VehicleEngineSection;
