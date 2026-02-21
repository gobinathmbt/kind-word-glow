import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { tenderDealershipAuthService } from "@/api/services";
import {
  Car,
  DollarSign,
  FileText,
  Save,
  Send,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import VehicleMetadataSelector from "@/components/common/VehicleMetadataSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TenderQuoteSideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
  onClose: () => void;
  readOnly?: boolean;
}

const TenderQuoteSideModal: React.FC<TenderQuoteSideModalProps> = ({
  open,
  onOpenChange,
  tender,
  onClose,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState("sent");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Sent vehicle form data
  const [sentVehicleData, setSentVehicleData] = useState<any>({
    make: "",
    model: "",
    year: "",
    variant: "",
    body_style: "",
    color: "",
    registration_number: "",
    vin: "",
    odometer_reading: "",
    engine_type: "",
    engine_capacity: "",
    fuel_type: "",
    transmission: "",
    doors: "",
    seats: "",
    drive_type: "",
    features: "",
    quote_price: "",
    quote_notes: "",
  });

  // Alternate vehicle form data
  const [alternateVehicleData, setAlternateVehicleData] = useState<any>({
    make: "",
    model: "",
    year: "",
    variant: "",
    body_style: "",
    color: "",
    registration_number: "",
    vin: "",
    odometer_reading: "",
    engine_type: "",
    engine_capacity: "",
    fuel_type: "",
    transmission: "",
    doors: "",
    seats: "",
    drive_type: "",
    features: "",
    quote_price: "",
    quote_notes: "",
  });

  const [errors, setErrors] = useState<any>({});

  // Initialize form data when tender changes
  useEffect(() => {
    if (tender && open) {
      // Initialize sent vehicle with tender's basic vehicle info
      setSentVehicleData({
        make: tender.basic_vehicle_info?.make || "",
        model: tender.basic_vehicle_info?.model || "",
        year: tender.basic_vehicle_info?.year || "",
        variant: tender.basic_vehicle_info?.variant || "",
        body_style: tender.basic_vehicle_info?.body_style || "",
        color: tender.basic_vehicle_info?.color || "",
        registration_number: "",
        vin: "",
        odometer_reading: "",
        engine_type: "",
        engine_capacity: "",
        fuel_type: "",
        transmission: "",
        doors: "",
        seats: "",
        drive_type: "",
        features: "",
        quote_price: "",
        quote_notes: "",
      });

      // Reset alternate vehicle
      setAlternateVehicleData({
        make: "",
        model: "",
        year: "",
        variant: "",
        body_style: "",
        color: "",
        registration_number: "",
        vin: "",
        odometer_reading: "",
        engine_type: "",
        engine_capacity: "",
        fuel_type: "",
        transmission: "",
        doors: "",
        seats: "",
        drive_type: "",
        features: "",
        quote_price: "",
        quote_notes: "",
      });

      setErrors({});
      setActiveTab("sent");
    }
  }, [tender, open]);

  const isExpired = () => {
    return new Date(tender.tender_expiry_time) < new Date();
  };

  const validateForm = (isDraft: boolean = false) => {
    const newErrors: any = {};
    const data = activeTab === "sent" ? sentVehicleData : alternateVehicleData;

    // For submission, all fields are required
    if (!isDraft) {
      if (!data.quote_price || parseFloat(data.quote_price) <= 0) {
        newErrors.quote_price = "Quote price is required and must be greater than 0";
      }

      // For alternate vehicle, all vehicle fields are required
      if (activeTab === "alternate") {
        if (!data.make) newErrors.make = "Make is required";
        if (!data.model) newErrors.model = "Model is required";
        if (!data.year) newErrors.year = "Year is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (isExpired()) {
      toast.error("This tender has expired. You cannot save a draft.");
      return;
    }

    setIsSaving(true);

    try {
      const data = activeTab === "sent" ? sentVehicleData : alternateVehicleData;
      const payload = {
        vehicle_type: activeTab === "sent" ? "sent_vehicle" : "alternate_vehicle",
        vehicle_id: activeTab === "sent" ? tender._id : undefined, // Include vehicle_id for sent_vehicle
        ...data,
        quote_price: data.quote_price ? parseFloat(data.quote_price) : undefined,
        odometer_reading: data.odometer_reading ? parseInt(data.odometer_reading) : undefined,
        doors: data.doors ? parseInt(data.doors) : undefined,
        seats: data.seats ? parseInt(data.seats) : undefined,
        features: data.features ? data.features.split(",").map((f: string) => f.trim()) : [],
        is_draft: true,
      };

      await tenderDealershipAuthService.submitQuote(tender.tender_id, payload);
      toast.success("Draft saved successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isExpired()) {
      toast.error("This tender has expired. You cannot submit a quote.");
      return;
    }

    if (!validateForm(false)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = activeTab === "sent" ? sentVehicleData : alternateVehicleData;
      const payload = {
        vehicle_type: activeTab === "sent" ? "sent_vehicle" : "alternate_vehicle",
        vehicle_id: activeTab === "sent" ? tender._id : undefined, // Include vehicle_id for sent_vehicle
        ...data,
        quote_price: parseFloat(data.quote_price),
        odometer_reading: data.odometer_reading ? parseInt(data.odometer_reading) : undefined,
        doors: data.doors ? parseInt(data.doors) : undefined,
        seats: data.seats ? parseInt(data.seats) : undefined,
        features: data.features ? data.features.split(",").map((f: string) => f.trim()) : [],
        is_draft: false,
      };

      await tenderDealershipAuthService.submitQuote(tender.tender_id, payload);
      toast.success("Quote submitted successfully");
      setShowSubmitDialog(false);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (activeTab === "sent") {
      setSentVehicleData({ ...sentVehicleData, [field]: value });
    } else {
      setAlternateVehicleData({ ...alternateVehicleData, [field]: value });
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const currentData = activeTab === "sent" ? sentVehicleData : alternateVehicleData;
  const expired = isExpired();
  const canEdit = !readOnly && !expired && (tender.quote_status === "Open" || tender.quote_status === "In Progress");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Tender Quote</SheetTitle>
            <SheetDescription>
              {tender.tender_id} - {tender.customer_info?.name}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
            <div className="space-y-6">
              {/* Tender Information */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Customer:</span>
                  <span>{tender.customer_info?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Requested Vehicle:</span>
                  <span>
                    {tender.basic_vehicle_info?.make} {tender.basic_vehicle_info?.model}{" "}
                    {tender.basic_vehicle_info?.year}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Expires:</span>
                  <span className={expired ? "text-red-600 font-medium" : ""}>
                    {new Date(tender.tender_expiry_time).toLocaleString()}
                  </span>
                  {expired && (
                    <Badge variant="destructive" className="ml-2">
                      Expired
                    </Badge>
                  )}
                </div>
              </div>

              {expired && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">
                      This tender has expired. You cannot submit or save quotes.
                    </span>
                  </div>
                </div>
              )}

              {/* Tabs for Sent Vehicle and Alternate Vehicle */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sent">Received Vehicle</TabsTrigger>
                  <TabsTrigger value="alternate">Alternate Vehicle</TabsTrigger>
                </TabsList>

                {/* Sent Vehicle Tab */}
                <TabsContent value="sent" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    {/* Read-only fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Make (Read-only)</Label>
                        <Input value={sentVehicleData.make} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Model (Read-only)</Label>
                        <Input value={sentVehicleData.model} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Year (Read-only)</Label>
                        <Input value={sentVehicleData.year} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Variant (Read-only)</Label>
                        <Input value={sentVehicleData.variant} disabled />
                      </div>
                    </div>

                    <Separator />

                    {/* Editable fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Body Style</Label>
                        <Input
                          value={sentVehicleData.body_style}
                          onChange={(e) => handleInputChange("body_style", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Input
                          value={sentVehicleData.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Registration Number</Label>
                        <Input
                          value={sentVehicleData.registration_number}
                          onChange={(e) => handleInputChange("registration_number", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>VIN</Label>
                        <Input
                          value={sentVehicleData.vin}
                          onChange={(e) => handleInputChange("vin", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Odometer Reading (km)</Label>
                        <Input
                          type="number"
                          value={sentVehicleData.odometer_reading}
                          onChange={(e) => handleInputChange("odometer_reading", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Engine Details */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Engine Details</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Engine Type</Label>
                          <Input
                            value={sentVehicleData.engine_type}
                            onChange={(e) => handleInputChange("engine_type", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Engine Capacity</Label>
                          <Input
                            value={sentVehicleData.engine_capacity}
                            onChange={(e) => handleInputChange("engine_capacity", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fuel Type</Label>
                          <Select
                            value={sentVehicleData.fuel_type}
                            onValueChange={(value) => handleInputChange("fuel_type", value)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Petrol">Petrol</SelectItem>
                              <SelectItem value="Diesel">Diesel</SelectItem>
                              <SelectItem value="Electric">Electric</SelectItem>
                              <SelectItem value="Hybrid">Hybrid</SelectItem>
                              <SelectItem value="LPG">LPG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Transmission</Label>
                          <Select
                            value={sentVehicleData.transmission}
                            onValueChange={(value) => handleInputChange("transmission", value)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select transmission" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manual">Manual</SelectItem>
                              <SelectItem value="Automatic">Automatic</SelectItem>
                              <SelectItem value="CVT">CVT</SelectItem>
                              <SelectItem value="DCT">DCT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Specifications */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Specifications</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Doors</Label>
                          <Input
                            type="number"
                            value={sentVehicleData.doors}
                            onChange={(e) => handleInputChange("doors", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Seats</Label>
                          <Input
                            type="number"
                            value={sentVehicleData.seats}
                            onChange={(e) => handleInputChange("seats", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Drive Type</Label>
                          <Select
                            value={sentVehicleData.drive_type}
                            onValueChange={(value) => handleInputChange("drive_type", value)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select drive type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FWD">FWD</SelectItem>
                              <SelectItem value="RWD">RWD</SelectItem>
                              <SelectItem value="AWD">AWD</SelectItem>
                              <SelectItem value="4WD">4WD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Features (comma-separated)</Label>
                        <Textarea
                          value={sentVehicleData.features}
                          onChange={(e) => handleInputChange("features", e.target.value)}
                          placeholder="e.g., Leather seats, Sunroof, Navigation"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Quote Price */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Quote Price *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={sentVehicleData.quote_price}
                        onChange={(e) => handleInputChange("quote_price", e.target.value)}
                        placeholder="Enter quote price"
                        disabled={!canEdit}
                        className={errors.quote_price ? "border-red-500" : ""}
                      />
                      {errors.quote_price && (
                        <p className="text-sm text-red-600">{errors.quote_price}</p>
                      )}
                    </div>

                    {/* Quote Notes */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Quote Notes
                      </Label>
                      <Textarea
                        value={sentVehicleData.quote_notes}
                        onChange={(e) => handleInputChange("quote_notes", e.target.value)}
                        placeholder="Add any additional notes or comments"
                        rows={4}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Alternate Vehicle Tab */}
                <TabsContent value="alternate" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    {/* Vehicle Metadata Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Vehicle Details *</Label>
                      <VehicleMetadataSelector
                        selectedMake={alternateVehicleData.make}
                        selectedModel={alternateVehicleData.model}
                        selectedVariant={alternateVehicleData.variant}
                        selectedYear={alternateVehicleData.year}
                        selectedBody={alternateVehicleData.body_style}
                        onMakeChange={(value) => handleInputChange("make", value)}
                        onModelChange={(value) => handleInputChange("model", value)}
                        onVariantChange={(value) => handleInputChange("variant", value)}
                        onYearChange={(value) => handleInputChange("year", value)}
                        onBodyChange={(value) => handleInputChange("body_style", value)}
                        errors={errors}
                        layout="grid-2"
                        showMakePlus={false}
                        showModelPlus={false}
                        showVariantPlus={false}
                        showYearPlus={false}
                        showBodyPlus={false}
                      />
                    </div>

                    <Separator />

                    {/* Additional Vehicle Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Input
                          value={alternateVehicleData.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Registration Number</Label>
                        <Input
                          value={alternateVehicleData.registration_number}
                          onChange={(e) => handleInputChange("registration_number", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>VIN</Label>
                        <Input
                          value={alternateVehicleData.vin}
                          onChange={(e) => handleInputChange("vin", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Odometer Reading (km)</Label>
                        <Input
                          type="number"
                          value={alternateVehicleData.odometer_reading}
                          onChange={(e) => handleInputChange("odometer_reading", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Engine Details */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Engine Details</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Engine Type</Label>
                          <Input
                            value={alternateVehicleData.engine_type}
                            onChange={(e) => handleInputChange("engine_type", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Engine Capacity</Label>
                          <Input
                            value={alternateVehicleData.engine_capacity}
                            onChange={(e) => handleInputChange("engine_capacity", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fuel Type</Label>
                          <Select
                            value={alternateVehicleData.fuel_type}
                            onValueChange={(value) => handleInputChange("fuel_type", value)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Petrol">Petrol</SelectItem>
                              <SelectItem value="Diesel">Diesel</SelectItem>
                              <SelectItem value="Electric">Electric</SelectItem>
                              <SelectItem value="Hybrid">Hybrid</SelectItem>
                              <SelectItem value="LPG">LPG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Transmission</Label>
                          <Select
                            value={alternateVehicleData.transmission}
                            onValueChange={(value) => handleInputChange("transmission", value)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select transmission" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manual">Manual</SelectItem>
                              <SelectItem value="Automatic">Automatic</SelectItem>
                              <SelectItem value="CVT">CVT</SelectItem>
                              <SelectItem value="DCT">DCT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Specifications */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Specifications</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Doors</Label>
                          <Input
                            type="number"
                            value={alternateVehicleData.doors}
                            onChange={(e) => handleInputChange("doors", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Seats</Label>
                          <Input
                            type="number"
                            value={alternateVehicleData.seats}
                            onChange={(e) => handleInputChange("seats", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Drive Type</Label>
                          <Select
                            value={alternateVehicleData.drive_type}
                            onValueChange={(value) => handleInputChange("drive_type", value)}
                            disabled={!canEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select drive type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FWD">FWD</SelectItem>
                              <SelectItem value="RWD">RWD</SelectItem>
                              <SelectItem value="AWD">AWD</SelectItem>
                              <SelectItem value="4WD">4WD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Features (comma-separated)</Label>
                        <Textarea
                          value={alternateVehicleData.features}
                          onChange={(e) => handleInputChange("features", e.target.value)}
                          placeholder="e.g., Leather seats, Sunroof, Navigation"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Quote Price */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Quote Price *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={alternateVehicleData.quote_price}
                        onChange={(e) => handleInputChange("quote_price", e.target.value)}
                        placeholder="Enter quote price"
                        disabled={!canEdit}
                        className={errors.quote_price ? "border-red-500" : ""}
                      />
                      {errors.quote_price && (
                        <p className="text-sm text-red-600">{errors.quote_price}</p>
                      )}
                    </div>

                    {/* Quote Notes */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Quote Notes
                      </Label>
                      <Textarea
                        value={alternateVehicleData.quote_notes}
                        onChange={(e) => handleInputChange("quote_notes", e.target.value)}
                        placeholder="Add any additional notes or comments"
                        rows={4}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSaving || isSubmitting}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save as Draft"}
                  </Button>
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    disabled={isSaving || isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Quote
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Submit Quote
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this quote? Once submitted, you cannot edit it.
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Vehicle Type:</span>
                    <span>{activeTab === "sent" ? "Sent Vehicle" : "Alternate Vehicle"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Quote Price:</span>
                    <span className="text-green-600 font-bold">
                      ${parseFloat(currentData.quote_price || "0").toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Quote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TenderQuoteSideModal;
