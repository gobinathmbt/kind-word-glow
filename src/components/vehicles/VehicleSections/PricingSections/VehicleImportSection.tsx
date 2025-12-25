
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { commonVehicleServices } from "@/api/services";
import FieldWithHistory from "@/components/common/FieldWithHistory";

interface VehicleImportSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleImportSection: React.FC<VehicleImportSectionProps> = ({
  vehicle,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const importData = vehicle.vehicle_import_details?.[0] || {};
  
  const [formData, setFormData] = useState({
    delivery_port: importData.delivery_port || "",
    vessel_name: importData.vessel_name || "",
    voyage: importData.voyage || "",
    etd: importData.etd ? new Date(importData.etd).toISOString().split('T')[0] : "",
    eta: importData.eta ? new Date(importData.eta).toISOString().split('T')[0] : "",
    date_on_yard: importData.date_on_yard ? new Date(importData.date_on_yard).toISOString().split('T')[0] : "",
    imported_as_damaged: importData.imported_as_damaged || false,
  });

  const handleSave = async () => {
    try {
      await commonVehicleServices.updateVehiclePricing(vehicle._id, vehicle.vehicle_type, {
        vehicle_import_details: [{
          delivery_port: formData.delivery_port,
          vessel_name: formData.vessel_name,
          voyage: formData.voyage,
          etd: formData.etd,
          eta: formData.eta,
          date_on_yard: formData.date_on_yard,
          imported_as_damaged: formData.imported_as_damaged,
        }],
        module_section: "Pricing Import Details" // Add section name for activity logging
      });

      toast.success("Import details updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error("Failed to update import details:", error);
      toast.error(error?.response?.data?.message || "Failed to update import details");
    }
  };

  const handleCancel = () => {
    setFormData({
      delivery_port: importData.delivery_port || "",
      vessel_name: importData.vessel_name || "",
      voyage: importData.voyage || "",
      etd: importData.etd ? new Date(importData.etd).toISOString().split('T')[0] : "",
      eta: importData.eta ? new Date(importData.eta).toISOString().split('T')[0] : "",
      date_on_yard: importData.date_on_yard ? new Date(importData.date_on_yard).toISOString().split('T')[0] : "",
      imported_as_damaged: importData.imported_as_damaged || false,
    });
    setIsEditing(false);
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="import">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Import Details</span>
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
                      fieldName="delivery_port"
                      fieldDisplayName="Delivery Port"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Import Details"
                      label="Delivery Port"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="delivery_port"
                        value={formData.delivery_port}
                        onChange={(e) => setFormData({ ...formData, delivery_port: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="vessel_name"
                      fieldDisplayName="Vessel Name"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Import Details"
                      label="Vessel Name"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="vessel_name"
                        value={formData.vessel_name}
                        onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="voyage"
                      fieldDisplayName="Voyage"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Import Details"
                      label="Voyage"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="voyage"
                        value={formData.voyage}
                        onChange={(e) => setFormData({ ...formData, voyage: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="imported_as_damaged"
                      fieldDisplayName="Imported as Damaged"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Import Details"
                      label="Imported as Damaged"
                      showHistoryIcon={!isEditing}
                    >
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.imported_as_damaged}
                          onCheckedChange={(checked) => setFormData({ ...formData, imported_as_damaged: checked })}
                        />
                      </div>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="etd"
                      fieldDisplayName="ETD"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Import Details"
                      label="ETD"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="etd"
                        type="date"
                        value={formData.etd}
                        onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="eta"
                      fieldDisplayName="ETA"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Import Details"
                      label="ETA"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="eta"
                        type="date"
                        value={formData.eta}
                        onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                      />
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="date_on_yard"
                      fieldDisplayName="Date on Yard"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Import Details"
                      label="Date on Yard"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="date_on_yard"
                        type="date"
                        value={formData.date_on_yard}
                        onChange={(e) => setFormData({ ...formData, date_on_yard: e.target.value })}
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
                <div className="grid grid-cols-2 gap-4">
                  <FieldWithHistory
                    fieldName="delivery_port"
                    fieldDisplayName="Delivery Port"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Pricing Import Details"
                    label="Delivery Port"
                  >
                    <p className="text-sm text-muted-foreground">{formData.delivery_port || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="vessel_name"
                    fieldDisplayName="Vessel Name"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Pricing Import Details"
                    label="Vessel Name"
                  >
                    <p className="text-sm text-muted-foreground">{formData.vessel_name || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="voyage"
                    fieldDisplayName="Voyage"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Pricing Import Details"
                    label="Voyage"
                  >
                    <p className="text-sm text-muted-foreground">{formData.voyage || "N/A"}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="imported_as_damaged"
                    fieldDisplayName="Imported as Damaged"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Pricing Import Details"
                    label="Imported as Damaged"
                  >
                    <p className="text-sm text-muted-foreground">{formData.imported_as_damaged ? 'Yes' : 'No'}</p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="etd"
                    fieldDisplayName="ETD"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Pricing Import Details"
                    label="ETD"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.etd ? new Date(formData.etd).toLocaleDateString() : 'N/A'}
                    </p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="eta"
                    fieldDisplayName="ETA"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Pricing Import Details"
                    label="ETA"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.eta ? new Date(formData.eta).toLocaleDateString() : 'N/A'}
                    </p>
                  </FieldWithHistory>
                  <FieldWithHistory
                    fieldName="date_on_yard"
                    fieldDisplayName="Date on Yard"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Pricing Import Details"
                    label="Date on Yard"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.date_on_yard ? new Date(formData.date_on_yard).toLocaleDateString() : 'N/A'}
                    </p>
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

export default VehicleImportSection;
