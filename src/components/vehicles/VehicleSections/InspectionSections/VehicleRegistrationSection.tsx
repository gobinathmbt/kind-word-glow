
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
import FieldWithHistory from "@/components/common/FieldWithHistory";

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
      await vehicleServices.updateVehicleRegistration(vehicle._id, vehicle.vehicle_type, {
        module_section: "Vehicle Registration",
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
                    <FieldWithHistory
                      fieldName="registered_in_local"
                      fieldDisplayName="Registered Locally"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="Registered Locally"
                      showHistoryIcon={!isEditing}
                    >
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.registered_in_local}
                          onCheckedChange={(checked) => setFormData({ ...formData, registered_in_local: checked })}
                        />
                      </div>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="year_first_registered_local"
                      fieldDisplayName="Year First Registered Local"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="Year First Registered Local"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="year_first_registered_local"
                        type="number"
                        value={formData.year_first_registered_local}
                        onChange={(e) => setFormData({ ...formData, year_first_registered_local: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="re_registered"
                      fieldDisplayName="Re-registered"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="Re-registered"
                      showHistoryIcon={!isEditing}
                    >
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.re_registered}
                          onCheckedChange={(checked) => setFormData({ ...formData, re_registered: checked })}
                        />
                      </div>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="first_registered_year"
                      fieldDisplayName="First Registered Year"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="First Registered Year"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="first_registered_year"
                        type="number"
                        value={formData.first_registered_year}
                        onChange={(e) => setFormData({ ...formData, first_registered_year: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="license_expiry_date"
                      fieldDisplayName="License Expiry Date"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="License Expiry Date"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="license_expiry_date"
                        type="date"
                        value={formData.license_expiry_date}
                        onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="wof_cof_expiry_date"
                      fieldDisplayName="WOF/COF Expiry Date"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="WOF/COF Expiry Date"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="wof_cof_expiry_date"
                        type="date"
                        value={formData.wof_cof_expiry_date}
                        onChange={(e) => setFormData({ ...formData, wof_cof_expiry_date: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="last_registered_country"
                      fieldDisplayName="Last Registered Country"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="Last Registered Country"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="last_registered_country"
                        value={formData.last_registered_country}
                        onChange={(e) => setFormData({ ...formData, last_registered_country: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="ruc_end_distance"
                      fieldDisplayName="RUC End Distance"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="RUC End Distance"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="ruc_end_distance"
                        type="number"
                        value={formData.ruc_end_distance}
                        onChange={(e) => setFormData({ ...formData, ruc_end_distance: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="road_user_charges_apply"
                      fieldDisplayName="Road User Charges Apply"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="Road User Charges Apply"
                      showHistoryIcon={!isEditing}
                    >
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.road_user_charges_apply}
                          onCheckedChange={(checked) => setFormData({ ...formData, road_user_charges_apply: checked })}
                        />
                      </div>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="outstanding_road_user_charges"
                      fieldDisplayName="Outstanding Road User Charges"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType="inspection"
                      moduleName="Vehicle Registration"
                      label="Outstanding Road User Charges"
                      showHistoryIcon={!isEditing}
                    >
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.outstanding_road_user_charges}
                          onCheckedChange={(checked) => setFormData({ ...formData, outstanding_road_user_charges: checked })}
                        />
                      </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <FieldWithHistory
                    fieldName="registered_in_local"
                    fieldDisplayName="Registered Locally"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="Registered Locally"
                  >
                    <p className="text-sm text-muted-foreground">{formData.registered_in_local ? 'Yes' : 'No'}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="year_first_registered_local"
                    fieldDisplayName="Year First Registered Local"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="Year First Registered Local"
                  >
                    <p className="text-sm text-muted-foreground">{formData.year_first_registered_local || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="re_registered"
                    fieldDisplayName="Re-registered"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="Re-registered"
                  >
                    <p className="text-sm text-muted-foreground">{formData.re_registered ? 'Yes' : 'No'}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="first_registered_year"
                    fieldDisplayName="First Registered Year"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="First Registered Year"
                  >
                    <p className="text-sm text-muted-foreground">{formData.first_registered_year || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="license_expiry_date"
                    fieldDisplayName="License Expiry Date"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="License Expiry Date"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.license_expiry_date ? new Date(formData.license_expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="wof_cof_expiry_date"
                    fieldDisplayName="WOF/COF Expiry Date"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="WOF/COF Expiry Date"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.wof_cof_expiry_date ? new Date(formData.wof_cof_expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="last_registered_country"
                    fieldDisplayName="Last Registered Country"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="Last Registered Country"
                  >
                    <p className="text-sm text-muted-foreground">{formData.last_registered_country || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="ruc_end_distance"
                    fieldDisplayName="RUC End Distance"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="RUC End Distance"
                  >
                    <p className="text-sm text-muted-foreground">{formData.ruc_end_distance || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="road_user_charges_apply"
                    fieldDisplayName="Road User Charges Apply"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="Road User Charges Apply"
                  >
                    <p className="text-sm text-muted-foreground">{formData.road_user_charges_apply ? 'Yes' : 'No'}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="outstanding_road_user_charges"
                    fieldDisplayName="Outstanding Road User Charges"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType="inspection"
                    moduleName="Vehicle Registration"
                    label="Outstanding Road User Charges"
                  >
                    <p className="text-sm text-muted-foreground">{formData.outstanding_road_user_charges ? 'Yes' : 'No'}</p>
                  </FieldWithHistory>
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
