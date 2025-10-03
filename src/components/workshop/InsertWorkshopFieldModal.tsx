import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { S3Uploader, S3Config } from "@/lib/s3-client";

interface InsertWorkshopFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFieldCreated: (fieldData: any) => void;
  vehicleType: string;
  categoryId?: string;
  dropdowns?: any[];
  s3Config?: any;
  editMode?: boolean;
  existingField?: any;
}
const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "video", label: "Video" },
  { value: "dropdown", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "mutiplier", label: "Multiply Field" },
];

const InsertWorkshopFieldModal: React.FC<InsertWorkshopFieldModalProps> = ({
  open,
  onOpenChange,
  onFieldCreated,
  vehicleType,
  categoryId,
  dropdowns = [],
  s3Config,
  editMode = false,
  existingField = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    field_name: "",
    field_type: "text",
    is_required: false,
    placeholder: "",
    help_text: "",
    dropdown_config: {
      dropdown_name: "",
      allow_multiple: false,
    },
  });

  // Field value states for different types
  const [fieldValue, setFieldValue] = useState<any>("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [multiplierData, setMultiplierData] = useState({
    quantity: "",
    price: "",
    total: 0,
  });

  useEffect(() => {
    setS3Uploader(new S3Uploader(s3Config));
  }, [s3Config]);
  const handleInputChange = (field: string, value: any) => {
    if (field === "dropdown_name") {
      setFormData((prev) => ({
        ...prev,
        dropdown_config: {
          ...prev.dropdown_config,
          dropdown_name: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  useEffect(() => {
    if (editMode && existingField) {
      setFormData({
        field_name: existingField.field_name || "",
        field_type: existingField.field_type || "text",
        is_required: existingField.is_required || false,
        placeholder: existingField.placeholder || "",
        help_text: existingField.help_text || "",
        dropdown_config: existingField.dropdown_config || {
          dropdown_name: "",
          allow_multiple: false,
        },
      });

      setFieldValue(existingField.field_value || "");
      setNotes(existingField.notes || "");
      setImages(existingField.images || []);
      setVideos(existingField.videos || []);

      if (existingField.field_type === "date" && existingField.field_value) {
        setSelectedDate(new Date(existingField.field_value));
      }

      if (
        existingField.field_type === "mutiplier" &&
        existingField.field_value
      ) {
        setMultiplierData(existingField.field_value);
      }
    }
  }, [editMode, existingField, open]);

  const handleFileUpload = async (file: File, isImage: boolean = true) => {
    setS3Uploader(new S3Uploader(s3Config));

    if (!s3Config) {
      toast.error("S3 uploader not available");
      return;
    }

    setUploading(true);
    try {
      const uploadResult = await s3Uploader.uploadFile(file, "workshop");

      if (isImage) {
        setImages((prev) => [...prev, uploadResult.url]);
      } else {
        setVideos((prev) => [...prev, uploadResult.url]);
      }

      toast.success(`${isImage ? "Image" : "Video"} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${isImage ? "image" : "video"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleMultiplierChange = (
    type: "quantity" | "price",
    value: string
  ) => {
    const newData = { ...multiplierData, [type]: value };

    if (newData.quantity && newData.price) {
      const quantity = parseFloat(newData.quantity);
      const price = parseFloat(newData.price);
      newData.total = quantity * price;
    } else {
      newData.total = 0;
    }

    setMultiplierData(newData);
    setFieldValue(newData);
  };

  const getFieldValue = () => {
    switch (formData.field_type) {
      case "date":
        return selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
      case "mutiplier":
        return multiplierData;
      default:
        return fieldValue;
    }
  };

  const handleSubmit = async () => {
    if (!formData.field_name.trim()) {
      toast.error("Field name is required");
      return;
    }

    if (
      formData.field_type === "dropdown" &&
      !formData.dropdown_config.dropdown_name
    ) {
      toast.error("Please select a dropdown");
      return;
    }

    setLoading(true);
    try {
      const fieldData = {
        field_id: editMode
          ? existingField.field_id
          : `workshop_field_${Date.now()}`,
        field_name: formData.field_name,
        field_type: formData.field_type,
        is_required: formData.is_required,
        placeholder: formData.placeholder,
        help_text: formData.help_text,
        dropdown_config:
          formData.field_type === "dropdown"
            ? formData.dropdown_config
            : undefined,
        field_value: getFieldValue(),
        notes: notes || undefined,
        images: images.length > 0 ? images : undefined,
        videos: videos.length > 0 ? videos : undefined,
        display_order: editMode ? existingField.display_order : 0,
        created_at: editMode
          ? existingField.created_at
          : new Date().toISOString(),
        updated_at: editMode ? new Date().toISOString() : undefined,
        // Preserve existing field properties for edit mode
        ...(editMode && {
          categoryId: existingField.categoryId,
          sectionId: existingField.sectionId,
        }),
      };

      await onFieldCreated(fieldData);

      // Reset form only if not in edit mode or after successful edit
      if (!editMode) {
        resetForm();
      }

      onOpenChange(false);
      toast.success(
        editMode
          ? "Workshop field updated successfully"
          : "Workshop field added successfully"
      );
    } catch (error) {
      console.error("Save field error:", error);
      toast.error(`Failed to ${editMode ? "update" : "add"} field`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      field_name: "",
      field_type: "text",
      is_required: false,
      placeholder: "",
      help_text: "",
      dropdown_config: {
        dropdown_name: "",
        allow_multiple: false,
      },
    });
    setFieldValue("");
    setNotes("");
    setImages([]);
    setVideos([]);
    setSelectedDate(undefined);
    setMultiplierData({ quantity: "", price: "", total: 0 });
  };

  const renderValueInput = () => {
    switch (formData.field_type) {
      case "text":
        return (
          <Input
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            placeholder="Enter text value"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            placeholder="Enter number value"
          />
        );

      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <Select value={fieldValue} onValueChange={setFieldValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select Yes/No" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case "dropdown":
        if (!formData.dropdown_config.dropdown_name) {
          return (
            <div className="text-sm text-muted-foreground">
              Please select a dropdown first
            </div>
          );
        }

        const selectedDropdown = dropdowns.find(
          (d) => d.dropdown_name === formData.dropdown_config.dropdown_name
        );

        return (
          <Select value={fieldValue} onValueChange={setFieldValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {selectedDropdown?.values?.map((value: any) => (
                <SelectItem key={value._id} value={value.option_value}>
                  {value.option_value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "mutiplier":
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  value={multiplierData.quantity}
                  onChange={(e) =>
                    handleMultiplierChange("quantity", e.target.value)
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  value={multiplierData.price}
                  onChange={(e) =>
                    handleMultiplierChange("price", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Total</Label>
              <Input
                value={multiplierData.total.toFixed(2)}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        );

      case "video":
        return (
          <div className="space-y-2">
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, false);
              }}
              disabled={uploading}
            />
            {videos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {videos.map((video, index) => (
                  <video key={index} controls className="w-full h-20 rounded">
                    <source src={video} type="video/mp4" />
                  </video>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? "Edit Workshop Field" : "Insert Workshop Field"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update the workshop field and its value"
              : "Add a new field to the workshop section and enter its value"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="field_name">Field Name *</Label>
            <Input
              id="field_name"
              value={formData.field_name}
              onChange={(e) => handleInputChange("field_name", e.target.value)}
              placeholder="Enter field name"
            />
          </div>

          <div>
            <Label htmlFor="field_type">Field Type *</Label>
            <Select
              value={formData.field_type}
              onValueChange={(value) => {
                handleInputChange("field_type", value);
                setFieldValue("");
                setSelectedDate(undefined);
                setMultiplierData({ quantity: "", price: "", total: 0 });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.field_type === "dropdown" && (
            <div>
              <Label htmlFor="dropdown">Dropdown *</Label>
              <Select
                value={formData.dropdown_config.dropdown_name}
                onValueChange={(value) =>
                  handleInputChange("dropdown_name", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dropdown" />
                </SelectTrigger>
                <SelectContent>
                  {dropdowns.map((dropdown: any) => (
                    <SelectItem
                      key={dropdown._id}
                      value={dropdown.dropdown_name}
                    >
                      {dropdown.dropdown_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="field_value">Field Value</Label>
            {renderValueInput()}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
              rows={3}
            />
          </div>

          {/* Image upload for all field types */}
          <div>
            <Label htmlFor="images">Images</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => handleFileUpload(file, true));
              }}
              disabled={uploading}
            />
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-20 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_required"
              checked={formData.is_required}
              onCheckedChange={(checked) =>
                handleInputChange("is_required", checked)
              }
            />
            <Label htmlFor="is_required">Required field</Label>
          </div>

          <div>
            <Label htmlFor="placeholder">Placeholder</Label>
            <Input
              id="placeholder"
              value={formData.placeholder}
              onChange={(e) => handleInputChange("placeholder", e.target.value)}
              placeholder="Enter placeholder text"
            />
          </div>

          <div>
            <Label htmlFor="help_text">Help Text</Label>
            <Input
              id="help_text"
              value={formData.help_text}
              onChange={(e) => handleInputChange("help_text", e.target.value)}
              placeholder="Enter help text"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (editMode) resetForm();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploading}>
            {loading
              ? editMode
                ? "Updating..."
                : "Adding..."
              : editMode
              ? "Update Field"
              : "Add Field"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsertWorkshopFieldModal;
