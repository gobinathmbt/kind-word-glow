
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices } from "@/api/services";

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

  const [newFeature, setNewFeature] = useState("");

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleEngine(vehicle._id,vehicle.vehicle_type, {
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
    setNewFeature("");
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        engine_features: [...formData.engine_features, newFeature.trim()]
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      engine_features: formData.engine_features.filter((_, i) => i !== index)
    });
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="engine_no">Engine No</Label>
                      <Input
                        id="engine_no"
                        value={formData.engine_no}
                        onChange={(e) => setFormData({ ...formData, engine_no: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="engine_type">Engine Type</Label>
                      <Input
                        id="engine_type"
                        value={formData.engine_type}
                        onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="transmission_type">Transmission Type</Label>
                      <Input
                        id="transmission_type"
                        value={formData.transmission_type}
                        onChange={(e) => setFormData({ ...formData, transmission_type: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="primary_fuel_type">Primary Fuel Type</Label>
                      <Input
                        id="primary_fuel_type"
                        value={formData.primary_fuel_type}
                        onChange={(e) => setFormData({ ...formData, primary_fuel_type: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="no_of_cylinders">Number of Cylinders</Label>
                      <Input
                        id="no_of_cylinders"
                        type="number"
                        value={formData.no_of_cylinders}
                        onChange={(e) => setFormData({ ...formData, no_of_cylinders: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="turbo">Turbo</Label>
                      <Input
                        id="turbo"
                        value={formData.turbo}
                        onChange={(e) => setFormData({ ...formData, turbo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="engine_size">Engine Size</Label>
                      <Input
                        id="engine_size"
                        type="number"
                        value={formData.engine_size}
                        onChange={(e) => setFormData({ ...formData, engine_size: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="engine_size_unit">Engine Size Unit</Label>
                      <Input
                        id="engine_size_unit"
                        value={formData.engine_size_unit}
                        onChange={(e) => setFormData({ ...formData, engine_size_unit: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Engine Features</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add engine feature"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                      />
                      <Button type="button" onClick={addFeature}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.engine_features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                          <span className="text-sm">{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(index)}
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
                    <Label className="text-sm font-medium">Engine No</Label>
                    <p className="text-sm text-muted-foreground">{formData.engine_no || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Engine Type</Label>
                    <p className="text-sm text-muted-foreground">{formData.engine_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Transmission Type</Label>
                    <p className="text-sm text-muted-foreground">{formData.transmission_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Primary Fuel Type</Label>
                    <p className="text-sm text-muted-foreground">{formData.primary_fuel_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Number of Cylinders</Label>
                    <p className="text-sm text-muted-foreground">{formData.no_of_cylinders || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Turbo</Label>
                    <p className="text-sm text-muted-foreground">{formData.turbo || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Engine Size</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.engine_size ? `${formData.engine_size} ${formData.engine_size_unit}` : "N/A"}
                    </p>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-sm font-medium">Engine Features</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.engine_features.length > 0 ? (
                        formData.engine_features.map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No features listed</p>
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

export default VehicleEngineSection;
