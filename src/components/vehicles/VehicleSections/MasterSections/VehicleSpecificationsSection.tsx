
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
import { masterVehicleServices, companyServices } from "@/api/services";
import ReactSelect from "react-select";

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
      await masterVehicleServices.updateMasterVehicle(vehicle._id, {
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
                      <div>
                        <Label htmlFor="number_of_seats">Seats</Label>
                        <Input
                          id="number_of_seats"
                          type="number"
                          value={formData.number_of_seats}
                          onChange={(e) => setFormData({ ...formData, number_of_seats: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="seat_material">Seat Material</Label>
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
                      </div>
                      <div>
                        <Label htmlFor="interior_color">Interior Color</Label>
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
                      </div>
                      <div>
                        <Label htmlFor="steering_type">Steering Type</Label>
                        <Input
                          id="steering_type"
                          value={formData.steering_type}
                          onChange={(e) => setFormData({ ...formData, steering_type: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="interior_trim">Interior Trim</Label>
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
                      </div>
                    </div>
                    
                    <div>
                      <Label>Safety Features</Label>
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
                    </div>

                    <div>
                      <Label>Interior Features</Label>
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
                    </div>
                  </div>

                  {/* Exterior Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                      <h3 className="text-base font-semibold text-foreground">Exterior</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="number_of_doors">Doors</Label>
                        <Input
                          id="number_of_doors"
                          type="number"
                          value={formData.number_of_doors}
                          onChange={(e) => setFormData({ ...formData, number_of_doors: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tyre_size">Tyre Size</Label>
                        <Input
                          id="tyre_size"
                          value={formData.tyre_size}
                          onChange={(e) => setFormData({ ...formData, tyre_size: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="exterior_primary_color">Exterior Primary Color</Label>
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
                      </div>
                      <div>
                        <Label htmlFor="exterior_secondary_color">Exterior Secondary Color</Label>
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
                      </div>
                      <div>
                        <Label htmlFor="wheels_composition">Wheels Composition</Label>
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
                      </div>
                      <div>
                        <Label htmlFor="sunroof">Sunroof</Label>
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
                      </div>
                    </div>

                    <div>
                      <Label>Other Feature</Label>
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
                    </div>
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
                      <div>
                        <Label className="text-sm font-medium">Seats</Label>
                        <p className="text-sm text-muted-foreground">{formData.number_of_seats || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Seat Material</Label>
                        <p className="text-sm text-muted-foreground">{formData.seat_material || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Interior Color</Label>
                        <p className="text-sm text-muted-foreground">{formData.interior_color || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Steering Type</Label>
                        <p className="text-sm text-muted-foreground">{formData.steering_type || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Interior Trim</Label>
                        <p className="text-sm text-muted-foreground">{formData.interior_trim || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Safety Features</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.safety_features.length > 0 ? (
                          formData.safety_features.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No safety features listed</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Interior Features</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.interior_features.length > 0 ? (
                          formData.interior_features.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No Interior Features listed</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Exterior Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                      <h3 className="text-base font-semibold text-foreground">Exterior</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Doors</Label>
                        <p className="text-sm text-muted-foreground">{formData.number_of_doors || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Tyre Size</Label>
                        <p className="text-sm text-muted-foreground">{formData.tyre_size || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Exterior Primary Color</Label>
                        <p className="text-sm text-muted-foreground">{formData.exterior_primary_color || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Exterior Secondary Color</Label>
                        <p className="text-sm text-muted-foreground">{formData.exterior_secondary_color || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Wheels Composition</Label>
                        <p className="text-sm text-muted-foreground">{formData.wheels_composition || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Sunroof</Label>
                        <p className="text-sm text-muted-foreground">{formData.sunroof || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Other Feature</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.other_feature.length > 0 ? (
                          formData.other_feature.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No Interior Features listed</p>
                        )}
                      </div>
                    </div>
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
