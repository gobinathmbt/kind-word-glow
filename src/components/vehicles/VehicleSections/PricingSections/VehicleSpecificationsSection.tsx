
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices } from "@/api/services";

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
    sunroof: specs.sunroof || false,
    interior_trim: specs.interior_trim || "",
    seat_material: specs.seat_material || "",
    tyre_size: specs.tyre_size || "",
    interior_features: specs.interior_features || [],
    exterior_features: specs.exterior_features || [],
  });

  const [newInteriorFeature, setNewInteriorFeature] = useState("");
  const [newExteriorFeature, setNewExteriorFeature] = useState("");

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleSpecifications(vehicle._id,vehicle.vehicle_type, {
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
          interior_features: formData.interior_features,
          exterior_features: formData.exterior_features,
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
      sunroof: specs.sunroof || false,
      interior_trim: specs.interior_trim || "",
      seat_material: specs.seat_material || "",
      tyre_size: specs.tyre_size || "",
      interior_features: specs.interior_features || [],
      exterior_features: specs.exterior_features || [],
    });
    setIsEditing(false);
    setNewInteriorFeature("");
    setNewExteriorFeature("");
  };

  const addInteriorFeature = () => {
    if (newInteriorFeature.trim()) {
      setFormData({
        ...formData,
        interior_features: [...formData.interior_features, newInteriorFeature.trim()]
      });
      setNewInteriorFeature("");
    }
  };

  const addExteriorFeature = () => {
    if (newExteriorFeature.trim()) {
      setFormData({
        ...formData,
        exterior_features: [...formData.exterior_features, newExteriorFeature.trim()]
      });
      setNewExteriorFeature("");
    }
  };

  const removeInteriorFeature = (index: number) => {
    setFormData({
      ...formData,
      interior_features: formData.interior_features.filter((_, i) => i !== index)
    });
  };

  const removeExteriorFeature = (index: number) => {
    setFormData({
      ...formData,
      exterior_features: formData.exterior_features.filter((_, i) => i !== index)
    });
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
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="number_of_seats">Number of Seats</Label>
                      <Input
                        id="number_of_seats"
                        type="number"
                        value={formData.number_of_seats}
                        onChange={(e) => setFormData({ ...formData, number_of_seats: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="number_of_doors">Number of Doors</Label>
                      <Input
                        id="number_of_doors"
                        type="number"
                        value={formData.number_of_doors}
                        onChange={(e) => setFormData({ ...formData, number_of_doors: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="interior_color">Interior Color</Label>
                      <Input
                        id="interior_color"
                        value={formData.interior_color}
                        onChange={(e) => setFormData({ ...formData, interior_color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="exterior_primary_color">Exterior Primary Color</Label>
                      <Input
                        id="exterior_primary_color"
                        value={formData.exterior_primary_color}
                        onChange={(e) => setFormData({ ...formData, exterior_primary_color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="exterior_secondary_color">Exterior Secondary Color</Label>
                      <Input
                        id="exterior_secondary_color"
                        value={formData.exterior_secondary_color}
                        onChange={(e) => setFormData({ ...formData, exterior_secondary_color: e.target.value })}
                      />
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
                      <Label htmlFor="wheels_composition">Wheels Composition</Label>
                      <Input
                        id="wheels_composition"
                        value={formData.wheels_composition}
                        onChange={(e) => setFormData({ ...formData, wheels_composition: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="interior_trim">Interior Trim</Label>
                      <Input
                        id="interior_trim"
                        value={formData.interior_trim}
                        onChange={(e) => setFormData({ ...formData, interior_trim: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="seat_material">Seat Material</Label>
                      <Input
                        id="seat_material"
                        value={formData.seat_material}
                        onChange={(e) => setFormData({ ...formData, seat_material: e.target.value })}
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
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.sunroof}
                        onCheckedChange={(checked) => setFormData({ ...formData, sunroof: checked })}
                      />
                      <Label>Sunroof</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Interior Features</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add interior feature"
                        value={newInteriorFeature}
                        onChange={(e) => setNewInteriorFeature(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addInteriorFeature()}
                      />
                      <Button type="button" onClick={addInteriorFeature}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.interior_features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                          <span className="text-sm">{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInteriorFeature(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Exterior Features</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add exterior feature"
                        value={newExteriorFeature}
                        onChange={(e) => setNewExteriorFeature(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addExteriorFeature()}
                      />
                      <Button type="button" onClick={addExteriorFeature}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.exterior_features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                          <span className="text-sm">{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExteriorFeature(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Seats</Label>
                    <p className="text-sm text-muted-foreground">{formData.number_of_seats || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Doors</Label>
                    <p className="text-sm text-muted-foreground">{formData.number_of_doors || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Interior Color</Label>
                    <p className="text-sm text-muted-foreground">{formData.interior_color || "N/A"}</p>
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
                    <Label className="text-sm font-medium">Steering Type</Label>
                    <p className="text-sm text-muted-foreground">{formData.steering_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Wheels Composition</Label>
                    <p className="text-sm text-muted-foreground">{formData.wheels_composition || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Interior Trim</Label>
                    <p className="text-sm text-muted-foreground">{formData.interior_trim || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Seat Material</Label>
                    <p className="text-sm text-muted-foreground">{formData.seat_material || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tyre Size</Label>
                    <p className="text-sm text-muted-foreground">{formData.tyre_size || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sunroof</Label>
                    <p className="text-sm text-muted-foreground">{formData.sunroof ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-sm font-medium">Interior Features</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.interior_features.length > 0 ? (
                        formData.interior_features.map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No interior features listed</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-sm font-medium">Exterior Features</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.exterior_features.length > 0 ? (
                        formData.exterior_features.map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No exterior features listed</p>
                      )}
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
