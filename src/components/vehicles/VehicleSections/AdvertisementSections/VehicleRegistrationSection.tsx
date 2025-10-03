
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices } from "@/api/services";

interface VehicleRegistrationSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleRegistrationSection: React.FC<VehicleRegistrationSectionProps> = ({
  vehicle,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const registrationData = vehicle.vehicle_registration?.[0] || {};
  
  const [formData, setFormData] = useState({
    registered_in_local: registrationData.registered_in_local || false,
    year_first_registered_local: registrationData.year_first_registered_local || "",
    re_registered: registrationData.re_registered || false,
    first_registered_year: registrationData.first_registered_year || "",
    license_expiry_date: registrationData.license_expiry_date ? new Date(registrationData.license_expiry_date).toISOString().split('T')[0] : "",
    wof_cof_expiry_date: registrationData.wof_cof_expiry_date ? new Date(registrationData.wof_cof_expiry_date).toISOString().split('T')[0] : "",
    last_registered_country: registrationData.last_registered_country || "",
    road_user_charges_apply: registrationData.road_user_charges_apply || false,
    outstanding_road_user_charges: registrationData.outstanding_road_user_charges || false,
    ruc_end_distance: registrationData.ruc_end_distance || "",
  });

  const handleSave = async () => {
    try {
      await vehicleServices.updateVehicleRegistration(vehicle._id,vehicle.vehicle_type, {
        vehicle_registration: [{
          registered_in_local: formData.registered_in_local,
          year_first_registered_local: formData.year_first_registered_local,
          re_registered: formData.re_registered,
          first_registered_year: formData.first_registered_year,
          license_expiry_date: formData.license_expiry_date,
          wof_cof_expiry_date: formData.wof_cof_expiry_date,
          last_registered_country: formData.last_registered_country,
          road_user_charges_apply: formData.road_user_charges_apply,
          outstanding_road_user_charges: formData.outstanding_road_user_charges,
          ruc_end_distance: formData.ruc_end_distance,
        }]
      });

      toast.success("Registration information updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update registration information");
    }
  };

  const handleCancel = () => {
    setFormData({
      registered_in_local: registrationData.registered_in_local || false,
      year_first_registered_local: registrationData.year_first_registered_local || "",
      re_registered: registrationData.re_registered || false,
      first_registered_year: registrationData.first_registered_year || "",
      license_expiry_date: registrationData.license_expiry_date ? new Date(registrationData.license_expiry_date).toISOString().split('T')[0] : "",
      wof_cof_expiry_date: registrationData.wof_cof_expiry_date ? new Date(registrationData.wof_cof_expiry_date).toISOString().split('T')[0] : "",
      last_registered_country: registrationData.last_registered_country || "",
      road_user_charges_apply: registrationData.road_user_charges_apply || false,
      outstanding_road_user_charges: registrationData.outstanding_road_user_charges || false,
      ruc_end_distance: registrationData.ruc_end_distance || "",
    });
    setIsEditing(false);
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="registration">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Vehicle Registration</span>
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
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.registered_in_local}
                        onCheckedChange={(checked) => setFormData({ ...formData, registered_in_local: checked })}
                      />
                      <Label>Registered Locally</Label>
                    </div>
                    <div>
                      <Label htmlFor="year_first_registered_local">Year First Registered Local</Label>
                      <Input
                        id="year_first_registered_local"
                        type="number"
                        value={formData.year_first_registered_local}
                        onChange={(e) => setFormData({ ...formData, year_first_registered_local: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.re_registered}
                        onCheckedChange={(checked) => setFormData({ ...formData, re_registered: checked })}
                      />
                      <Label>Re-registered</Label>
                    </div>
                    <div>
                      <Label htmlFor="first_registered_year">First Registered Year</Label>
                      <Input
                        id="first_registered_year"
                        type="number"
                        value={formData.first_registered_year}
                        onChange={(e) => setFormData({ ...formData, first_registered_year: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="license_expiry_date">License Expiry Date</Label>
                      <Input
                        id="license_expiry_date"
                        type="date"
                        value={formData.license_expiry_date}
                        onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wof_cof_expiry_date">WOF/COF Expiry Date</Label>
                      <Input
                        id="wof_cof_expiry_date"
                        type="date"
                        value={formData.wof_cof_expiry_date}
                        onChange={(e) => setFormData({ ...formData, wof_cof_expiry_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_registered_country">Last Registered Country</Label>
                      <Input
                        id="last_registered_country"
                        value={formData.last_registered_country}
                        onChange={(e) => setFormData({ ...formData, last_registered_country: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ruc_end_distance">RUC End Distance</Label>
                      <Input
                        id="ruc_end_distance"
                        type="number"
                        value={formData.ruc_end_distance}
                        onChange={(e) => setFormData({ ...formData, ruc_end_distance: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.road_user_charges_apply}
                        onCheckedChange={(checked) => setFormData({ ...formData, road_user_charges_apply: checked })}
                      />
                      <Label>Road User Charges Apply</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.outstanding_road_user_charges}
                        onCheckedChange={(checked) => setFormData({ ...formData, outstanding_road_user_charges: checked })}
                      />
                      <Label>Outstanding Road User Charges</Label>
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
                    <Label className="text-sm font-medium">Registered Locally</Label>
                    <p className="text-sm text-muted-foreground">{formData.registered_in_local ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Year First Registered Local</Label>
                    <p className="text-sm text-muted-foreground">{formData.year_first_registered_local || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Re-registered</Label>
                    <p className="text-sm text-muted-foreground">{formData.re_registered ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">First Registered Year</Label>
                    <p className="text-sm text-muted-foreground">{formData.first_registered_year || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">License Expiry Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.license_expiry_date ? new Date(formData.license_expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">WOF/COF Expiry Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.wof_cof_expiry_date ? new Date(formData.wof_cof_expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Registered Country</Label>
                    <p className="text-sm text-muted-foreground">{formData.last_registered_country || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">RUC End Distance</Label>
                    <p className="text-sm text-muted-foreground">{formData.ruc_end_distance || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Road User Charges Apply</Label>
                    <p className="text-sm text-muted-foreground">{formData.road_user_charges_apply ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Outstanding Road User Charges</Label>
                    <p className="text-sm text-muted-foreground">{formData.outstanding_road_user_charges ? 'Yes' : 'No'}</p>
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

export default VehicleRegistrationSection;
