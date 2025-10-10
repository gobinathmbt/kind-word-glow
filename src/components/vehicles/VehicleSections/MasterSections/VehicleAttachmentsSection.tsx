import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload, FilePreview } from "@/components/ui/file-upload";
import {
  Upload,
  Download,
  Image,
  File,
  Trash2,
  Eye,
  Plus,
  Loader2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { vehicleServices, companyServices } from "@/api/services";
import { S3Uploader, S3Config } from "@/lib/s3-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MediaViewer, { MediaItem } from "@/components/common/MediaViewer";
import { useAuth } from "@/auth/AuthContext";

interface VehicleAttachmentsSectionProps {
  vehicle: any;
  vehicleType: any;
  onUpdate: () => void;
}

const VehicleAttachmentsSection: React.FC<VehicleAttachmentsSectionProps> = ({
  vehicle,
  onUpdate,
  vehicleType,
}) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"images" | "files">("images");
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const { completeUser } = useAuth();

  // Media viewer states
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");

  const attachments = vehicle.vehicle_attachments || [];

  const { data: dropdownsImageCategoryData } = useQuery({
    queryKey: ["master-modules-for-image"],
    queryFn: () =>
      companyServices
        .getCompanyMasterdropdownvalues({
          dropdown_name: ["attachment_category_image"],
        })
        .then((res) => res.data),
  });

  const { data: dropdownsFileCategoryData } = useQuery({
    queryKey: ["master-modules-for-file"],
    queryFn: () =>
      companyServices
        .getCompanyMasterdropdownvalues({
          dropdown_name: ["attachment_category_files"],
        })
        .then((res) => res.data),
  });

  // Extract categories from API responses
  const imageCategoryOptions =
    dropdownsImageCategoryData?.data?.[0]?.values || [];
  const fileCategoryOptions =
    dropdownsFileCategoryData?.data?.[0]?.values || [];

  // Helper function to check if file is video
  const isVideoFile = (mimeType: string) => {
    return mimeType?.startsWith("video/") || false;
  };

  // Helper function to check if file is image
  const isImageFile = (mimeType: string) => {
    return mimeType?.startsWith("image/") || false;
  };

  // Prepare media items for MediaViewer
  const prepareMediaItems = (): MediaItem[] => {
    return attachments
      .filter((att: any) => att.type === "image" || isVideoFile(att.mime_type))
      .map((att: any) => ({
        id: att._id,
        url: att.url,
        type: isVideoFile(att.mime_type)
          ? ("video" as const)
          : ("image" as const),
        title: att.original_filename || att.filename,
        description: `${getCategoryDisplayName(
          att.image_category || att.file_category || "other",
          att.type === "image" ? "images" : "files"
        )} • ${formatFileSize(att.size || 0)}`,
      }));
  };

  // Handle opening media viewer
  const handleOpenMediaViewer = (attachmentId: string) => {
    setCurrentMediaId(attachmentId);
    setMediaViewerOpen(true);
  };

  // Helper function to get category display name
  const getCategoryDisplayName = (
    categoryValue: string,
    type: "images" | "files"
  ) => {
    const options =
      type === "images" ? imageCategoryOptions : fileCategoryOptions;
    const category = options.find((opt) => opt.option_value === categoryValue);
    return (
      category?.display_value ||
      (type === "images" ? "Other Images" : "Other Files")
    );
  };

  // Helper function to determine if a category exists in dropdown
  const isCategoryInDropdown = (
    categoryValue: string,
    type: "images" | "files"
  ) => {
    const options =
      type === "images" ? imageCategoryOptions : fileCategoryOptions;
    return options.some((opt) => opt.option_value === categoryValue);
  };

  // Group attachments by category with dynamic categorization
  const categorizeAttachments = () => {
    const imageAttachments = attachments.filter(
      (att: any) => att.type === "image" || isImageFile(att.mime_type)
    );
    const fileAttachments = attachments.filter(
      (att: any) =>
        att.type === "file" &&
        !isImageFile(att.mime_type) &&
        !isVideoFile(att.mime_type)
    );
    const videoAttachments = attachments.filter((att: any) =>
      isVideoFile(att.mime_type)
    );

    // Group images by categories
    const imageGroups: Record<string, any[]> = {};
    imageAttachments.forEach((att: any) => {
      const category = att.image_category || "other_images";
      const isValidCategory = isCategoryInDropdown(category, "images");
      const groupKey = isValidCategory ? category : "other_images";

      if (!imageGroups[groupKey]) {
        imageGroups[groupKey] = [];
      }
      imageGroups[groupKey].push(att);
    });

    // Group videos with images for now, or create separate video groups if needed
    videoAttachments.forEach((att: any) => {
      const category = att.file_category || "other_images";
      const isValidCategory = isCategoryInDropdown(category, "images");
      const groupKey = isValidCategory ? category : "other_images";

      if (!imageGroups[groupKey]) {
        imageGroups[groupKey] = [];
      }
      imageGroups[groupKey].push(att);
    });

    // Group files by categories
    const fileGroups: Record<string, any[]> = {};
    fileAttachments.forEach((att: any) => {
      const category = att.file_category || "other_files";
      const isValidCategory = isCategoryInDropdown(category, "files");
      const groupKey = isValidCategory ? category : "other_files";

      if (!fileGroups[groupKey]) {
        fileGroups[groupKey] = [];
      }
      fileGroups[groupKey].push(att);
    });

    return { imageGroups, fileGroups };
  };

  const { imageGroups, fileGroups } = categorizeAttachments();

  // Set default upload category when dropdown data is loaded
  useEffect(() => {
    if (
      uploadType === "images" &&
      imageCategoryOptions.length > 0 &&
      !uploadCategory
    ) {
      setUploadCategory(imageCategoryOptions[0].option_value);
    } else if (
      uploadType === "files" &&
      fileCategoryOptions.length > 0 &&
      !uploadCategory
    ) {
      setUploadCategory(fileCategoryOptions[0].option_value);
    }
  }, [uploadType, imageCategoryOptions, fileCategoryOptions, uploadCategory]);

  // Reset category when switching upload type
  useEffect(() => {
    if (uploadType === "images" && imageCategoryOptions.length > 0) {
      setUploadCategory(imageCategoryOptions[0].option_value);
    } else if (uploadType === "files" && fileCategoryOptions.length > 0) {
      setUploadCategory(fileCategoryOptions[0].option_value);
    }
  }, [uploadType, imageCategoryOptions, fileCategoryOptions]);

  useEffect(() => {
    loadS3Config();
  }, []);

  const loadS3Config = async () => {
    try {
      const config = completeUser.company_id.s3_config;
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

const handleFilesSelected = (files: File[]) => {
  setSelectedFiles((prev) => [...prev, ...files]);
};

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadToS3AndSave = async () => {
    if (!s3Uploader || selectedFiles.length === 0) return;

    setUploading(true);
    const uploadedAttachments = [];

    try {
      for (const [index, file] of selectedFiles.entries()) {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const s3Category =
          uploadType === "images" ? uploadCategory : uploadCategory;

        const uploadResult = await s3Uploader.uploadFile(file, s3Category);

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

        const attachmentData = {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          type: uploadType === "images" ? "image" : "file",
          url: uploadResult.url,
          s3_key: uploadResult.key,
          s3_bucket: s3Config?.bucket,
          size: uploadResult.size,
          mime_type: file.type,
          filename: file.name,
          original_filename: file.name,
          position: attachments.length + index,
          ...(uploadType === "images"
            ? { image_category: uploadCategory }
            : { file_category: uploadCategory }),
        };

        uploadedAttachments.push(attachmentData);
      }

      for (const attachmentData of uploadedAttachments) {
        await vehicleServices.uploadVehicleAttachment(
          vehicle._id,
          vehicleType,
          attachmentData
        );
      }

      toast.success(
        `Successfully uploaded ${selectedFiles.length} ${uploadType}`
      );
      setSelectedFiles([]);
      setUploadDialogOpen(false);
      setUploadProgress({});
      onUpdate();
    } catch (error) {
      toast.error("Failed to upload files");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachment: any) => {
    try {
      if (s3Uploader && attachment.s3_key) {
        await s3Uploader.deleteFile(attachment.s3_key);
      }

      await vehicleServices.deleteVehicleAttachment(
        vehicle._id,
        vehicleType,
        attachment._id
      );

      toast.success("Attachment deleted successfully");
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete attachment");
      console.error("Delete error:", error);
    }
  };

  const handleViewAttachment = (url: string) => {
    window.open(url, "_blank");
  };

  const AttachmentGrid = ({
    items,
    title,
  }: {
    items: any[];
    title: string;
  }) => {
    if (items.length === 0) return null;

    return (
      <Accordion type="single" collapsible>
        <AccordionItem value={title.toLowerCase().replace(" ", "-")}>
          <AccordionTrigger>
            <div className="flex items-center justify-between w-full mr-4">
              <span>{title}</span>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item: any) => (
                <Card key={item._id} className="overflow-hidden group">
                  <CardContent className="p-0">
                    {item.type === "image" || isImageFile(item.mime_type) ? (
                      <div className="relative">
                        <img
                          src={item.url}
                          alt={item.original_filename || item.filename}
                          className="w-full h-32 object-cover cursor-pointer"
                          onClick={() => handleOpenMediaViewer(item._id)}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMediaViewer(item._id);
                            }}
                            className="text-white hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttachment(item);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : isVideoFile(item.mime_type) ? (
                      <div className="relative">
                        <div
                          className="w-full h-32 bg-gray-900 flex items-center justify-center cursor-pointer relative overflow-hidden"
                          onClick={() => handleOpenMediaViewer(item._id)}
                        >
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-12 w-12 text-white opacity-80" />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMediaViewer(item._id);
                            }}
                            className="text-white hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttachment(item);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center space-x-3">
                        <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.original_filename || item.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(item.size)}
                          </p>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAttachment(item.url)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(item)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="p-2 border-t bg-muted/50">
                      <p className="text-xs text-muted-foreground truncate">
                        {item.original_filename || item.filename}
                      </p>
                      {item.size && (
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(item.size)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  if (attachments.length === 0 && !s3Config) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No attachments found</p>
          <p className="text-sm text-muted-foreground">
            Configure S3 settings to enable file uploads
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Attachments</h3>
        {s3Config && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Upload Attachments</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-hidden">
                <Tabs
                  value={uploadType}
                  onValueChange={(value) =>
                    setUploadType(value as "images" | "files")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="images">Images</TabsTrigger>
                    <TabsTrigger value="files">Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="images" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Image Category
                      </label>
                      <Select
                        value={uploadCategory}
                        onValueChange={setUploadCategory}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an image category" />
                        </SelectTrigger>
                        <SelectContent>
                          {imageCategoryOptions.map((option) => (
                            <SelectItem
                              key={option.option_value}
                              value={option.option_value}
                            >
                              {option.display_value}
                            </SelectItem>
                          ))}
                          <SelectItem value="other_images">
                            Other Images
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <FileUpload
                      onFilesSelected={handleFilesSelected}
                      accept="images"
                      multiple={true}
                      maxSize={10 * 1024 * 1024} // 10MB
                    />
                  </TabsContent>

                  <TabsContent value="files" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">File Category</label>
                      <Select
                        value={uploadCategory}
                        onValueChange={setUploadCategory}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a file category" />
                        </SelectTrigger>
                        <SelectContent>
                          {fileCategoryOptions.map((option) => (
                            <SelectItem
                              key={option.option_value}
                              value={option.option_value}
                            >
                              {option.display_value}
                            </SelectItem>
                          ))}
                          <SelectItem value="other_files">Other Files</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <FileUpload
                      onFilesSelected={handleFilesSelected}
                      accept="files"
                      multiple={true}
                      maxSize={25 * 1024 * 1024} // 25MB
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {selectedFiles.length > 0 && (
                <div className={`space-y-4 border-t pt-4 ${selectedFiles.length > 3 ? 'flex-1 overflow-hidden flex flex-col' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      Selected Files ({selectedFiles.length})
                    </h4>
                    <Button
                      onClick={uploadToS3AndSave}
                      disabled={uploading}
                      size="sm"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload All
                        </>
                      )}
                    </Button>
                  </div>

                  <div className={selectedFiles.length > 3 ? 'flex-1 overflow-y-auto' : ''}>
                    <FilePreview
                      files={selectedFiles}
                      onRemove={handleRemoveFile}
                      progress={uploadProgress}
                    />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {attachments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No attachments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Render image categories dynamically */}
          {Object.entries(imageGroups).map(([categoryKey, items]) => (
            <AttachmentGrid
              key={categoryKey}
              items={items}
              title={getCategoryDisplayName(categoryKey, "images")}
            />
          ))}

          {/* Render file categories dynamically */}
          {Object.entries(fileGroups).map(([categoryKey, items]) => (
            <AttachmentGrid
              key={categoryKey}
              items={items}
              title={getCategoryDisplayName(categoryKey, "files")}
            />
          ))}
        </div>
      )}

      {/* Media Viewer */}
      <MediaViewer
        media={prepareMediaItems()}
        currentMediaId={currentMediaId}
        isOpen={mediaViewerOpen}
        onClose={() => setMediaViewerOpen(false)}
      />
    </div>
  );
};

export default VehicleAttachmentsSection;