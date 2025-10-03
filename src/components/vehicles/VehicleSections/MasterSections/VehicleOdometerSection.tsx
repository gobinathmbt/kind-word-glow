
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices } from "@/api/services";

interface VehicleOdometerSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleOdometerSection: React.FC<VehicleOdometerSectionProps> = ({ vehicle, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const odometer = vehicle.vehicle_odometer?.[0] || {};
  
  const [formData, setFormData] = useState({
    reading: odometer.reading || "",
    reading_date: odometer.reading_date ? new Date(odometer.reading_date).toISOString().split('T')[0] : "",
  });

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleOdometer(vehicle._id,vehicle.vehicle_type, {
        vehicle_odometer: [{
          reading: formData.reading,
          reading_date: formData.reading_date,
        }]
      });

      toast.success("Odometer information updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update odometer information");
    }
  };

  const handleCancel = () => {
    setFormData({
      reading: odometer.reading || "",
      reading_date: odometer.reading_date ? new Date(odometer.reading_date).toISOString().split('T')[0] : "",
    });
    setIsEditing(false);
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="odometer">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Odometer</span>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reading">Reading (km)</Label>
                      <Input
                        id="reading"
                        type="number"
                        value={formData.reading}
                        onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reading_date">Reading Date</Label>
                      <Input
                        id="reading_date"
                        type="date"
                        value={formData.reading_date}
                        onChange={(e) => setFormData({ ...formData, reading_date: e.target.value })}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Reading</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.reading ? `${parseInt(formData.reading).toLocaleString()} km` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reading Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.reading_date ? new Date(formData.reading_date).toLocaleDateString() : 'N/A'}
                    </p>
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

export default VehicleOdometerSection;
