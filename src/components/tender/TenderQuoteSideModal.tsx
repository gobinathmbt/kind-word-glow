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
  const [selectedAlternateIndex, setSelectedAlternateIndex] = useState<number>(0);

  // Sent vehicle form data
  const [sentVehicleData, setSentVehicleData] = useState<any>({
    vehicle_id: null,
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

  // Alternate vehicle form data (array to support multiple alternates)
  const [alternateVehiclesData, setAlternateVehiclesData] = useState<any[]>([{
    vehicle_id: null,
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
  }]);

  const [errors, setErrors] = useState<any>({});

  // Initialize form data when tender changes
  useEffect(() => {
    if (tender && open) {
      console.log('🔄 Initializing form with tender data:', tender);
      
      // Fetch existing quotes for this tender
      const fetchExistingQuotes = async () => {
        try {
          // Assuming tender object has the vehicle data already loaded
          // If not, we need to fetch it via API
          
          // Initialize sent vehicle with tender's basic vehicle info
          const sentVehicleInitial = {
            vehicle_id: tender.vehicle_id || tender._id, // Use the sent vehicle ID if available
            make: tender.basic_vehicle_info?.make || "",
            model: tender.basic_vehicle_info?.model || "",
            year: tender.basic_vehicle_info?.year || "",
            variant: tender.basic_vehicle_info?.variant || "",
            body_style: tender.basic_vehicle_info?.body_style || "",
            color: tender.basic_vehicle_info?.color || "",
            registration_number: tender.registration_number || "",
            vin: tender.vin || "",
            odometer_reading: tender.odometer_reading || "",
            engine_type: tender.engine_details?.engine_type || "",
            engine_capacity: tender.engine_details?.engine_capacity || "",
            fuel_type: tender.engine_details?.fuel_type || "",
            transmission: tender.engine_details?.transmission || "",
            doors: tender.specifications?.doors || "",
            seats: tender.specifications?.seats || "",
            drive_type: tender.specifications?.drive_type || "",
            features: tender.specifications?.features?.join(", ") || "",
            quote_price: tender.quote_price || "",
            quote_notes: tender.quote_notes || "",
          };
          
          console.log('📝 Sent vehicle initialized:', sentVehicleInitial);
          setSentVehicleData(sentVehicleInitial);

          // Check if tender has alternate vehicles loaded
          if (tender.alternate_vehicles && tender.alternate_vehicles.length > 0) {
            const alternates = tender.alternate_vehicles.map((av: any) => ({
              vehicle_id: av._id,
              make: av.make || "",
              model: av.model || "",
              year: av.year || "",
              variant: av.variant || "",
              body_style: av.body_style || "",
              color: av.color || "",
              registration_number: av.registration_number || "",
              vin: av.vin || "",
              odometer_reading: av.odometer_reading || "",
              engine_type: av.engine_details?.engine_type || "",
              engine_capacity: av.engine_details?.engine_capacity || "",
              fuel_type: av.engine_details?.fuel_type || "",
              transmission: av.engine_details?.transmission || "",
              doors: av.specifications?.doors || "",
              seats: av.specifications?.seats || "",
              drive_type: av.specifications?.drive_type || "",
              features: av.specifications?.features?.join(", ") || "",
              quote_price: av.quote_price || "",
              quote_notes: av.quote_notes || "",
            }));
            console.log('📝 Alternate vehicles loaded:', alternates);
            setAlternateVehiclesData(alternates);
          } else {
            // Reset to single empty alternate vehicle
            console.log('📝 No alternate vehicles, initializing empty array');
            setAlternateVehiclesData([{
              vehicle_id: null,
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
            }]);
          }

          setErrors({});
          setActiveTab("sent");
          setSelectedAlternateIndex(0);
        } catch (error) {
          console.error("Error loading quotes:", error);
        } finally {
        }
      };

      fetchExistingQuotes();
    }
  }, [tender, open]);

  const isExpired = () => {
    return new Date(tender.tender_expiry_time) < new Date();
  };

  const validateForm = (isDraft: boolean = false) => {
    console.log('🔍 Validating form...');
    console.log('Sent vehicle data:', sentVehicleData);
    console.log('Alternate vehicles data:', alternateVehiclesData);
    console.log('Is draft:', isDraft);
    
    const newErrors: any = {};

    // Validate sent vehicle
    if (!isDraft) {
      if (!sentVehicleData.quote_price || parseFloat(sentVehicleData.quote_price) <= 0) {
        newErrors.sent_quote_price = "Sent vehicle quote price is required and must be greater than 0";
      }
    }

    // Validate all alternate vehicles - only validate if they have ANY data entered
    alternateVehiclesData.forEach((alt, idx) => {
      // Check if this alternate vehicle has any meaningful data
      const hasAnyData = alt.make || alt.model || alt.year || alt.quote_price || 
                         alt.color || alt.registration_number || alt.vin;
      
      if (hasAnyData) {
        // If any field is filled, require make, model, year
        if (!alt.make) newErrors[`alt_${idx}_make`] = "Make is required";
        if (!alt.model) newErrors[`alt_${idx}_model`] = "Model is required";
        if (!alt.year) newErrors[`alt_${idx}_year`] = "Year is required";
        
        // Quote price is required for submission (not draft)
        if (!isDraft) {
          if (!alt.quote_price || parseFloat(alt.quote_price) <= 0) {
            newErrors[`alt_${idx}_quote_price`] = "Quote price is required and must be greater than 0";
          }
        }
      }
    });

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildUnifiedPayload = (isDraft: boolean = false) => {
    const buildVehiclePayload = (data: any, vehicleType: string) => {
      const engineDetails = {
        engine_type: data.engine_type || undefined,
        engine_capacity: data.engine_capacity || undefined,
        fuel_type: data.fuel_type || undefined,
        transmission: data.transmission || undefined,
      };

      const specifications = {
        doors: data.doors ? parseInt(data.doors) : undefined,
        seats: data.seats ? parseInt(data.seats) : undefined,
        drive_type: data.drive_type || undefined,
        features: data.features ? data.features.split(",").map((f: string) => f.trim()).filter(Boolean) : [],
      };

      return {
        vehicle_type: vehicleType,
        vehicle_id: data.vehicle_id || undefined,
        make: data.make,
        model: data.model,
        year: data.year,
        variant: data.variant || undefined,
        body_style: data.body_style || undefined,
        color: data.color || undefined,
        registration_number: data.registration_number || undefined,
        vin: data.vin || undefined,
        odometer_reading: data.odometer_reading ? parseInt(data.odometer_reading) : undefined,
        engine_details: engineDetails,
        specifications: specifications,
        quote_price: data.quote_price ? parseFloat(data.quote_price) : undefined,
        quote_notes: data.quote_notes || undefined,
      };
    };

    // Filter out empty alternate vehicles (only include if they have make, model, or year)
    const validAlternates = alternateVehiclesData.filter(alt => 
      alt.make || alt.model || alt.year || alt.quote_price || 
      alt.color || alt.registration_number || alt.vin
    );

    console.log('📦 Building payload with valid alternates:', validAlternates.length);

    // Build vehicles array with sent vehicle + valid alternates only
    const vehicles = [
      buildVehiclePayload(sentVehicleData, "sent_vehicle"),
      ...validAlternates.map((alt) => buildVehiclePayload(alt, "alternate_vehicle"))
    ];

    return {
      is_draft: isDraft,
      vehicles: vehicles,
    };
  };

  const handleSaveDraft = async () => {
    if (isExpired()) {
      toast.error("This tender has expired. You cannot save a draft.");
      return;
    }

    // Validate alternate vehicles before saving draft
    const draftErrors: string[] = [];
    
    alternateVehiclesData.forEach((alt, idx) => {
      // Check if this alternate vehicle has any meaningful data
      const hasAnyData = alt.make || alt.model || alt.year || alt.quote_price || 
                         alt.color || alt.registration_number || alt.vin || 
                         alt.odometer_reading || alt.engine_type || alt.fuel_type;
      
      if (hasAnyData) {
        // If any field is filled, require make, model, year
        const vehicleLabel = `Alternate Vehicle ${idx + 1}`;
        if (!alt.make) draftErrors.push(`❌ ${vehicleLabel}: Make is required`);
        if (!alt.model) draftErrors.push(`❌ ${vehicleLabel}: Model is required`);
        if (!alt.year) draftErrors.push(`❌ ${vehicleLabel}: Year is required`);
      }
    });

    // Show validation errors if any
    if (draftErrors.length > 0) {
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">Cannot save draft - Please fix the following:</div>
          <div className="text-sm space-y-1">
            {draftErrors.map((msg, idx) => (
              <div key={idx}>{msg}</div>
            ))}
          </div>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    setIsSaving(true);
    let payload: any = null;

    try {
      payload = buildUnifiedPayload(true);

      const response = await tenderDealershipAuthService.submitQuote(tender.tender_id, payload);
      
      // Update vehicle IDs from response if they were new
      if (response.data?.data) {
        const savedVehicles = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        
        savedVehicles.forEach((vehicle: any) => {
          if (vehicle.vehicle_type === "sent_vehicle" && !sentVehicleData.vehicle_id && vehicle._id) {
            setSentVehicleData((prev) => ({
              ...prev,
              vehicle_id: vehicle._id
            }));
          } else if (vehicle.vehicle_type === "alternate_vehicle") {
            const altIndex = alternateVehiclesData.findIndex((alt) => alt === vehicle);
            if (altIndex !== -1 && !alternateVehiclesData[altIndex].vehicle_id && vehicle._id) {
              setAlternateVehiclesData((prev) => {
                const updated = [...prev];
                updated[altIndex] = {
                  ...updated[altIndex],
                  vehicle_id: vehicle._id
                };
                return updated;
              });
            }
          }
        });
      }
      
      toast.success("All quotes saved as draft successfully");
    } catch (error: any) {
      console.error('❌ Error saving draft:', error);
      
      const errorMsg = error.response?.data?.message || "Failed to save draft";
      
      // Check if error response contains specific field errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Build detailed error messages with vehicle identification
        const errorMessages: string[] = [];
        
        error.response.data.errors.forEach((err: any) => {
          const field = err.field || '';
          let vehicleLabel = '';
          
          // Identify which vehicle has the error
          if (field.includes('vehicle_id') || field.includes('make') || field.includes('model')) {
            // Try to determine if it's sent vehicle or alternate
            const vehicleIndex = payload.vehicles?.findIndex((v: any) => {
              return field.includes(v.vehicle_id) || 
                     (err.message && err.message.includes(v.make));
            });
            
            if (vehicleIndex === 0) {
              vehicleLabel = '🚗 Sent Vehicle: ';
            } else if (vehicleIndex > 0) {
              vehicleLabel = `🔄 Alternate Vehicle ${vehicleIndex}: `;
            }
          }
          
          errorMessages.push(`${vehicleLabel}${err.message || err}`);
        });
        
        toast.error(
          <div className="space-y-1">
            <div className="font-semibold">Save failed - Please fix the following:</div>
            <div className="text-sm space-y-1">
              {errorMessages.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
            </div>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error(errorMsg);
      }
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
      // Generate detailed error message
      const errorMessages: string[] = [];
      
      // Check sent vehicle
      if (!sentVehicleData.quote_price || parseFloat(sentVehicleData.quote_price) <= 0) {
        errorMessages.push("❌ Sent Vehicle: Quote price is required and must be greater than 0");
      }
      
      // Check alternate vehicles
      alternateVehiclesData.forEach((alt, idx) => {
        if (alt.make || alt.model || alt.year) {
          const vehicleInfo = `Alternate Vehicle ${idx + 1}`;
          if (!alt.make) errorMessages.push(`❌ ${vehicleInfo}: Make is required`);
          if (!alt.model) errorMessages.push(`❌ ${vehicleInfo}: Model is required`);
          if (!alt.year) errorMessages.push(`❌ ${vehicleInfo}: Year is required`);
          if (!alt.quote_price || parseFloat(alt.quote_price) <= 0) {
            errorMessages.push(`❌ ${vehicleInfo}: Quote price is required and must be greater than 0`);
          }
        }
      });

      // Show detailed error
      if (errorMessages.length > 0) {
        toast.error(
          <div className="space-y-1">
            <div className="font-semibold">Please fix the following errors:</div>
            <div className="text-sm space-y-1">
              {errorMessages.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
            </div>
          </div>
        );
      } else {
        toast.error("Please fill in all required fields");
      }
      return;
    }

    setIsSubmitting(true);
    let payload: any = null;

    try {
      console.log('🚀 Submitting quote to backend...');
      payload = buildUnifiedPayload(false);
      console.log('📦 Payload:', payload);

      const response = await tenderDealershipAuthService.submitQuote(tender.tender_id, payload);
      console.log('✅ Response received from backend:', response);
      
      // Update vehicle IDs from response if they were new
      if (response.data?.data) {
        const savedVehicles = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        
        savedVehicles.forEach((vehicle: any) => {
          if (vehicle.vehicle_type === "sent_vehicle" && !sentVehicleData.vehicle_id && vehicle._id) {
            setSentVehicleData((prev) => ({
              ...prev,
              vehicle_id: vehicle._id
            }));
          } else if (vehicle.vehicle_type === "alternate_vehicle") {
            const altIndex = alternateVehiclesData.findIndex((alt) => alt === vehicle);
            if (altIndex !== -1 && !alternateVehiclesData[altIndex].vehicle_id && vehicle._id) {
              setAlternateVehiclesData((prev) => {
                const updated = [...prev];
                updated[altIndex] = {
                  ...updated[altIndex],
                  vehicle_id: vehicle._id
                };
                return updated;
              });
            }
          }
        });
      }
      
      console.log('🎉 Showing success toast');
      toast.success("All quotes submitted successfully");
      setShowSubmitDialog(false);
      onClose();
    } catch (error: any) {
      console.error('❌ Error submitting quote:', error);
      console.error('Error response:', error.response);
      
      const errorMsg = error.response?.data?.message || "Failed to submit quotes";
      
      // Check if error response contains specific field errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Build detailed error messages with vehicle identification
        const errorMessages: string[] = [];
        
        error.response.data.errors.forEach((err: any) => {
          const field = err.field || '';
          let vehicleLabel = '';
          
          // Identify which vehicle has the error
          if (field.includes('vehicle_id') || field.includes('make') || field.includes('model')) {
            // Try to determine if it's sent vehicle or alternate
            const vehicleIndex = payload.vehicles?.findIndex((v: any) => {
              return field.includes(v.vehicle_id) || 
                     (err.message && err.message.includes(v.make));
            });
            
            if (vehicleIndex === 0) {
              vehicleLabel = '🚗 Sent Vehicle: ';
            } else if (vehicleIndex > 0) {
              vehicleLabel = `🔄 Alternate Vehicle ${vehicleIndex}: `;
            }
          }
          
          errorMessages.push(`${vehicleLabel}${err.message || err}`);
        });
        
        toast.error(
          <div className="space-y-1">
            <div className="font-semibold">Submission failed - Please fix the following:</div>
            <div className="text-sm space-y-1">
              {errorMessages.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
            </div>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (activeTab === "sent") {
      setSentVehicleData({ ...sentVehicleData, [field]: value });
    } else {
      const updatedAlternates = [...alternateVehiclesData];
      updatedAlternates[selectedAlternateIndex] = {
        ...updatedAlternates[selectedAlternateIndex],
        [field]: value
      };
      setAlternateVehiclesData(updatedAlternates);
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleAddAlternateVehicle = () => {
    setAlternateVehiclesData([...alternateVehiclesData, {
      vehicle_id: null,
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
    }]);
    setSelectedAlternateIndex(alternateVehiclesData.length);
  };

  const handleRemoveAlternateVehicle = (index: number) => {
    if (alternateVehiclesData.length === 1) {
      toast.error("You must have at least one alternate vehicle slot");
      return;
    }
    
    // Remove the vehicle at the specified index
    const updatedAlternates = alternateVehiclesData.filter((_, i) => i !== index);
    setAlternateVehiclesData(updatedAlternates);
    
    // Adjust selected index if needed
    if (selectedAlternateIndex === index) {
      // If removing the currently selected vehicle, select the previous one (or 0 if removing first)
      setSelectedAlternateIndex(Math.max(0, index - 1));
    } else if (selectedAlternateIndex > index) {
      // If removing a vehicle before the selected one, adjust the index
      setSelectedAlternateIndex(selectedAlternateIndex - 1);
    }
    // If removing a vehicle after the selected one, no adjustment needed
    
    toast.success(`Alternate Vehicle ${index + 1} removed`);
  };

  const currentData = activeTab === "sent" ? sentVehicleData : alternateVehiclesData[selectedAlternateIndex];
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
                    {/* Alternate Vehicle Selector */}
                    {alternateVehiclesData.length > 1 && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">Alternate Vehicle:</Label>
                        <Select
                          value={selectedAlternateIndex.toString()}
                          onValueChange={(value) => setSelectedAlternateIndex(parseInt(value))}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {alternateVehiclesData.map((_, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                Alternate {index + 1}
                                {alternateVehiclesData[index].vehicle_id && " (Saved)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddAlternateVehicle}
                          disabled={!canEdit}
                        >
                          + Add Another
                        </Button>
                        {alternateVehiclesData.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAlternateVehicle(selectedAlternateIndex)}
                            disabled={!canEdit}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}

                    {alternateVehiclesData.length === 1 && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddAlternateVehicle}
                          disabled={!canEdit}
                        >
                          + Add Another Alternate Vehicle
                        </Button>
                      </div>
                    )}

                    {/* Vehicle Metadata Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Vehicle Details *</Label>
                      <VehicleMetadataSelector
                        selectedMake={currentData.make}
                        selectedModel={currentData.model}
                        selectedVariant={currentData.variant}
                        selectedYear={currentData.year}
                        selectedBody={currentData.body_style}
                        onMakeChange={(value) =>
                          setAlternateVehiclesData((prev) => {
                            const updated = [...prev];
                            updated[selectedAlternateIndex] = {
                              ...updated[selectedAlternateIndex],
                              make: value,
                            };
                            return updated;
                          })
                        }
                        onModelChange={(value) =>
                          setAlternateVehiclesData((prev) => {
                            const updated = [...prev];
                            updated[selectedAlternateIndex] = {
                              ...updated[selectedAlternateIndex],
                              model: value,
                            };
                            return updated;
                          })
                        }
                        onYearChange={(value) =>
                          setAlternateVehiclesData((prev) => {
                            const updated = [...prev];
                            updated[selectedAlternateIndex] = {
                              ...updated[selectedAlternateIndex],
                              year: value,
                            };
                            return updated;
                          })
                        }
                        onVariantChange={(value) =>
                          setAlternateVehiclesData((prev) => {
                            const updated = [...prev];
                            updated[selectedAlternateIndex] = {
                              ...updated[selectedAlternateIndex],
                              variant: value,
                            };
                            return updated;
                          })
                        }
                        onBodyChange={(value) =>
                          setAlternateVehiclesData((prev) => {
                            const updated = [...prev];
                            updated[selectedAlternateIndex] = {
                              ...updated[selectedAlternateIndex],
                              body_style: value,
                            };
                            return updated;
                          })
                        }
                        layout="grid-2"
                        showMakePlus={false}
                        showModelPlus={false}
                        showVariantPlus={false}
                        showYearPlus={false}
                        showBodyPlus={false}
                        disabled={!canEdit}
                        makeProps={{ required: true }}
                        modelProps={{ required: true }}
                        yearProps={{ required: true }}
                        errors={{
                          make: errors.make,
                          model: errors.model,
                          year: errors.year,
                        }}
                        onErrorsChange={(newErrors: any) => {
                          setErrors((prev: any) => ({
                            ...prev,
                            make: newErrors.make,
                            model: newErrors.model,
                            year: newErrors.year,
                          }));
                        }}
                      />
                    </div>

                    <Separator />

                    {/* Additional Vehicle Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Input
                          value={currentData.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Registration Number</Label>
                        <Input
                          value={currentData.registration_number}
                          onChange={(e) => handleInputChange("registration_number", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>VIN</Label>
                        <Input
                          value={currentData.vin}
                          onChange={(e) => handleInputChange("vin", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Odometer Reading (km)</Label>
                        <Input
                          type="number"
                          value={currentData.odometer_reading}
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
                            value={currentData.engine_type}
                            onChange={(e) => handleInputChange("engine_type", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Engine Capacity</Label>
                          <Input
                            value={currentData.engine_capacity}
                            onChange={(e) => handleInputChange("engine_capacity", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fuel Type</Label>
                          <Select
                            value={currentData.fuel_type}
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
                            value={currentData.transmission}
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
                            value={currentData.doors}
                            onChange={(e) => handleInputChange("doors", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Seats</Label>
                          <Input
                            type="number"
                            value={currentData.seats}
                            onChange={(e) => handleInputChange("seats", e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Drive Type</Label>
                          <Select
                            value={currentData.drive_type}
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
                          value={currentData.features}
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
                        value={currentData.quote_price}
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
                        value={currentData.quote_notes}
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
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Submit All Quotes
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit all quotes? Once submitted, you cannot edit them.
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {/* Sent Vehicle */}
                <div className="p-3 bg-muted rounded-lg border-l-4 border-green-600">
                  <div className="text-sm space-y-2">
                    <div className="font-semibold text-green-700">Sent Vehicle</div>
                    <div className="text-xs text-muted-foreground">
                      {sentVehicleData.make} {sentVehicleData.model} {sentVehicleData.year}
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-muted">
                      <span className="font-medium">Quote Price:</span>
                      <span className="text-green-600 font-bold">
                        ${parseFloat(sentVehicleData.quote_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alternate Vehicles */}
                {alternateVehiclesData.map((alt, idx) => (
                  (alt.make || alt.model || alt.year) && (
                    <div key={idx} className="p-3 bg-muted rounded-lg border-l-4 border-blue-600">
                      <div className="text-sm space-y-2">
                        <div className="font-semibold text-blue-700">Alternate Vehicle {idx + 1}</div>
                        <div className="text-xs text-muted-foreground">
                          {alt.make} {alt.model} {alt.year}
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-muted">
                          <span className="font-medium">Quote Price:</span>
                          <span className="text-green-600 font-bold">
                            ${parseFloat(alt.quote_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ))}

                {/* Total */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-900">Total Quotes:</span>
                    <span className="text-lg font-bold text-green-700">
                      {1 + alternateVehiclesData.filter(alt => alt.make || alt.model || alt.year).length} vehicle(s)
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
              {isSubmitting ? "Submitting..." : "Submit All Quotes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TenderQuoteSideModal;
