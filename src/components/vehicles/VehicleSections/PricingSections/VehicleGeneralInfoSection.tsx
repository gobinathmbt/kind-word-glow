import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices, companyServices, commonVehicleServices } from "@/api/services";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import FieldWithHistory from "@/components/common/FieldWithHistory";
import VehicleMetadataSelector from "@/components/common/VehicleMetadataSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleGeneralInfoSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleGeneralInfoSection: React.FC<VehicleGeneralInfoSectionProps> = ({
  vehicle,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Safe access to nested objects with fallbacks
  const otherDetails = vehicle?.vehicle_other_details?.[0] || {};
  const sourceDetails = vehicle?.vehicle_source?.[0] || {};

  const [formData, setFormData] = useState({
    // Basic vehicle info
    status: otherDetails.status || "",
    make: vehicle?.make || "",
    model: vehicle?.model || "",
    variant: vehicle?.variant || "",
    year: vehicle?.year ? vehicle.year.toString() : "",
    body_style: vehicle?.body_style || "",
    vehicle_type: vehicle?.vehicle_type || "",
    vin: vehicle?.vin || "",
    plate_no: vehicle?.plate_no || "",
    chassis_no: vehicle?.chassis_no || "",
    model_no: vehicle?.model_no || "",

    // Source info
    purchase_date: sourceDetails.purchase_date ? new Date(sourceDetails.purchase_date).toISOString().split('T')[0] : "",
    purchase_type: sourceDetails.purchase_type || "",
    supplier: sourceDetails.supplier || "",
    purchase_notes: sourceDetails.purchase_notes || "",

    // Other details
    trader_acquisition: otherDetails.trader_acquisition || "",
    odometer_certified: otherDetails.odometer_certified || false,
    odometer_status: otherDetails.odometer_status || "",
    purchase_price: otherDetails.purchase_price || 0,
    exact_expenses: otherDetails.exact_expenses || 0,
    estimated_expenses: otherDetails.estimated_expenses || 0,
    gst_inclusive: otherDetails.gst_inclusive || false,
    retail_price: otherDetails.retail_price || 0,
    sold_price: otherDetails.sold_price || 0,
    included_in_exports: otherDetails.included_in_exports || true,
  });

  // Sync form data with vehicle prop whenever it changes
  React.useEffect(() => {
    if (vehicle) {
      const otherDetails = vehicle?.vehicle_other_details?.[0] || {};
      const sourceDetails = vehicle?.vehicle_source?.[0] || {};

      setFormData({
        // Basic vehicle info
        status: otherDetails.status || "",
        make: vehicle?.make || "",
        model: vehicle?.model || "",
        variant: vehicle?.variant || "",
        year: vehicle?.year ? vehicle.year.toString() : "",
        body_style: vehicle?.body_style || "",
        vehicle_type: vehicle?.vehicle_type || "",
        vin: vehicle?.vin || "",
        plate_no: vehicle?.plate_no || "",
        chassis_no: vehicle?.chassis_no || "",
        model_no: vehicle?.model_no || "",

        // Source info
        purchase_date: sourceDetails.purchase_date ? new Date(sourceDetails.purchase_date).toISOString().split('T')[0] : "",
        purchase_type: sourceDetails.purchase_type || "",
        supplier: sourceDetails.supplier || "",
        purchase_notes: sourceDetails.purchase_notes || "",

        // Other details
        trader_acquisition: otherDetails.trader_acquisition || "",
        odometer_certified: otherDetails.odometer_certified || false,
        odometer_status: otherDetails.odometer_status || "",
        purchase_price: otherDetails.purchase_price || 0,
        exact_expenses: otherDetails.exact_expenses || 0,
        estimated_expenses: otherDetails.estimated_expenses || 0,
        gst_inclusive: otherDetails.gst_inclusive || false,
        retail_price: otherDetails.retail_price || 0,
        sold_price: otherDetails.sold_price || 0,
        included_in_exports: otherDetails.included_in_exports || true,
      });
    }
  }, [vehicle]);

  // Handler functions for VehicleMetadataSelector
  const handleMakeChange = (displayName: string) => {
    setFormData({ ...formData, make: displayName });
  };

  const handleModelChange = (displayName: string) => {
    setFormData({ ...formData, model: displayName });
  };

  const handleVariantChange = (displayName: string) => {
    setFormData({ ...formData, variant: displayName });
  };

  const handleYearChange = (displayName: string) => {
    setFormData({ ...formData, year: displayName });
  };

  const handleBodyChange = (displayName: string) => {
    setFormData({ ...formData, body_style: displayName });
  };

  const handleSave = async () => {
    try {
      // Use the new comprehensive pricing update endpoint with activity logging
      await commonVehicleServices.updateVehiclePricing(vehicle._id, vehicle.vehicle_type, {
        // Basic vehicle info
        make: formData.make,
        model: formData.model,
        variant: formData.variant,
        year: formData.year,
        body_style: formData.body_style,
        vehicle_type: formData.vehicle_type,
        vin: formData.vin,
        plate_no: formData.plate_no,
        chassis_no: formData.chassis_no,
        model_no: formData.model_no,
        
        // Vehicle other details
        vehicle_other_details: [
          {
            status: formData.status,
            trader_acquisition: formData.trader_acquisition,
            odometer_certified: formData.odometer_certified,
            odometer_status: formData.odometer_status,
            purchase_price: formData.purchase_price,
            exact_expenses: formData.exact_expenses,
            estimated_expenses: formData.estimated_expenses,
            gst_inclusive: formData.gst_inclusive,
            retail_price: formData.retail_price,
            sold_price: formData.sold_price,
            included_in_exports: formData.included_in_exports,
          },
        ],
        
        // Vehicle source
        vehicle_source: [
          {
            purchase_date: formData.purchase_date,
            purchase_type: formData.purchase_type,
            supplier: formData.supplier,
            purchase_notes: formData.purchase_notes,
          },
        ],
        
        module_section: "Pricing General Info" // Add section name for activity logging
      });

      toast.success("General information updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update general information");
    }
  };

  const handleCancel = () => {
    setFormData({
      // Reset to original values
      status: otherDetails.status || "",
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      variant: vehicle?.variant || "",
      year: vehicle?.year ? vehicle.year.toString() : "",
      body_style: vehicle?.body_style || "",
      vehicle_type: vehicle?.vehicle_type || "",
      vin: vehicle?.vin || "",
      plate_no: vehicle?.plate_no || "",
      chassis_no: vehicle?.chassis_no || "",
      model_no: vehicle?.model_no || "",
      purchase_date: sourceDetails.purchase_date ? new Date(sourceDetails.purchase_date).toISOString().split('T')[0] : "",
      purchase_type: sourceDetails.purchase_type || "",
      supplier: sourceDetails.supplier || "",
      purchase_notes: sourceDetails.purchase_notes || "",
      trader_acquisition: otherDetails.trader_acquisition || "",
      odometer_certified: otherDetails.odometer_certified || false,
      odometer_status: otherDetails.odometer_status || "",
      purchase_price: otherDetails.purchase_price || 0,
      exact_expenses: otherDetails.exact_expenses || 0,
      estimated_expenses: otherDetails.estimated_expenses || 0,
      gst_inclusive: otherDetails.gst_inclusive || false,
      retail_price: otherDetails.retail_price || 0,
      sold_price: otherDetails.sold_price || 0,
      included_in_exports: otherDetails.included_in_exports || true,
    });
    setIsEditing(false);
  };

  const { data: vehicleStatus } = useQuery({
    queryKey: ["vehicle-status"],
    queryFn: async () => {
      const response = await companyServices.getCompanyMasterdropdownvalues({
        dropdown_name: ["vehicle_status"],
      });
      return response.data?.data[0]?.values || [];
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="general-info">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>General Information</span>
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
                  {/* Vehicle Metadata Selector with Add Entry functionality */}
                  <div className="mb-4">
                    <VehicleMetadataSelector
                      selectedMake={formData.make}
                      selectedModel={formData.model}
                      selectedVariant={formData.variant}
                      selectedYear={formData.year}
                      selectedBody={formData.body_style}
                      onMakeChange={handleMakeChange}
                      onModelChange={handleModelChange}
                      onVariantChange={handleVariantChange}
                      onYearChange={handleYearChange}
                      onBodyChange={handleBodyChange}
                      showLabels={true}
                      layout="grid-3"
                      isEdit={true}
                      editableFields={{
                        make: false,
                        model: false,
                        variant: true,
                        year: true,
                        body: true,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FieldWithHistory
                      fieldName="status"
                      fieldDisplayName="Status"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Status"
                      showHistoryIcon={!isEditing}
                    >
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          handleInputChange("status", value)
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleStatus?.map((status: any) => (
                            <SelectItem
                              key={status._id}
                              value={status.option_value}
                            >
                              {status.display_value}
                            </SelectItem>
                          ))}
                          {(!vehicleStatus || vehicleStatus.length === 0) && (
                            <SelectItem value="" disabled>
                              No status options available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="vehicle_type"
                      fieldDisplayName="Vehicle Type"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Vehicle Type"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="vehicle_type"
                        value={formData.vehicle_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vehicle_type: e.target.value,
                          })
                        }
                        disabled
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="vin"
                      fieldDisplayName="VIN"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="VIN"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="vin"
                        value={formData.vin}
                        onChange={(e) =>
                          setFormData({ ...formData, vin: e.target.value })
                        }
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="plate_no"
                      fieldDisplayName="Registration Plate Number"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Reg Plate No"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="plate_no"
                        value={formData.plate_no}
                        onChange={(e) =>
                          setFormData({ ...formData, plate_no: e.target.value })
                        }
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="chassis_no"
                      fieldDisplayName="Chassis Number"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Chassis"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="chassis_no"
                        value={formData.chassis_no}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            chassis_no: e.target.value,
                          })
                        }
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="model_no"
                      fieldDisplayName="Model Number"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Model No"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="model_no"
                        value={formData.model_no}
                        onChange={(e) =>
                          setFormData({ ...formData, model_no: e.target.value })
                        }
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="purchase_date"
                      fieldDisplayName="Purchase Date"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Purchase Date"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="purchase_date"
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchase_date: e.target.value,
                          })
                        }
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="purchase_type"
                      fieldDisplayName="Purchase Type"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Purchase Type"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="purchase_type"
                        value={formData.purchase_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchase_type: e.target.value,
                          })
                        }
                        disabled
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="supplier"
                      fieldDisplayName="Supplier"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Supplier"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) =>
                          setFormData({ ...formData, supplier: e.target.value })
                        }
                      />
                    </FieldWithHistory>
                    
                    <FieldWithHistory
                      fieldName="trader_acquisition"
                      fieldDisplayName="Trader Acquisition"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Trader Acquisition"
                      showHistoryIcon={!isEditing}
                    >
                      <Input
                        id="trader_acquisition"
                        value={formData.trader_acquisition}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trader_acquisition: e.target.value,
                          })
                        }
                      />
                    </FieldWithHistory>
                    
                    <div className="col-span-3">
                      <FieldWithHistory
                        fieldName="purchase_notes"
                        fieldDisplayName="Purchase Notes"
                        vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                        vehicleType={vehicle?.vehicle_type || "pricing"}
                        moduleName="Vehicle General Info"
                        label="Purchase Notes"
                        showHistoryIcon={!isEditing}
                      >
                        <Input
                          id="purchase_notes"
                          value={formData.purchase_notes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchase_notes: e.target.value,
                            })
                          }
                        />
                      </FieldWithHistory>
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
                <div className="grid grid-cols-4 gap-4">
                  <FieldWithHistory
                    fieldName="status"
                    fieldDisplayName="Status"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Status"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.status || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="make"
                    fieldDisplayName="Manufacture"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Manufacture"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.make || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="model"
                    fieldDisplayName="Model"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Model"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.model || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="variant"
                    fieldDisplayName="Variant"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Variant"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.variant || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="year"
                    fieldDisplayName="Year"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Year"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.year || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="body_style"
                    fieldDisplayName="Body Style"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Body Style"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.body_style || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="vehicle_type"
                    fieldDisplayName="Vehicle Type"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Vehicle Type"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.vehicle_type || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="vin"
                    fieldDisplayName="VIN"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="VIN"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.vin || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="plate_no"
                    fieldDisplayName="Registration Plate Number"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Reg Plate No"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.plate_no || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="chassis_no"
                    fieldDisplayName="Chassis Number"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Chassis"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.chassis_no || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="model_no"
                    fieldDisplayName="Model Number"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Model No"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.model_no || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="purchase_date"
                    fieldDisplayName="Purchase Date"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Purchase Date"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.purchase_date ? new Date(formData.purchase_date).toLocaleDateString() : "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="purchase_type"
                    fieldDisplayName="Purchase Type"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Purchase Type"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.purchase_type || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="supplier"
                    fieldDisplayName="Supplier"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Supplier"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.supplier || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <FieldWithHistory
                    fieldName="trader_acquisition"
                    fieldDisplayName="Trader Acquisition"
                    vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                    vehicleType={vehicle?.vehicle_type || "pricing"}
                    moduleName="Vehicle General Info"
                    label="Trader Acquisition"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formData.trader_acquisition || "N/A"}
                    </p>
                  </FieldWithHistory>
                  
                  <div className="col-span-4">
                    <FieldWithHistory
                      fieldName="purchase_notes"
                      fieldDisplayName="Purchase Notes"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Vehicle General Info"
                      label="Purchase Notes"
                    >
                      <p className="text-sm text-muted-foreground">
                        {formData.purchase_notes || "N/A"}
                      </p>
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

export default VehicleGeneralInfoSection;
