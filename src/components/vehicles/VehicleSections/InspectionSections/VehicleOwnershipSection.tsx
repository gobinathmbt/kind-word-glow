
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices } from "@/api/services";

interface VehicleOwnershipSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleOwnershipSection: React.FC<VehicleOwnershipSectionProps> = ({ vehicle, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const ownership = vehicle.vehicle_ownership || {};
  const [formData, setFormData] = useState({
    origin: ownership.origin || "",
    no_of_previous_owners: ownership.no_of_previous_owners || "",
    security_interest_on_ppsr: ownership.security_interest_on_ppsr || false,
    comments: ownership.comments || "",
  });

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleOwnership(vehicle._id,vehicle.vehicle_type, {
        vehicle_ownership: {
          origin: formData.origin,
          no_of_previous_owners: formData.no_of_previous_owners,
          security_interest_on_ppsr: formData.security_interest_on_ppsr,
          comments: formData.comments,
        }
      });

      toast.success("Ownership information updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update ownership information");
    }
  };

  const handleCancel = () => {
    setFormData({
      origin: ownership.origin || "",
      no_of_previous_owners: ownership.no_of_previous_owners || "",
      security_interest_on_ppsr: ownership.security_interest_on_ppsr || false,
      comments: ownership.comments || "",
    });
    setIsEditing(false);
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="ownership">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Ownership</span>
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
                      <Label htmlFor="origin">Origin</Label>
                      <Input
                        id="origin"
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="no_of_previous_owners">Previous Owners</Label>
                      <Input
                        id="no_of_previous_owners"
                        type="number"
                        value={formData.no_of_previous_owners}
                        onChange={(e) => setFormData({ ...formData, no_of_previous_owners: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.security_interest_on_ppsr}
                        onCheckedChange={(checked) => setFormData({ ...formData, security_interest_on_ppsr: checked })}
                      />
                      <Label>Security Interest on PPSR</Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="comments">Comments</Label>
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    />
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
                    <Label className="text-sm font-medium">Origin</Label>
                    <p className="text-sm text-muted-foreground">{formData.origin || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Previous Owners</Label>
                    <p className="text-sm text-muted-foreground">{formData.no_of_previous_owners || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Security Interest on PPSR</Label>
                    <p className="text-sm text-muted-foreground">{formData.security_interest_on_ppsr ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Comments</Label>
                    <p className="text-sm text-muted-foreground">{formData.comments || "N/A"}</p>
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

export default VehicleOwnershipSection;
