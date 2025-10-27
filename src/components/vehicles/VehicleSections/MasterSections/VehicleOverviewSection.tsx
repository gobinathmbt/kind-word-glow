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
import { masterVehicleServices, vehicleServices } from "@/api/services";
import MediaViewer, { MediaItem } from "@/components/common/MediaViewer";
import VehicleMetadataSelector from "@/components/common/VehicleMetadataSelector";
import { S3Uploader, S3Config } from "@/lib/s3-client";
import { useAuth } from "@/auth/AuthContext";

interface VehicleOverviewSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

const VehicleOverviewSection: React.FC<VehicleOverviewSectionProps> = ({
  vehicle,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Use local state that syncs with the vehicle prop
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    variant: "",
    year: "",
    vin: "",
    plate_no: "",
    chassis_no: "",
    body_style: "",
    vehicle_category: "",
    vehicle_hero_image: "",
  });

  // S3 upload state
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>("");
  const [hasImageChanged, setHasImageChanged] = useState(false);

  const { completeUser } = useAuth();

  // Media viewer state
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");

  // Sync form data with vehicle prop whenever it changes
  useEffect(() => {
    if (vehicle) {
      setFormData({
        make: vehicle.make || "",
        model: vehicle.model || "",
        variant: vehicle.variant || "",
        year: vehicle.year || "",
        vin: vehicle.vin || "",
        plate_no: vehicle.plate_no || "",
        chassis_no: vehicle.chassis_no || "",
        body_style: vehicle.body_style || "",
        vehicle_category: vehicle.vehicle_category || "",
        vehicle_hero_image: vehicle.vehicle_hero_image || "",
      });
      setHeroImagePreview(vehicle.vehicle_hero_image || "");
    }
  }, [vehicle]);

  // Load S3 configuration
  useEffect(() => {
    const loadS3Config = async () => {
      try {
        const config = completeUser?.company_id?.s3_config;
        if (config && config.bucket && config.access_key) {
          const s3ConfigMapped: S3Config = {
            region: config.region,
            bucket: config.bucket,
            access_key: config.access_key,
            secret_key: config.secret_key,
            url: config.url,
          };
          setS3Uploader(new S3Uploader(s3ConfigMapped));
        } else {
          console.warn("S3 configuration not found");
        }
      } catch (error) {
        console.error("S3 config error:", error);
        toast.error("Failed to load S3 configuration");
      }
    };

    if (completeUser) {
      loadS3Config();
    }
  }, [completeUser]);

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
      // Validation
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size should be less than 10MB");
        return;
      }

      setHeroImage(file);
      setHasImageChanged(true);
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setHeroImagePreview(previewUrl);
    }
  };

  // Remove uploaded image
  const removeHeroImage = () => {
    setHeroImage(null);
    setHasImageChanged(true);
    
    // If there was a previous image, clear the preview
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

    setIsLoading(true);

    try {
      let updateData = { ...formData };

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

      // Clean data before sending to API
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

      console.log("Updating vehicle with data:", cleanedData);

      // Update vehicle data in database
      await masterVehicleServices.updateMasterVehicle(vehicle._id, cleanedData);
      
      toast.success("Vehicle overview updated successfully");
      
      // Reset editing state
      setIsEditing(false);
      setHasImageChanged(false);
      setHeroImage(null);
      
      // Force refresh parent data - this is crucial
      onUpdate();
      
    } catch (error: any) {
      console.error("Update error:", error);
      
      // Enhanced error logging
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          "Failed to update vehicle overview";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current vehicle data (which might have been updated)
    setFormData({
      make: vehicle.make || "",
      model: vehicle.model || "",
      variant: vehicle.variant || "",
      year: vehicle.year || "",
      vin: vehicle.vin || "",
      plate_no: vehicle.plate_no || "",
      chassis_no: vehicle.chassis_no || "",
      body_style: vehicle.body_style || "",
      vehicle_category: vehicle.vehicle_category || "",
      vehicle_hero_image: vehicle.vehicle_hero_image || "",
    });
    
    // Reset image state
    setHeroImage(null);
    setHeroImagePreview(vehicle.vehicle_hero_image || "");
    setHasImageChanged(false);
    setIsEditing(false);
  };

  // Prepare media items for the MediaViewer
  const mediaItems: MediaItem[] = heroImagePreview ? [
    {
      id: "hero-image",
      url: heroImagePreview,
      type: "image",
      title: `${formData.make} ${formData.model} ${formData.year}`,
      description: "Vehicle hero image"
    }
  ] : [];

  // Function to open media viewer
  const openMediaViewer = () => {
    if (heroImagePreview) {
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
                {/* Hero Image Display - Always show current vehicle image */}
                {vehicle.vehicle_hero_image && !isEditing && (
                  <div className="mb-6 cursor-pointer" onClick={openMediaViewer}>
                    <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                      <img
                        src={vehicle.vehicle_hero_image}
                        alt="Vehicle"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Handle broken images gracefully
                          console.error("Failed to load vehicle image");
                        }}
                      />
                    </AspectRatio>
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-4">
                    {/* Image Upload Section */}
                    <div className="mb-4">
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
                                onClick={removeHeroImage}
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
                                <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vin">VIN</Label>
                        <Input
                          id="vin"
                          value={formData.vin}
                          onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                          placeholder="Enter VIN"
                        />
                      </div>
                      <div>
                        <Label htmlFor="plate_no">Plate Number</Label>
                        <Input
                          id="plate_no"
                          value={formData.plate_no}
                          onChange={(e) => setFormData({ ...formData, plate_no: e.target.value })}
                          placeholder="Enter plate number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="chassis_no">Chassis Number</Label>
                        <Input
                          id="chassis_no"
                          value={formData.chassis_no}
                          onChange={(e) => setFormData({ ...formData, chassis_no: e.target.value })}
                          placeholder="Enter chassis number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicle_category">Category</Label>
                        <Input
                          id="vehicle_category"
                          value={formData.vehicle_category}
                          onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                          placeholder="Enter category"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={isLoading || uploadingImage}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSave}
                        disabled={isLoading || uploadingImage}
                      >
                        {(isLoading || uploadingImage) ? (
                          <>
                            <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {uploadingImage ? "Uploading..." : "Saving..."}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display current vehicle data (always fresh from props)
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Make</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.make || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Model</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.model || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Variant</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.variant || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Year</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.year || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Body Style</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.body_style || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">VIN</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.vin || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Plate Number</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.plate_no || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Chassis Number</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.chassis_no || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Category</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.vehicle_category || "—"}</p>
                    </div>
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