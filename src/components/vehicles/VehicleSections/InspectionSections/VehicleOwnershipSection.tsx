
import React, { useState, useEffect } from "react";
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
import FieldWithHistory from "@/components/common/FieldWithHistory";

interface VehicleOwnershipSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleOwnershipSection: React.FC<VehicleOwnershipSectionProps> = ({ vehicle, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  // Fix: vehicle_ownership is stored as an array in the database, access the first element
  const ownership = (vehicle.vehicle_ownership && Array.isArray(vehicle.vehicle_ownership) && vehicle.vehicle_ownership.length > 0) 
    ? vehicle.vehicle_ownership[0] 
    : {};
  const [formData, setFormData] = useState({
    origin: ownership.origin || "",
    no_of_previous_owners: ownership.no_of_previous_owners || "",
    security_interest_on_ppsr: ownership.security_interest_on_ppsr === true, // Explicit boolean check
    comments: ownership.comments || "",
  });

  // Update form data when vehicle data changes (after save/refresh)
  useEffect(() => {
    const ownership = (vehicle.vehicle_ownership && Array.isArray(vehicle.vehicle_ownership) && vehicle.vehicle_ownership.length > 0) 
      ? vehicle.vehicle_ownership[0] 
      : {};
    setFormData({
      origin: ownership.origin || "",
      no_of_previous_owners: ownership.no_of_previous_owners || "",
      security_interest_on_ppsr: ownership.security_interest_on_ppsr === true, // Explicit boolean check
      comments: ownership.comments || "",
    });
  }, [vehicle.vehicle_ownership, vehicle._id]); // Add vehicle._id to dependencies to ensure refresh

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleOwnership(vehicle._id, vehicle.vehicle_type, {
        module_section: "Vehicle Ownership",
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
    // Fix: vehicle_ownership is stored as an array in the database, access the first element
    const ownership = (vehicle.vehicle_ownership && Array.isArray(vehicle.vehicle_ownership) && vehicle.vehicle_ownership.length > 0) 
      ? vehicle.vehicle_ownership[0] 
      : {};
    setFormData({
      origin: ownership.origin || "",
      no_of_previous_owners: ownership.no_of_previous_owners || "",
      security_interest_on_ppsr: ownership.security_interest_on_ppsr === true, // Explicit boolean check
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
                    <FieldWithHistory
                      fieldName="origin"
                      fieldDisplayName="Origin"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Ownership"
                      label="Origin"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="origin"
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="no_of_previous_owners"
                      fieldDisplayName="Previous Owners"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Ownership"
                      label="Previous Owners"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="no_of_previous_owners"
                        type="number"
                        value={formData.no_of_previous_owners}
                        onChange={(e) => setFormData({ ...formData, no_of_previous_owners: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="security_interest_on_ppsr"
                      fieldDisplayName="Security Interest on PPSR"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Ownership"
                      label="Security Interest on PPSR"
                      showHistoryIcon={!isEditing}
                    >
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.security_interest_on_ppsr}
                          onCheckedChange={(checked) => setFormData({ ...formData, security_interest_on_ppsr: checked })}
                        />
                      </div>
                    </FieldWithHistory>
                  </div>
                  <FieldWithHistory
                    fieldName="comments"
                    fieldDisplayName="Comments"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Ownership"
                    label="Comments"
                    showHistoryIcon={!isEditing}
                  >
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
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
                <div className="grid grid-cols-2 gap-4">
                  <FieldWithHistory
                    fieldName="origin"
                    fieldDisplayName="Origin"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Ownership"
                    label="Origin"
                  >
                    <p className="text-sm text-muted-foreground">{formData.origin || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="no_of_previous_owners"
                    fieldDisplayName="Previous Owners"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Ownership"
                    label="Previous Owners"
                  >
                    <p className="text-sm text-muted-foreground">{formData.no_of_previous_owners || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="security_interest_on_ppsr"
                    fieldDisplayName="Security Interest on PPSR"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Ownership"
                    label="Security Interest on PPSR"
                  >
                    <p className="text-sm text-muted-foreground">{formData.security_interest_on_ppsr ? 'Yes' : 'No'}</p>
                  </FieldWithHistory>
                  <div className="col-span-2">
                    <FieldWithHistory
                      fieldName="comments"
                      fieldDisplayName="Comments"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Ownership"
                      label="Comments"
                    >
                      <p className="text-sm text-muted-foreground">{formData.comments || "N/A"}</p>
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

export default VehicleOwnershipSection;
