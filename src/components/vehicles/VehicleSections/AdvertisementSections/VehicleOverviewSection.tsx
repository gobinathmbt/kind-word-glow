import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Edit3, Save, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { adPublishingServices, vehicleServices } from "@/api/services";
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
  const [formData, setFormData] = useState({
    make: vehicle.make || "",
    model: vehicle.model || "",
    variant: vehicle.variant || "",
    year: vehicle.year || "",
    vin: vehicle.vin || "",
    plate_no: vehicle.plate_no || "",
    chassis_no: vehicle.chassis_no || "",
    body_style: vehicle.body_style || "",
    vehicle_category: vehicle.vehicle_category || "",
  });

  // Image upload states
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>(vehicle.vehicle_hero_image || "");
  const [isUploading, setIsUploading] = useState(false);
  const [hasImageChanged, setHasImageChanged] = useState(false);

  // S3 uploader state
  const { completeUser } = useAuth();
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);

  // Media viewer state
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");

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
          toast.error("S3 configuration not available");
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
      // Validation checks: file type (image/*) and size (<10MB)
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size should be less than 10MB");
        return;
      }

      // Local State Management
      setHeroImage(file);
      setHasImageChanged(true);
      
      // Preview URL generated using URL.createObjectURL()
      const previewUrl = URL.createObjectURL(file);
      setHeroImagePreview(previewUrl);
    }
  };

  // Remove uploaded image
  const removeHeroImage = () => {
    setHeroImage(null);
    setHasImageChanged(true);
    setHeroImagePreview("");
  };

  // Upload image to S3
  const uploadHeroImage = async (): Promise<string> => {
    if (!heroImage || !s3Uploader) {
      throw new Error("No image selected or S3 not configured");
    }

    try {
      const uploadResult = await s3Uploader.uploadFile(
        heroImage,
        "vehicle-hero-images"
      );
      return uploadResult.url; // This will return the S3 URL like: https://vb-feedsdev.s3.us-east-1.amazonaws.com/.../vehicle-hero-images/...jpg
    } catch (error) {
      console.error("Hero image upload error:", error);
      throw new Error("Failed to upload hero image to S3");
    }
  };

  const handleSave = async () => {
    if (!s3Uploader && hasImageChanged && heroImage) {
      toast.error("S3 uploader not configured");
      return;
    }

    try {
      setIsUploading(true);
      
      // Prepare update data
      const updateData: any = {
        ...formData,
        vehicle_type: vehicle.vehicle_type
      };

      // S3 Upload (on Save) - Only if image changed and new image selected
      if (hasImageChanged) {
        if (heroImage) {
          // Upload new image to S3 and get proper S3 URL
          const heroImageUrl = await uploadHeroImage();
          updateData.vehicle_hero_image = heroImageUrl;
        } else {
          // Image was removed
          updateData.vehicle_hero_image = "";
        }
      }

      // Data Update - Update vehicle data in database
      const updateResponse = await adPublishingServices.updateAdVehicle(vehicle._id, updateData);
      
      toast.success("Vehicle overview updated successfully");
      
      // State Cleanup
      setIsEditing(false);
      setHasImageChanged(false);
      setHeroImage(null);
      
      // Call onUpdate to refresh parent component data
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error: any) {
      console.error("Error updating vehicle overview:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
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
      year: vehicle.year || "",
      vin: vehicle.vin || "",
      plate_no: vehicle.plate_no || "",
      chassis_no: vehicle.chassis_no || "",
      body_style: vehicle.body_style || "",
      vehicle_category: vehicle.vehicle_category || "",
    });
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
                {/* Hero Image */}
                {heroImagePreview && (
                  <div className="mb-6 cursor-pointer" onClick={openMediaViewer}>
                    <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                      <img
                        src={heroImagePreview}
                        alt="Vehicle"
                        className="w-full h-full object-cover"
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
                                <X className="h-3 w-3" />
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
                        />
                      </div>
                      <div>
                        <Label htmlFor="plate_no">Plate Number</Label>
                        <Input
                          id="plate_no"
                          value={formData.plate_no}
                          onChange={(e) => setFormData({ ...formData, plate_no: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="chassis_no">Chassis Number</Label>
                        <Input
                          id="chassis_no"
                          value={formData.chassis_no}
                          onChange={(e) => setFormData({ ...formData, chassis_no: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicle_category">Category</Label>
                        <Input
                          id="vehicle_category"
                          value={formData.vehicle_category}
                          onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isUploading}>
                        {isUploading ? (
                          <>
                            <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Uploading...
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Make</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.make}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Model</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Variant</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.variant}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Year</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Body Style</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.body_style}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">VIN</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.vin}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Plate Number</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.plate_no}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Chassis Number</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.chassis_no}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Category</Label>
                      <p className="text-sm text-muted-foreground">{vehicle.vehicle_category}</p>
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