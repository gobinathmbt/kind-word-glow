import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  vehicleServices,
  dealershipServices,
  companyServices,
} from "@/api/services";
import VehicleMetadataSelector from "@/components/common/VehicleMetadataSelector";
import { useQuery } from "@tanstack/react-query";
import { S3Uploader, S3Config } from "@/lib/s3-client";
import { useAuth } from "@/auth/AuthContext";

interface CreateVehicleTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicleType: "inspection" | "tradein" | "advertisement" | "master";
}

const CreateVehicleTradeModal = ({
  isOpen,
  onClose,
  onSuccess,
  vehicleType,
}: CreateVehicleTradeModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date>();
  const [regoExpiryDate, setRegoExpiryDate] = useState<Date>();
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState<Date>();
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>(
    {}
  );

  const { completeUser } = useAuth();

  // State for vehicle metadata
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedBody, setSelectedBody] = useState("");

  const [formData, setFormData] = useState({
    dealership_id: "",
    status: "",
    purchase_type: "",
    make: "",
    year: "",
    model: "",
    variant: "",
    body_style: "",
    vin: "",
    vehicle_type: vehicleType,
    plate_no: "",
    purchase_notes: "",
    vehicle_hero_image: "",
    odometer_reading: "",
    purchase_price: "",
  });

  // Fetch dealerships data
  const { data: dealerships } = useQuery({
    queryKey: ["dealerships-dropdown", completeUser?.is_primary_admin],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();

      if (!completeUser?.is_primary_admin && completeUser?.dealership_ids) {
        const userDealershipIds = completeUser.dealership_ids.map((d: any) =>
          typeof d === "object" ? d._id : d
        );
        return response.data.data.filter((dealership: any) =>
          userDealershipIds.includes(dealership._id)
        );
      }

      return response.data.data;
    },
    enabled: !!completeUser,
  });

  const { data: vehicleStatus } = useQuery({
    queryKey: ["vehicle-status"],
    queryFn: async () => {
      const response = await companyServices.getCompanyMasterdropdownvalues({
        dropdown_name: ["vehicle_status"],
      });
      return response.data?.data[0]?.values || [];
    },
  });

  const { data: vehiclePurchaseType } = useQuery({
    queryKey: ["vehicle-purchase-type"],
    queryFn: async () => {
      const response = await companyServices.getCompanyMasterdropdownvalues({
        dropdown_name: ["vehicle_purchase_type"],
      });
      return response.data?.data[0]?.values || [];
    },
  });

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

          setS3Config(s3ConfigMapped);
          setS3Uploader(new S3Uploader(s3ConfigMapped));
        } else {
          toast.error(
            "S3 configuration not found. Please configure S3 settings first."
          );
        }
      } catch (error) {
        toast.error("Failed to load S3 configuration");
        console.error("S3 config error:", error);
      }
    };

    if (completeUser) {
      loadS3Config();
    }
  }, [completeUser]);

  // Handle hero image selection
  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size should be less than 10MB");
        return;
      }

      setHeroImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setHeroImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove hero image
  const removeHeroImage = () => {
    setHeroImage(null);
    setHeroImagePreview("");
    setFormData((prev) => ({ ...prev, vehicle_hero_image: "" }));
  };

  // Upload hero image to S3
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when field is filled
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      make: selectedMake,
      model: selectedModel,
      variant: selectedVariant,
      year: selectedYear,
      body_style: selectedBody,
    }));
  }, [
    selectedMake,
    selectedModel,
    selectedVariant,
    selectedYear,
    selectedBody,
  ]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.dealership_id)
      newErrors.dealership_id = "Dealership is required";
    if (!formData.status) newErrors.status = "Status is required";
    if (!formData.purchase_type)
      newErrors.purchase_type = "Purchase type is required";
    if (!formData.vin) newErrors.vin = "VIN is required";
    if (!formData.plate_no)
      newErrors.plate_no = "Registration number is required";
    
    // New mandatory fields
    if (!formData.odometer_reading)
      newErrors.odometer_reading = "Odometer reading is required";
    if (!regoExpiryDate) newErrors.regoExpiryDate = "Registration expiry is required";
    if (!warrantyExpiryDate) newErrors.warrantyExpiryDate = "Manufacture warranty expiry is required";
    if (!formData.purchase_price)
      newErrors.purchase_price = "Purchase price is required";

    // Validate numeric fields
    if (formData.odometer_reading && isNaN(Number(formData.odometer_reading))) {
      newErrors.odometer_reading = "Odometer reading must be a number";
    }
    if (formData.purchase_price && isNaN(Number(formData.purchase_price))) {
      newErrors.purchase_price = "Purchase price must be a number";
    }

    // Validate metadata fields
    const newMetadataErrors: Record<string, string> = {};
    if (!selectedMake) newMetadataErrors.make = "Make is required";
    if (!selectedModel) newMetadataErrors.model = "Model is required";
    if (!selectedYear) newMetadataErrors.year = "Year is required";

    setErrors(newErrors);
    setMetadataErrors(newMetadataErrors);

    return (
      Object.keys(newErrors).length === 0 &&
      Object.keys(newMetadataErrors).length === 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields", {
        position: "top-right",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload hero image if selected
      let heroImageUrl = "";
      if (heroImage) {
        try {
          heroImageUrl = await uploadHeroImage();
        } catch (error) {
          toast.error("Failed to upload hero image");
          setIsLoading(false);
          return;
        }
      }

      const submitData = {
        ...formData,
        year: parseInt(formData.year),
        purchase_date: purchaseDate ? purchaseDate.toISOString() : null,
        chassis_no: formData.vin,
        vehicle_hero_image: heroImageUrl,
        vehicle_type: vehicleType,
        dealership: formData.dealership_id,
        // New fields
        odometer_reading: parseInt(formData.odometer_reading),
        purchase_price: parseFloat(formData.purchase_price),
        rego_expiry_date: regoExpiryDate ? regoExpiryDate.toISOString() : null,
        warranty_expiry_date: warrantyExpiryDate ? warrantyExpiryDate.toISOString() : null,
      };

      await vehicleServices.createVehicleStock(submitData);
      toast.success(`Vehicle stock created successfully for ${vehicleType}`);
      onSuccess();
      onClose();

      // Reset form
      setFormData({
        dealership_id: "",
        status: "",
        purchase_type: "",
        make: "",
        year: "",
        model: "",
        variant: "",
        body_style: "",
        vin: "",
        vehicle_type: vehicleType,
        plate_no: "",
        purchase_notes: "",
        vehicle_hero_image: "",
        odometer_reading: "",
        purchase_price: "",
      });

      setSelectedMake("");
      setSelectedModel("");
      setSelectedVariant("");
      setSelectedYear("");
      setSelectedBody("");
      setPurchaseDate(undefined);
      setRegoExpiryDate(undefined);
      setWarrantyExpiryDate(undefined);
      setHeroImage(null);
      setHeroImagePreview("");
      setErrors({});
      setMetadataErrors({});
    } catch (error: any) {
      console.error("Create vehicle stock error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to create vehicle stock";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (vehicleType) {
      case "inspection":
        return "Create Inspection Vehicle Stock";
      case "tradein":
        return "Create Trade-in Vehicle Stock";
      case "advertisement":
        return "Create Advertisement Vehicle Stock";
      case "master":
        return "Create Master Vehicle Stock";
      default:
        return "Create Vehicle Stock";
    }
  };

  const getModalDescription = () => {
    return vehicleType === "inspection"
      ? "Add a new vehicle to the inspection inventory"
      : "Add a new vehicle to the trade-in inventory";
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{getModalTitle()}</SheetTitle>
          <SheetDescription>{getModalDescription()}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Hero Image Upload - First Field */}
          <div className="space-y-2">
            <Label>Vehicle Hero Image</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {heroImagePreview ? (
                <div className="relative">
                  <img
                    src={heroImagePreview}
                    alt="Hero preview"
                    className="w-full h-32 object-cover rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={removeHeroImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroImageChange}
                    className="hidden"
                    id="hero-image"
                  />
                  <Label
                    htmlFor="hero-image"
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
          </div>

          {/* Dealership - Second Field */}
          <div className="space-y-2">
            <Label htmlFor="dealership_id" className="required">
              Dealership
            </Label>
            <Select
              value={formData.dealership_id}
              onValueChange={(value) =>
                handleInputChange("dealership_id", value)
              }
            >
              <SelectTrigger
                className={errors.dealership_id ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select dealership" />
              </SelectTrigger>
              <SelectContent>
                {dealerships?.map((dealership: any) => (
                  <SelectItem key={dealership._id} value={dealership._id}>
                    {dealership.dealership_name}
                  </SelectItem>
                ))}
                {(!dealerships || dealerships.length === 0) && (
                  <SelectItem value="" disabled>
                    No dealerships available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.dealership_id && (
              <p className="text-red-500 text-sm">{errors.dealership_id}</p>
            )}
          </div>

          {/* Vehicle Metadata - Third Field */}
          <div className="space-y-4">
            <VehicleMetadataSelector
              selectedMake={selectedMake}
              selectedModel={selectedModel}
              selectedVariant={selectedVariant}
              selectedYear={selectedYear}
              selectedBody={selectedBody}
              onMakeChange={setSelectedMake}
              onModelChange={setSelectedModel}
              onVariantChange={setSelectedVariant}
              onYearChange={setSelectedYear}
              onBodyChange={setSelectedBody}
              errors={metadataErrors}
              onErrorsChange={setMetadataErrors}
              layout="stacked"
              showLabels={true}
              makeProps={{
                required: true,
              }}
              modelProps={{
                required: true,
              }}
              yearProps={{
                required: true,
              }}
              variantProps={{
                placeholder: "Select variant (optional)",
              }}
              bodyProps={{
                label: "Body Style",
                placeholder: "Select body style (optional)",
              }}
            />
          </div>

          {/* Status - Fourth Field */}
          <div className="space-y-2">
            <Label htmlFor="status" className="required">
              Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {vehicleStatus?.map((status: any) => (
                  <SelectItem key={status._id} value={status.option_value}>
                    {status.display_value}
                  </SelectItem>
                ))}
                {(!vehicleStatus || vehicleStatus.length === 0) && (
                  <SelectItem value="all" disabled>
                    No status options available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-red-500 text-sm">{errors.status}</p>
            )}
          </div>

          {/* Purchase Type - Fifth Field */}
          <div className="space-y-2">
            <Label htmlFor="purchase_type" className="required">
              Purchase Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.purchase_type}
              onValueChange={(value) =>
                handleInputChange("purchase_type", value)
              }
            >
              <SelectTrigger
                className={errors.purchase_type ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select purchase type" />
              </SelectTrigger>
              <SelectContent>
                {vehiclePurchaseType?.map((purchaseType: any) => (
                  <SelectItem
                    key={purchaseType._id}
                    value={purchaseType.option_value}
                  >
                    {purchaseType.display_value}
                  </SelectItem>
                ))}
                {(!vehiclePurchaseType || vehiclePurchaseType.length === 0) && (
                  <SelectItem value="all" disabled>
                    No purchase type options available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.purchase_type && (
              <p className="text-red-500 text-sm">{errors.purchase_type}</p>
            )}
          </div>

          {/* VIN - Sixth Field */}
          <div className="space-y-2">
            <Label htmlFor="vin" className="required">
              VIN<span className="text-red-500">*</span>
            </Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => handleInputChange("vin", e.target.value)}
              placeholder="Enter VIN number"
              className={errors.vin ? "border-red-500" : ""}
            />
            {errors.vin && <p className="text-red-500 text-sm">{errors.vin}</p>}
          </div>

          {/* Registration No - Seventh Field */}
          <div className="space-y-2">
            <Label htmlFor="plate_no" className="required">
              Registration No<span className="text-red-500">*</span>
            </Label>
            <Input
              id="plate_no"
              value={formData.plate_no}
              onChange={(e) => handleInputChange("plate_no", e.target.value)}
              placeholder="Enter registration number"
              className={errors.plate_no ? "border-red-500" : ""}
            />
            {errors.plate_no && (
              <p className="text-red-500 text-sm">{errors.plate_no}</p>
            )}
          </div>

          {/* Odometer Reading - Eighth Field */}
          <div className="space-y-2">
            <Label htmlFor="odometer_reading" className="required">
              Odometer Reading<span className="text-red-500">*</span>
            </Label>
            <Input
              id="odometer_reading"
              type="number"
              value={formData.odometer_reading}
              onChange={(e) => handleInputChange("odometer_reading", e.target.value)}
              placeholder="Enter odometer reading"
              className={errors.odometer_reading ? "border-red-500" : ""}
            />
            {errors.odometer_reading && (
              <p className="text-red-500 text-sm">{errors.odometer_reading}</p>
            )}
          </div>

          {/* Purchase Price - Ninth Field */}
          <div className="space-y-2">
            <Label htmlFor="purchase_price" className="required">
              Purchase Price<span className="text-red-500">*</span>
            </Label>
            <Input
              id="purchase_price"
              type="number"
              step="0.01"
              value={formData.purchase_price}
              onChange={(e) => handleInputChange("purchase_price", e.target.value)}
              placeholder="Enter purchase price"
              className={errors.purchase_price ? "border-red-500" : ""}
            />
            {errors.purchase_price && (
              <p className="text-red-500 text-sm">{errors.purchase_price}</p>
            )}
          </div>

          {/* Registration Expiry Date - Tenth Field */}
          <div className="space-y-2">
            <Label className="required">
              Registration Expiry Date<span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !regoExpiryDate && "text-muted-foreground",
                    errors.regoExpiryDate && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {regoExpiryDate ? format(regoExpiryDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={regoExpiryDate}
                  onSelect={setRegoExpiryDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.regoExpiryDate && (
              <p className="text-red-500 text-sm">{errors.regoExpiryDate}</p>
            )}
          </div>

          {/* Manufacture Warranty Expiry Date - Eleventh Field */}
          <div className="space-y-2">
            <Label className="required">
              Manufacture Warranty Expiry Date<span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !warrantyExpiryDate && "text-muted-foreground",
                    errors.warrantyExpiryDate && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {warrantyExpiryDate ? format(warrantyExpiryDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={warrantyExpiryDate}
                  onSelect={setWarrantyExpiryDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.warrantyExpiryDate && (
              <p className="text-red-500 text-sm">{errors.warrantyExpiryDate}</p>
            )}
          </div>

          {/* Purchase Date - Twelfth Field */}
          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !purchaseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate ? format(purchaseDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={setPurchaseDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Purchase Notes - Thirteenth Field */}
          <div className="space-y-2">
            <Label htmlFor="purchase_notes">Purchase Notes</Label>
            <Textarea
              id="purchase_notes"
              value={formData.purchase_notes}
              onChange={(e) =>
                handleInputChange("purchase_notes", e.target.value)
              }
              placeholder="Enter any additional notes"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || uploadingImage}
              className="flex-1"
            >
              {isLoading || uploadingImage
                ? "Creating..."
                : "Create Vehicle Stock"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default CreateVehicleTradeModal;