import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Info,
  Settings,
  X,
  Camera,
  Video,
  ImageIcon,
  NotepadText,
  Loader2,
  Maximize,
  Play,
  Plus,
  Flag,
} from "lucide-react";
import { MediaItem } from "@/components/common/MediaViewer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InspectionFormFieldProps {
  field: any;
  categoryIndex?: number;
  sectionIndex?: number;
  section?: any;
  category?: any;
  value: any;
  notes: string;
  images: string[];
  videos: string[];
  disabled: boolean;
  hasError: boolean;
  uploading: boolean;
  workshopWorkRequired?: boolean;
  onFieldChange: (fieldId: string, value: any, isRequired: boolean) => void;
  onNotesChange: (fieldId: string, notes: string) => void;
  onMultiSelectChange: (
    fieldId: string,
    value: string,
    checked: boolean,
    isRequired: boolean
  ) => void;
  onMultiplierChange: (
    fieldId: string,
    type: "quantity" | "price",
    value: string
  ) => void;
  onFileUpload: (fieldId: string, file: File, isImage: boolean) => void;
  onRemoveImage: (fieldId: string, imageUrl: string) => void;
  onRemoveVideo: (fieldId: string, videoUrl: string) => void;
  onWorkshopFlagChange?: (fieldId: string, required: boolean) => void;
  onEditWorkshopField?: (
    field: any,
    categoryIndex?: number,
    sectionIndex?: number
  ) => void;
  onDeleteWorkshopField?: (
    field: any,
    categoryIndex?: number,
    sectionIndex?: number
  ) => void;
  onOpenMediaViewer: (media: MediaItem[], currentMediaId?: string) => void;
  getDropdownById: (dropdownId: any) => any;
  isViewMode: boolean;
  isEditMode: boolean;
  vehicleType: string;
}

