import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Edit3, Save, X, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices, commonVehicleServices, companyServices } from "@/api/services";
import MediaViewer, { MediaItem } from "@/components/common/MediaViewer";
import VehicleMetadataSelector from "@/components/common/VehicleMetadataSelector";
import { S3Uploader, S3Config } from "@/lib/s3-client";
import { useQuery } from "@tanstack/react-query";
import FieldWithHistory from "@/components/common/FieldWithHistory";

interface VehicleOverviewSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleOverviewSection: React.FC<VehicleOverviewSectionProps> = ({
  vehicle,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    make: vehicle.make || "",
    model: vehicle.model || "",
    variant: vehicle.variant || "",
    year: vehicle.year ? vehicle.year.toString() : "",
    vin: vehicle.vin || "",
    plate_no: vehicle.plate_no || "",
    chassis_no: vehicle.chassis_no || "",
    body_style: vehicle.body_style || "",
    vehicle_category: vehicle.vehicle_category || "",
    vehicle_hero_image: vehicle.vehicle_hero_image || "", // Add this like master vehicle
  });

  // Add state for image upload
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>(vehicle.vehicle_hero_image || "");
  const [isUploading, setIsUploading] = useState(false);
  const [hasImageChanged, setHasImageChanged] = useState(false);

  // S3 upload state
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Media viewer state
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");

  // Fetch S3 configuration
  const { data: s3Config } = useQuery({
    queryKey: ["s3-config"],
    queryFn: async () => {
      const response = await companyServices.getS3Config();
      return response.data.data;
    },
  });

  // Initialize S3 uploader when config is available
  useEffect(() => {
    if (s3Config) {
      const uploader = new S3Uploader(s3Config as S3Config);
      setS3Uploader(uploader);
    }
  }, [s3Config]);

  // Sync form data with vehicle prop whenever it changes
  React.useEffect(() => {
    if (vehicle) {
      setFormData({
        make: vehicle.make || "",
        model: vehicle.model || "",
        variant: vehicle.variant || "",
        year: vehicle.year ? vehicle.year.toString() : "",
        vin: vehicle.vin || "",
        plate_no: vehicle.plate_no || "",
        chassis_no: vehicle.chassis_no || "",
        body_style: vehicle.body_style || "",
        vehicle_category: vehicle.vehicle_category || "",
        vehicle_hero_image: vehicle.vehicle_hero_image || "", // Add this like master vehicle
      });
      setHeroImagePreview(vehicle.vehicle_hero_image || "");
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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload a valid image file");
        return;
      }
      
      // Validate file size (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setHeroImage(file);
      setHasImageChanged(true);
      const previewUrl = URL.createObjectURL(file);
      setHeroImagePreview(previewUrl);
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setHeroImage(null);
    setHasImageChanged(true);
    
    // If there was a previous image, clear the preview (like master vehicle)
    if (vehicle.vehicle_hero_image) {
      setHeroImagePreview("");
      setFormData(prev => ({ ...prev, vehicle_hero_image: "" }));
    } else {
      setHeroImagePreview("");
    }
  };

  // Upload image to S3
  const uploadHeroImage = async (): Promise<string> => {
    if (!heroImage || !s3Uploader) {
      throw new Error("No image selected or S3 not configured");
    }

    setUploadingImage(true);
    try {
      const uploadResult = await s3Uploader.uploadFile(
        heroImage,
        "vehicle-hero-images"
      );
      return uploadResult.url;
    } catch (error) {
      console.error("Hero image upload error:", error);
      throw new Error("Failed to upload hero image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!s3Uploader) {
      toast.error("S3 uploader not configured");
      return;
    }

    try {
      setIsUploading(true);

      // Prepare update data
      let updateData = { 
        ...formData,
        module_section: "Pricing Overview" // Add for consistency with master vehicle
      };

      // Upload new image if changed
      if (hasImageChanged) {
        if (heroImage) {
          // Upload new image to S3
          const heroImageUrl = await uploadHeroImage();
          updateData.vehicle_hero_image = heroImageUrl;
        } else {
          // Image was removed
          updateData.vehicle_hero_image = "";
        }
      }

      // Clean data before sending to API (like master vehicle)
      const cleanedData: any = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] !== undefined &&
          updateData[key as keyof typeof updateData] !== null) {
          cleanedData[key] = updateData[key as keyof typeof updateData];
        }
      });

      // Convert year to number if it exists and is a string
      if (cleanedData.year && typeof cleanedData.year === 'string') {
        cleanedData.year = parseInt(cleanedData.year);
      }

      // Update vehicle overview data using the new pricing endpoint with activity logging
      await commonVehicleServices.updateVehiclePricing(vehicle._id, vehicle.vehicle_type, cleanedData);
      
      toast.success("Vehicle overview updated successfully");
      setIsEditing(false);
      setHasImageChanged(false);
      setHeroImage(null);
      onUpdate();
    } catch (error) {
      console.error("Error updating vehicle overview:", error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to update vehicle overview";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      make: vehicle.make || "",
      model: vehicle.model || "",
      variant: vehicle.variant || "",
      year: vehicle.year ? vehicle.year.toString() : "",
      vin: vehicle.vin || "",
      plate_no: vehicle.plate_no || "",
      chassis_no: vehicle.chassis_no || "",
      body_style: vehicle.body_style || "",
      vehicle_category: vehicle.vehicle_category || "",
      vehicle_hero_image: vehicle.vehicle_hero_image || "", // Add this like master vehicle
    });
    setHeroImage(null);
    setHeroImagePreview(vehicle.vehicle_hero_image || "");
    setHasImageChanged(false);
    setIsEditing(false);
  };

  // Prepare media items for the MediaViewer
  const mediaItems: MediaItem[] = vehicle.vehicle_hero_image ? [
    {
      id: "hero-image",
      url: vehicle.vehicle_hero_image, // Use vehicle.vehicle_hero_image like master vehicle
      type: "image",
      title: `${formData.make} ${formData.model} ${formData.year}`,
      description: "Vehicle hero image"
    }
  ] : [];

  // Function to open media viewer
  const openMediaViewer = () => {
    if (vehicle.vehicle_hero_image) { // Check vehicle.vehicle_hero_image like master vehicle
      setCurrentMediaId("hero-image");
      setIsMediaViewerOpen(true);
    }
  };

  return (
    <>
      <Accordion type="single" collapsible defaultValue="overview">
        <AccordionItem value="overview">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center justify-between w-full mr-4">
              <span>Vehicle Overview</span>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                {/* Hero Image Display - Always show current vehicle image (like master vehicle) */}
                {vehicle.vehicle_hero_image && !isEditing && (
                  <div className="mb-6 cursor-pointer" onClick={openMediaViewer}>
                    <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                      <img
                        src={vehicle.vehicle_hero_image}
                        alt="Vehicle"
                        className="w-full h-full object-cover"
                      />
                    </AspectRatio>
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-6">
                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <Label htmlFor="hero-image-upload">Vehicle Hero Image</Label>
                      <div className="mt-2 space-y-4">
                        {/* Image Upload Area */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          {heroImagePreview ? (
                            <div className="relative inline-block">
                              <img
                                src={heroImagePreview}
                                alt="Preview"
                                className="w-32 h-32 object-cover rounded-lg"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={handleRemoveImage}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : vehicle.vehicle_hero_image ? (
                            <div className="space-y-2">
                              <div className="relative inline-block">
                                <img
                                  src={vehicle.vehicle_hero_image}
                                  alt="Current"
                                  className="w-32 h-32 object-cover rounded-lg"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                  Current image
                                </p>
                              </div>
                              <div>
                                <Input
                                  id="hero-image-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                                <Label
                                  htmlFor="hero-image-upload"
                                  className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <Upload className="h-4 w-4" />
                                  Change Image
                                </Label>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Input
                                id="hero-image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                              <Label
                                htmlFor="hero-image-upload"
                                className="cursor-pointer flex flex-col items-center justify-center"
                              >
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">
                                  Click to upload hero image
                                </p>
                                <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                              </Label>
                            </>
                          )}
                        </div>

                        {/* Current image info */}
                        {vehicle.vehicle_hero_image && !hasImageChanged && (
                          <p className="text-sm text-muted-foreground">
                            Current image will be kept. Upload a new image to replace it.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Vehicle Metadata Selector */}
                    <div className="space-y-4">
                      <Label>Vehicle Details</Label>
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

                    {/* Other Vehicle Information */}
                    <div className="space-y-4">
                      <Label>Vehicle Identification</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldWithHistory
                          fieldName="vin"
                          fieldDisplayName="VIN"
                          vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                          vehicleType={vehicle?.vehicle_type || "pricing"}
                          moduleName="Pricing Overview"
                          label="VIN"
                          showHistoryIcon={!isEditing}
                        >
                          <Input
                            id="vin"
                            value={formData.vin}
                            onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                            placeholder="Enter VIN number"
                          />
                        </FieldWithHistory>
                        <FieldWithHistory
                          fieldName="plate_no"
                          fieldDisplayName="Plate Number"
                          vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                          vehicleType={vehicle?.vehicle_type || "pricing"}
                          moduleName="Pricing Overview"
                          label="Plate Number"
                          showHistoryIcon={!isEditing}
                        >
                          <Input
                            id="plate_no"
                            value={formData.plate_no}
                            onChange={(e) => setFormData({ ...formData, plate_no: e.target.value })}
                            placeholder="Enter plate number"
                          />
                        </FieldWithHistory>
                        <FieldWithHistory
                          fieldName="chassis_no"
                          fieldDisplayName="Chassis Number"
                          vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                          vehicleType={vehicle?.vehicle_type || "pricing"}
                          moduleName="Pricing Overview"
                          label="Chassis Number"
                          showHistoryIcon={!isEditing}
                        >
                          <Input
                            id="chassis_no"
                            value={formData.chassis_no}
                            onChange={(e) => setFormData({ ...formData, chassis_no: e.target.value })}
                            placeholder="Enter chassis number"
                          />
                        </FieldWithHistory>
                        <FieldWithHistory
                          fieldName="vehicle_category"
                          fieldDisplayName="Vehicle Category"
                          vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                          vehicleType={vehicle?.vehicle_type || "pricing"}
                          moduleName="Pricing Overview"
                          label="Category"
                          showHistoryIcon={!isEditing}
                        >
                          <Input
                            id="vehicle_category"
                            value={formData.vehicle_category}
                            onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                            placeholder="Enter vehicle category"
                          />
                        </FieldWithHistory>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSave}
                        disabled={isUploading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isUploading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="grid grid-cols-3 gap-4">
                    <FieldWithHistory
                      fieldName="make"
                      fieldDisplayName="Make"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Make"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.make || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="model"
                      fieldDisplayName="Model"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Model"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.model || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="variant"
                      fieldDisplayName="Variant"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Variant"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.variant || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="year"
                      fieldDisplayName="Year"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Year"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.year || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="body_style"
                      fieldDisplayName="Body Style"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Body Style"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.body_style || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="vin"
                      fieldDisplayName="VIN"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="VIN"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.vin || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="plate_no"
                      fieldDisplayName="Plate Number"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Plate Number"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.plate_no || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="chassis_no"
                      fieldDisplayName="Chassis Number"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Chassis Number"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.chassis_no || "—"}</p>
                    </FieldWithHistory>
                    <FieldWithHistory
                      fieldName="vehicle_category"
                      fieldDisplayName="Vehicle Category"
                      vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                      vehicleType={vehicle?.vehicle_type || "pricing"}
                      moduleName="Pricing Overview"
                      label="Category"
                    >
                      <p className="text-sm text-muted-foreground">{vehicle.vehicle_category || "—"}</p>
                    </FieldWithHistory>
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Media Viewer */}
      <MediaViewer
        media={mediaItems}
        currentMediaId={currentMediaId}
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
      />
    </>
  );
};

export default VehicleOverviewSection;