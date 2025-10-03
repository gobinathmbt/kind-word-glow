
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices } from "@/api/services";

interface VehicleSafetySectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleSafetySection: React.FC<VehicleSafetySectionProps> = ({ vehicle, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const safety = vehicle.vehicle_safety_features?.[0] || {};
  
  const [formData, setFormData] = useState({
    features: safety.features || [],
  });

  const [newFeature, setNewFeature] = useState("");

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleSafetyFeatures(vehicle._id,vehicle.vehicle_type, {
        vehicle_safety_features: [{
          features: formData.features,
        }]
      });

      toast.success("Safety features updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update safety features");
    }
  };

  const handleCancel = () => {
    setFormData({
      features: safety.features || [],
    });
    setIsEditing(false);
    setNewFeature("");
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="safety">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Safety Features</span>
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
                  <div>
                    <Label>Safety Features</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add safety feature"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                      />
                      <Button type="button" onClick={addFeature}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.features.map((feature, index) => (
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
                <div>
                  <Label className="text-sm font-medium">Safety Features</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.features.length > 0 ? (
                      formData.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-muted rounded text-sm">{feature}</span>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No safety features listed</p>
                    )}
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

export default VehicleSafetySection;