const InspectionFormField: React.FC<InspectionFormFieldProps> = ({
  field,
  categoryIndex,
  sectionIndex,
  section,
  category,
  value,
  notes,
  images,
  videos,
  disabled,
  hasError,
  uploading,
  workshopWorkRequired,
  onFieldChange,
  onNotesChange,
  onMultiSelectChange,
  onMultiplierChange,
  onFileUpload,
  onRemoveImage,
  onRemoveVideo,
  onWorkshopFlagChange,
  onEditWorkshopField,
  onDeleteWorkshopField,
  onOpenMediaViewer,
  getDropdownById,
  isViewMode,
  isEditMode,
  vehicleType,
}) => {
  const fieldId = field.field_id;
  const [localWorkshopFlag, setLocalWorkshopFlag] = useState(
    workshopWorkRequired !== undefined ? workshopWorkRequired : true
  );

  // Check if this is a workshop field
  const isWorkshopField = (field: any, section: any, category: any = null) => {
    // Check for workshop section display name
    if (section?.section_display_name === "at_workshop_onstaging") {
      return true;
    }

    // Check for workshop section ID pattern
    if (section?.section_id?.includes("workshop_section")) {
      return true;
    }

    // Check for workshop section name pattern
    if (
      section?.section_name?.includes("At Workshop") ||
      section?.section_name?.includes("Workshop")
    ) {
      return true;
    }

    // For trade-in, check if it's a direct workshop section
    if (
      vehicleType === "tradein" &&
      (section?.section_name?.includes("At Workshop") ||
        section?.section_name?.includes("Workshop"))
    ) {
      return true;
    }

    return false;
  };

  const workshopField = isWorkshopField(field, section, category);

  const renderFieldInput = () => {
    switch (field.field_type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) =>
              onFieldChange(fieldId, e.target.value, field.is_required)
            }
            placeholder={field.placeholder}
            disabled={disabled}
            className="h-10"
          />
        );

      case "number":
      case "currency":
        return (
          <div className="relative">
            {field.field_type === "currency" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                $
              </span>
            )}
            <Input
              type="number"
              step={field.field_type === "currency" ? "0.01" : "1"}
              value={value}
              onChange={(e) =>
                onFieldChange(fieldId, e.target.value, field.is_required)
              }
              placeholder={field.placeholder}
              disabled={disabled}
              className={`h-10 ${
                field.field_type === "currency" ? "pl-8" : ""
              }`}
            />
          </div>
        );

      case "mutiplier":
        const multiplierValue =
          typeof value === "object"
            ? value
            : { quantity: "", price: "", total: 0 };
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Quantity</Label>
                <Input
                  type="number"
                  value={multiplierValue.quantity}
                  onChange={(e) =>
                    onMultiplierChange(fieldId, "quantity", e.target.value)
                  }
                  placeholder="Quantity"
                  disabled={disabled}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-sm">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={multiplierValue.price}
                    onChange={(e) =>
                      onMultiplierChange(fieldId, "price", e.target.value)
                    }
                    placeholder="Price"
                    disabled={disabled}
                    className="h-9 pl-8"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm">Total</Label>
              <div className="p-3 bg-muted/30 rounded-lg font-medium">
                ${multiplierValue.total || "0.00"}
              </div>
            </div>
          </div>
        );

      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) =>
              onFieldChange(fieldId, e.target.value, field.is_required)
            }
            disabled={disabled}
            className="h-10"
          />
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id={fieldId}
              checked={value === true || value === "true"}
              onCheckedChange={(checked) =>
                onFieldChange(fieldId, checked, field.is_required)
              }
              disabled={disabled}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label
              htmlFor={fieldId}
              className="text-sm font-normal cursor-pointer"
            >
              {field.placeholder || "Check if applicable"}
            </Label>
          </div>
        );

      case "dropdown":
        const dropdown = getDropdownById(field.dropdown_config?.dropdown_id);
        const allowMultiple = field.dropdown_config?.allow_multiple;

        if (!dropdown) {
          return (
            <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              Dropdown configuration not found
            </div>
          );
        }

        const sortedValues = [...(dropdown.values || [])].sort(
          (a, b) => (a.display_order || 0) - (b.display_order || 0)
        );

        if (allowMultiple) {
          const selectedValues = Array.isArray(value)
            ? value
            : value
            ? value.split(",")
            : [];

          return (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {sortedValues
                  .filter((opt: any) => opt.is_active)
                  .map((opt: any) => {
                    const isSelected = selectedValues.includes(
                      opt.option_value
                    );
                    return (
                      <div
                        key={opt._id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "bg-background border-border"
                        }`}
                        onClick={() =>
                          !disabled &&
                          onMultiSelectChange(
                            fieldId,
                            opt.option_value,
                            !isSelected,
                            field.is_required
                          )
                        }
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={disabled}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Label className="flex-1 cursor-pointer font-normal">
                          {opt.display_value || opt.option_value}
                        </Label>
                      </div>
                    );
                  })}
              </div>
              {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedValues.map((val: string) => {
                    const option = sortedValues.find(
                      (opt: any) => opt.option_value === val
                    );
                    return (
                      <Badge
                        key={val}
                        variant="default"
                        className="flex items-center space-x-1"
                      >
                        <span>{option?.display_value || val}</span>
                        {!disabled && (
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-red-500"
                            onClick={() =>
                              onMultiSelectChange(
                                fieldId,
                                val,
                                false,
                                field.is_required
                              )
                            }
                          />
                        )}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          );
        } else {
          return (
            <Select
              value={value}
              onValueChange={(val) =>
                onFieldChange(fieldId, val, field.is_required)
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    field.placeholder || `Select ${field.field_name}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sortedValues
                  .filter((opt: any) => opt.is_active)
                  .map((opt: any) => (
                    <SelectItem key={opt._id} value={opt.option_value}>
                      <div className="flex items-center space-x-2">
                        <span>{opt.display_value || opt.option_value}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          );
        }

      case "video":
        return (
          <div className="space-y-4">
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.map((videoUrl: string, index: number) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border"
                  >
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <video
                          src={videoUrl}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full h-10 w-10"
                            onClick={() => {
                              const mediaItems: MediaItem[] = videos.map(
                                (videoUrl: string, idx: number) => ({
                                  id: `${fieldId}_video_${idx}`,
                                  url: videoUrl,
                                  type: "video" as const,
                                  title: `${field.field_name} Video ${idx + 1}`,
                                })
                              );
                              onOpenMediaViewer(
                                mediaItems,
                                `${fieldId}_video_${index}`
                              );
                            }}
                          >
                            <Play className="h-5 w-5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {!disabled && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveVideo(fieldId, videoUrl)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors ${
                  !disabled
                    ? "cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/30"
                    : ""
                }`}
                onClick={
                  !disabled
                    ? () =>
                        document.getElementById(`video-${fieldId}`)?.click()
                    : undefined
                }
              >
                <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Click to upload video
                </p>
                <p className="text-xs text-muted-foreground">
                  {field.placeholder || "Upload video files"}
                </p>
              </div>
            )}
            {!disabled && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById(`video-${fieldId}`)?.click()
                  }
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4 mr-2" />
                  )}
                  {videos.length > 0 ? "Add More Videos" : "Upload Videos"}
                </Button>
              </div>
            )}
            {!disabled && (
              <input
                id={`video-${fieldId}`}
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => onFileUpload(fieldId, file, false));
                }}
                className="hidden"
              />
            )}
          </div>
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={(e) =>
              onFieldChange(fieldId, e.target.value, field.is_required)
            }
            placeholder={field.placeholder}
            disabled={disabled}
            className="min-h-[80px] resize-y"
          />
        );
    }
  };

  return (
    <div
      className={`space-y-4 p-4 md:p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow ${
        hasError ? "border-red-500" : "border-border"
      } ${workshopField ? "border-2 border-yellow-400 bg-yellow-50" : ""}`}
    >
      {/* Field Header with Workshop Badge */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Label className="text-base font-medium">
              {field.field_name}
              {field.is_required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {workshopField && (
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-800 border-yellow-300"
              >
                <Settings className="h-3 w-3 mr-1" />
                Workshop Field
              </Badge>
            )}
            {field.help_text && (
              <div className="group relative">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 whitespace-nowrap shadow-md border">
                    {field.help_text}
                  </div>
                </div>
              </div>
            )}
          </div>
          {field.help_text && (
            <p className="text-xs text-muted-foreground mt-1">
              {field.help_text}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Workshop Work Required Flag */}
          {!disabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 w-8 p-0 ${
                      localWorkshopFlag
                        ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                        : "text-green-500 hover:text-green-600 hover:bg-green-50"
                    }`}
                    onClick={() => {
                      const newFlag = !localWorkshopFlag;
                      setLocalWorkshopFlag(newFlag);
                      onWorkshopFlagChange?.(fieldId, newFlag);
                    }}
                  >
                    <Flag
                      className="h-4 w-4"
                      fill={localWorkshopFlag ? "currentColor" : "none"}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {localWorkshopFlag
                      ? "Workshop Work Required"
                      : "No Workshop Work Required"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Field Type Badge */}
          <Badge variant="secondary" className="text-xs hidden sm:flex">
            {field.field_type}
          </Badge>

          {workshopField && !disabled && isEditMode && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onEditWorkshopField?.(field, categoryIndex, sectionIndex)
                }
              >
                <Settings className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  onDeleteWorkshopField?.(field, categoryIndex, sectionIndex)
                }
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Field Input */}
      <div className="space-y-4">
        {renderFieldInput()}

        {/* Image Capture Section */}
        {field.has_image && (
          <div className="space-y-3">
            {/* Label */}
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Images</Label>
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-4">
                {images.slice(0, 4).map((imageUrl: string, index: number) => (
                  <div
                    key={index}
                    className="relative group w-[200px] h-[200px] rounded-lg overflow-hidden border"
                  >
                    <img
                      src={imageUrl}
                      alt={`${field.field_name} ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => {
                        const mediaItems: MediaItem[] = images.map(
                          (imageUrl: string, idx: number) => ({
                            id: `${fieldId}_image_${idx}`,
                            url: imageUrl,
                            type: "image" as const,
                            title: `${field.field_name} Image ${idx + 1}`,
                          })
                        );
                        onOpenMediaViewer(
                          mediaItems,
                          `${fieldId}_image_${index}`
                        );
                      }}
                    />

                    {/* Hover Zoom Button */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full h-8 w-8"
                        onClick={() => {
                          const mediaItems: MediaItem[] = images.map(
                            (imageUrl: string, idx: number) => ({
                              id: `${fieldId}_image_${idx}`,
                              url: imageUrl,
                              type: "image" as const,
                              title: `${field.field_name} Image ${idx + 1}`,
                            })
                          );
                          onOpenMediaViewer(
                            mediaItems,
                            `${fieldId}_image_${index}`
                          );
                        }}
                      >
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Delete Button */}
                    {!disabled && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveImage(fieldId, imageUrl)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* +More Images */}
                {images.length > 4 && (
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors w-[120px] h-[120px]"
                    onClick={() => {
                      const mediaItems: MediaItem[] = images.map(
                        (imageUrl: string, idx: number) => ({
                          id: `${fieldId}_image_${idx}`,
                          url: imageUrl,
                          type: "image" as const,
                          title: `${field.field_name} Image ${idx + 1}`,
                        })
                      );
                      onOpenMediaViewer(mediaItems);
                    }}
                  >
                    <div className="text-center p-4">
                      <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">
                        +{images.length - 4} more
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Box */}
            {!disabled && (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors"
                onClick={() =>
                  document.getElementById(`image-${fieldId}`)?.click()
                }
              >
                {uploading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Camera className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload images
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              id={`image-${fieldId}`}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => onFileUpload(fieldId, file, true));
              }}
              className="hidden"
            />
          </div>
        )}

        {/* Notes Section */}
        {field.has_notes && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <NotepadText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Notes</Label>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(fieldId, e.target.value)}
              placeholder="Add notes or observations..."
              disabled={disabled}
              className="min-h-[60px] resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectionFormField;