
import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { vehicleServices, companyServices, adPublishingServices } from "@/api/services";
import ReactSelect from "react-select";
import FieldWithHistory from "@/components/common/FieldWithHistory";

interface VehicleSpecificationsSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleSpecificationsSection: React.FC<VehicleSpecificationsSectionProps> = ({ vehicle, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const specs = vehicle.vehicle_specifications?.[0] || {};

  const [formData, setFormData] = useState({
    number_of_seats: specs.number_of_seats || "",
    number_of_doors: specs.number_of_doors || "",
    interior_color: specs.interior_color || "",
    exterior_primary_color: specs.exterior_primary_color || "",
    exterior_secondary_color: specs.exterior_secondary_color || "",
    steering_type: specs.steering_type || "",
    wheels_composition: specs.wheels_composition || "",
    sunroof: specs.sunroof || "",
    interior_trim: specs.interior_trim || "",
    seat_material: specs.seat_material || "",
    tyre_size: specs.tyre_size || "",
    safety_features: specs.safety_features || [],
    interior_features: specs.interior_features || [],
    other_feature: specs.other_feature || [],
  });


  // Fetch dropdown values for the 10 specified fields
  const { data: dropdownData, isLoading: isLoadingDropdowns, error: dropdownError } = useQuery({
    queryKey: ["specifications-dropdown-values"],
    queryFn: async () => {
      try {
        const response = await companyServices.getMasterdropdownvalues({
          dropdown_name: [
            "seat_material",
            "color_palettes",
            "interior_trim",
            "safety_features",
            "interior_features",
            "sunroof",
            "wheels_composition",
            "other_feature"
          ],
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching specifications dropdown data:", error);
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

  // Convert to react-select format for multi-select fields - using display_value as value
  const safetyFeaturesOptions = useMemo(() => {
    return getDropdownOptions("safety_features")
      .filter((item: any) => item.is_active !== false && (item.display_value || item.option_value) && (item.display_value?.trim() !== "" || item.option_value?.trim() !== ""))
      .map((option: any) => ({
        value: option.display_value || option.option_value,
        label: option.display_value || option.option_value,
      }));
  }, [dropdownData, isLoadingDropdowns, dropdownError]);

  const interiorFeaturesOptions = useMemo(() => {
    return getDropdownOptions("interior_features")
      .filter((item: any) => item.is_active !== false && (item.display_value || item.option_value) && (item.display_value?.trim() !== "" || item.option_value?.trim() !== ""))
      .map((option: any) => ({
        value: option.display_value || option.option_value,
        label: option.display_value || option.option_value,
      }));
  }, [dropdownData, isLoadingDropdowns, dropdownError]);

  const otherFeatureOptions = useMemo(() => {
    return getDropdownOptions("other_feature")
      .filter((item: any) => item.is_active !== false && (item.display_value || item.option_value) && (item.display_value?.trim() !== "" || item.option_value?.trim() !== ""))
      .map((option: any) => ({
        value: option.display_value || option.option_value,
        label: option.display_value || option.option_value,
      }));
  }, [dropdownData, isLoadingDropdowns, dropdownError]);

  // Get selected values for multi-select fields - matching by display_value
  const selectedSafetyFeatures = useMemo(() => {
    return safetyFeaturesOptions.filter((option: any) =>
      formData.safety_features.includes(option.value)
    );
  }, [formData.safety_features, safetyFeaturesOptions]);

  const selectedInteriorFeatures = useMemo(() => {
    return interiorFeaturesOptions.filter((option: any) =>
      formData.interior_features.includes(option.value)
    );
  }, [formData.interior_features, interiorFeaturesOptions]);

  const selectedOtherFeatures = useMemo(() => {
    return otherFeatureOptions.filter((option: any) =>
      formData.other_feature.includes(option.value)
    );
  }, [formData.other_feature, otherFeatureOptions]);

  const handleSave = async () => {
    try {
      await adPublishingServices.updateAdVehicle(vehicle._id, {
        module_section: "Vehicle Specifications",
        vehicle_specifications: [{
          number_of_seats: formData.number_of_seats,
          number_of_doors: formData.number_of_doors,
          interior_color: formData.interior_color,
          exterior_primary_color: formData.exterior_primary_color,
          exterior_secondary_color: formData.exterior_secondary_color,
          steering_type: formData.steering_type,
          wheels_composition: formData.wheels_composition,
          sunroof: formData.sunroof,
          interior_trim: formData.interior_trim,
          seat_material: formData.seat_material,
          tyre_size: formData.tyre_size,
          safety_features: formData.safety_features,
          interior_features: formData.interior_features,
          other_feature: formData.other_feature,
        }]
      });

      toast.success("Specifications updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update specifications");
    }
  };

  const handleCancel = () => {
    setFormData({
      number_of_seats: specs.number_of_seats || "",
      number_of_doors: specs.number_of_doors || "",
      interior_color: specs.interior_color || "",
      exterior_primary_color: specs.exterior_primary_color || "",
      exterior_secondary_color: specs.exterior_secondary_color || "",
      steering_type: specs.steering_type || "",
      wheels_composition: specs.wheels_composition || "",
      sunroof: specs.sunroof || "",
      interior_trim: specs.interior_trim || "",
      seat_material: specs.seat_material || "",
      tyre_size: specs.tyre_size || "",
      safety_features: specs.safety_features || [],
      interior_features: specs.interior_features || [],
      other_feature: specs.other_feature || [],
    });
    setIsEditing(false);
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="specifications">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Specifications</span>
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
                <div className="space-y-6">
                  {/* Interior Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                      <h3 className="text-base font-semibold text-foreground">Interior</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FieldWithHistory
                        fieldName="number_of_seats"
                        fieldDisplayName="Seats"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Seats"
                        showHistoryIcon={!isEditing}
                      >
                        <Input
                          id="number_of_seats"
                          type="number"
                          value={formData.number_of_seats}
                          onChange={(e) => setFormData({ ...formData, number_of_seats: e.target.value })}
                        />
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="seat_material"
                        fieldDisplayName="Seat Material"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Seat Material"
                        showHistoryIcon={!isEditing}
                      >
                        <Select
                          value={formData.seat_material}
                          onValueChange={(value) => {
                            if (value && value !== "__no_seat_material__") {
                              setFormData({ ...formData, seat_material: value });
                            }
                          }}
                          disabled={isLoadingDropdowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select seat material"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropdownOptions("seat_material").length > 0 ? (
                              getDropdownOptions("seat_material").map((option: any) => (
                                <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                  {option.display_value || option.option_value}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_seat_material__" disabled>
                                {isLoadingDropdowns ? "Loading options..." : "No options available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="interior_color"
                        fieldDisplayName="Interior Color"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Interior Color"
                        showHistoryIcon={!isEditing}
                      >
                        <Select
                          value={formData.interior_color}
                          onValueChange={(value) => {
                            if (value && value !== "__no_interior_color__") {
                              setFormData({ ...formData, interior_color: value });
                            }
                          }}
                          disabled={isLoadingDropdowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select interior color"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropdownOptions("color_palettes").length > 0 ? (
                              getDropdownOptions("color_palettes").map((option: any) => (
                                <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                  {option.display_value || option.option_value}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_interior_color__" disabled>
                                {isLoadingDropdowns ? "Loading options..." : "No options available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="steering_type"
                        fieldDisplayName="Steering Type"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Steering Type"
                        showHistoryIcon={!isEditing}
                      >
                        <Input
                          id="steering_type"
                          value={formData.steering_type}
                          onChange={(e) => setFormData({ ...formData, steering_type: e.target.value })}
                        />
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="interior_trim"
                        fieldDisplayName="Interior Trim"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Interior Trim"
                        showHistoryIcon={!isEditing}
                      >
                        <Select
                          value={formData.interior_trim}
                          onValueChange={(value) => {
                            if (value && value !== "__no_interior_trim__") {
                              setFormData({ ...formData, interior_trim: value });
                            }
                          }}
                          disabled={isLoadingDropdowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select interior trim"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropdownOptions("interior_trim").length > 0 ? (
                              getDropdownOptions("interior_trim").map((option: any) => (
                                <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                  {option.display_value || option.option_value}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_interior_trim__" disabled>
                                {isLoadingDropdowns ? "Loading options..." : "No options available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FieldWithHistory>
                    </div>

                    <FieldWithHistory
                      fieldName="safety_features"
                      fieldDisplayName="Safety Features"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="advertisement"
                      moduleName="Vehicle Specifications"
                      label="Safety Features"
                      showHistoryIcon={!isEditing}
                    >
                      <ReactSelect
                        isMulti
                        options={safetyFeaturesOptions}
                        value={selectedSafetyFeatures}
                        onChange={(selectedOptions: any) => {
                          const selectedValues = selectedOptions
                            ? selectedOptions.map((option: any) => option.value)
                            : [];
                          setFormData({
                            ...formData,
                            safety_features: selectedValues,
                          });
                        }}
                        placeholder={isLoadingDropdowns ? "Loading..." : "Select safety features"}
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

                    <FieldWithHistory
                      fieldName="interior_features"
                      fieldDisplayName="Interior Features"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="advertisement"
                      moduleName="Vehicle Specifications"
                      label="Interior Features"
                      showHistoryIcon={!isEditing}
                    >
                      <ReactSelect
                        isMulti
                        options={interiorFeaturesOptions}
                        value={selectedInteriorFeatures}
                        onChange={(selectedOptions: any) => {
                          const selectedValues = selectedOptions
                            ? selectedOptions.map((option: any) => option.value)
                            : [];
                          setFormData({
                            ...formData,
                            interior_features: selectedValues,
                          });
                        }}
                        placeholder={isLoadingDropdowns ? "Loading..." : "Select interior features"}
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
                  </div>

                  {/* Exterior Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                      <h3 className="text-base font-semibold text-foreground">Exterior</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FieldWithHistory
                        fieldName="number_of_doors"
                        fieldDisplayName="Doors"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Doors"
                        showHistoryIcon={!isEditing}
                      >
                        <Input
                          id="number_of_doors"
                          type="number"
                          value={formData.number_of_doors}
                          onChange={(e) => setFormData({ ...formData, number_of_doors: e.target.value })}
                        />
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="tyre_size"
                        fieldDisplayName="Tyre Size"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Tyre Size"
                        showHistoryIcon={!isEditing}
                      >
                        <Input
                          id="tyre_size"
                          value={formData.tyre_size}
                          onChange={(e) => setFormData({ ...formData, tyre_size: e.target.value })}
                        />
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="exterior_primary_color"
                        fieldDisplayName="Exterior Primary Color"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Exterior Primary Color"
                        showHistoryIcon={!isEditing}
                      >
                        <Select
                          value={formData.exterior_primary_color}
                          onValueChange={(value) => {
                            if (value && value !== "__no_exterior_primary_color__") {
                              setFormData({ ...formData, exterior_primary_color: value });
                            }
                          }}
                          disabled={isLoadingDropdowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select exterior primary color"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropdownOptions("color_palettes").length > 0 ? (
                              getDropdownOptions("color_palettes").map((option: any) => (
                                <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                  {option.display_value || option.option_value}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_exterior_primary_color__" disabled>
                                {isLoadingDropdowns ? "Loading options..." : "No options available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="exterior_secondary_color"
                        fieldDisplayName="Exterior Secondary Color"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Exterior Secondary Color"
                        showHistoryIcon={!isEditing}
                      >
                        <Select
                          value={formData.exterior_secondary_color}
                          onValueChange={(value) => {
                            if (value && value !== "__no_exterior_secondary_color__") {
                              setFormData({ ...formData, exterior_secondary_color: value });
                            }
                          }}
                          disabled={isLoadingDropdowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select exterior secondary color"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropdownOptions("color_palettes").length > 0 ? (
                              getDropdownOptions("color_palettes").map((option: any) => (
                                <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                  {option.display_value || option.option_value}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_exterior_secondary_color__" disabled>
                                {isLoadingDropdowns ? "Loading options..." : "No options available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="wheels_composition"
                        fieldDisplayName="Wheels Composition"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Wheels Composition"
                        showHistoryIcon={!isEditing}
                      >
                        <Select
                          value={formData.wheels_composition}
                          onValueChange={(value) => {
                            if (value && value !== "__no_wheels_composition__") {
                              setFormData({ ...formData, wheels_composition: value });
                            }
                          }}
                          disabled={isLoadingDropdowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select wheels composition"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropdownOptions("wheels_composition").length > 0 ? (
                              getDropdownOptions("wheels_composition").map((option: any) => (
                                <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                  {option.display_value || option.option_value}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_wheels_composition__" disabled>
                                {isLoadingDropdowns ? "Loading options..." : "No options available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="sunroof"
                        fieldDisplayName="Sunroof"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Sunroof"
                        showHistoryIcon={!isEditing}
                      >
                        <Select
                          value={formData.sunroof}
                          onValueChange={(value) => {
                            if (value && value !== "__no_sunroof__") {
                              setFormData({ ...formData, sunroof: value });
                            }
                          }}
                          disabled={isLoadingDropdowns}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Select sunroof option"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropdownOptions("sunroof").length > 0 ? (
                              getDropdownOptions("sunroof").map((option: any) => (
                                <SelectItem key={option._id || option.option_value} value={option.display_value || option.option_value}>
                                  {option.display_value || option.option_value}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </FieldWithHistory>
                    </div>

                    <FieldWithHistory
                      fieldName="other_feature"
                      fieldDisplayName="Other Feature"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="advertisement"
                      moduleName="Vehicle Specifications"
                      label="Other Feature"
                      showHistoryIcon={!isEditing}
                    >
                      <ReactSelect
                        isMulti
                        options={otherFeatureOptions}
                        value={selectedOtherFeatures}
                        onChange={(selectedOptions: any) => {
                          const selectedValues = selectedOptions
                            ? selectedOptions.map((option: any) => option.value)
                            : [];
                          setFormData({
                            ...formData,
                            other_feature: selectedValues,
                          });
                        }}
                        placeholder={isLoadingDropdowns ? "Loading..." : "Select other features"}
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
                  </div>

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
                <div className="space-y-6">
                  {/* Interior Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                      <h3 className="text-base font-semibold text-foreground">Interior</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FieldWithHistory
                        fieldName="number_of_seats"
                        fieldDisplayName="Seats"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Seats"
                      >
                        <p className="text-sm text-muted-foreground">{formData.number_of_seats || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="seat_material"
                        fieldDisplayName="Seat Material"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Seat Material"
                      >
                        <p className="text-sm text-muted-foreground">{formData.seat_material || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="interior_color"
                        fieldDisplayName="Interior Color"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Interior Color"
                      >
                        <p className="text-sm text-muted-foreground">{formData.interior_color || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="steering_type"
                        fieldDisplayName="Steering Type"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Steering Type"
                      >
                        <p className="text-sm text-muted-foreground">{formData.steering_type || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="interior_trim"
                        fieldDisplayName="Interior Trim"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Interior Trim"
                      >
                        <p className="text-sm text-muted-foreground">{formData.interior_trim || "N/A"}</p>
                      </FieldWithHistory>
                    </div>
                    <FieldWithHistory
                      fieldName="safety_features"
                      fieldDisplayName="Safety Features"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="advertisement"
                      moduleName="Vehicle Specifications"
                      label="Safety Features"
                    >
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.safety_features.length > 0 ? (
                          formData.safety_features.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No safety features listed</p>
                        )}
                      </div>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="interior_features"
                      fieldDisplayName="Interior Features"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="advertisement"
                      moduleName="Vehicle Specifications"
                      label="Interior Features"
                    >
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.interior_features.length > 0 ? (
                          formData.interior_features.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No Interior Features listed</p>
                        )}
                      </div>
                    </FieldWithHistory>
                  </div>

                  {/* Exterior Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                      <h3 className="text-base font-semibold text-foreground">Exterior</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FieldWithHistory
                        fieldName="number_of_doors"
                        fieldDisplayName="Doors"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Doors"
                      >
                        <p className="text-sm text-muted-foreground">{formData.number_of_doors || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="tyre_size"
                        fieldDisplayName="Tyre Size"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Tyre Size"
                      >
                        <p className="text-sm text-muted-foreground">{formData.tyre_size || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="exterior_primary_color"
                        fieldDisplayName="Exterior Primary Color"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Exterior Primary Color"
                      >
                        <p className="text-sm text-muted-foreground">{formData.exterior_primary_color || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="exterior_secondary_color"
                        fieldDisplayName="Exterior Secondary Color"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Exterior Secondary Color"
                      >
                        <p className="text-sm text-muted-foreground">{formData.exterior_secondary_color || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="wheels_composition"
                        fieldDisplayName="Wheels Composition"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Wheels Composition"
                      >
                        <p className="text-sm text-muted-foreground">{formData.wheels_composition || "N/A"}</p>
                      </FieldWithHistory>
                      <FieldWithHistory
                        fieldName="sunroof"
                        fieldDisplayName="Sunroof"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType="advertisement"
                        moduleName="Vehicle Specifications"
                        label="Sunroof"
                      >
                        <p className="text-sm text-muted-foreground">{formData.sunroof || "N/A"}</p>
                      </FieldWithHistory>
                    </div>
                    <FieldWithHistory
                      fieldName="other_feature"
                      fieldDisplayName="Other Feature"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="advertisement"
                      moduleName="Vehicle Specifications"
                      label="Other Feature"
                    >
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.other_feature.length > 0 ? (
                          formData.other_feature.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No Other Features listed</p>
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

export default VehicleSpecificationsSection;
