import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
  Clock,
  User,
  DollarSign,
  CheckCircle2,
  Plus,
  X,
  Camera,
  Video,
  FileText,
  Receipt,
  Shield,
  MessageSquare,
  ClipboardCheck,
  AlertCircle,
  Eye,
} from "lucide-react";
import DateTimePicker from "./DateTimePicker";
import { S3Uploader } from "@/lib/s3-client";
import { supplierDashboardServices } from "@/api/services";

interface WorkEntryCardProps {
  entry: any;
  index: number;
  isReadOnly: boolean;
  expandedEntry: string | null;
  setExpandedEntry: React.Dispatch<React.SetStateAction<string | null>>;
  updateWorkEntry: (id: string, field: string, value: any) => void;
  removeWorkEntry: (id: string) => void;
  calculateEntryTotal: (entry: any) => number;
  handleFileUpload: (
    file: File,
    entryId: string,
    category: string,
    description?: string
  ) => Promise<void>;
  uploading: boolean;
}

const WorkEntryCard: React.FC<WorkEntryCardProps> = ({
  entry,
  index,
  isReadOnly,
  expandedEntry,
  setExpandedEntry,
  updateWorkEntry,
  removeWorkEntry,
  calculateEntryTotal,
  handleFileUpload,
  uploading,
}) => {
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);

  useEffect(() => {
    const initializeS3 = async () => {
      try {
        const response = await supplierDashboardServices.getsupplierS3Config();
        const config = response.data.data;

        if (config && config.bucket && config.access_key) {
          const s3Config = {
            region: config.region,
            bucket: config.bucket,
            access_key: config.access_key,
            secret_key: config.secret_key,
            url: config.url,
          };
          setS3Uploader(new S3Uploader(s3Config));
        }
      } catch (error) {
        console.error("Failed to initialize S3:", error);
      }
    };
    initializeS3();
  }, []);
  const addPersonToEntry = (entryId: string) => {
    const currentPersons = entry.persons || [];
    updateWorkEntry(entryId, "persons", [
      ...currentPersons,
      { name: "", role: "", contact: "" },
    ]);
  };

  const addWarrantyToEntry = (entryId: string) => {
    const currentWarranties = entry.warranties || [];
    updateWorkEntry(entryId, "warranties", [
      ...currentWarranties,
      { part: "", months: "12", supplier: "", document: null },
    ]);
  };

  const handleWarrantyDocumentUpload = async (
    file: File,
    entryId: string,
    warrantyIdx: number
  ) => {
    const result = await s3Uploader.uploadFile(file, "document");
    const StructuredResult = {
      url: result.url,
      key: result.key,
      description: file.name,
    };

    const updatedWarranties = entry.warranties.map((w: any, i: number) =>
      i === warrantyIdx ? { ...w, document: StructuredResult } : w
    );
    updateWorkEntry(entryId, "warranties", updatedWarranties);
  };

  const createFileUploadHandler = (category: string, accept: string) => {
    return () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = true;
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        files.forEach((file) =>
          handleFileUpload(file, entry.id, category, file.name)
        );
      };
      input.click();
    };
  };

  return (
    <Card
      className={`border-l-4 ${
        entry.completed
          ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
          : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
      } transition-all duration-200 hover:shadow-lg`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Badge
              variant={entry.completed ? "default" : "secondary"}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs"
            >
              Entry #{index + 1}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${
                entry.completed
                  ? "border-green-500 text-green-700"
                  : "border-orange-500 text-orange-700"
              }`}
            >
              {entry.completed ? "Completed" : "In Progress"}
            </Badge>
            <div className="text-xs text-muted-foreground">
              ${calculateEntryTotal(entry).toFixed(2)} total
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
              }
            >
              {expandedEntry === entry.id ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {!isReadOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeWorkEntry(entry.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Basic Entry Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <DateTimePicker
              value={entry.entry_date_time}
              onChange={(value) =>
                updateWorkEntry(entry.id, "entry_date_time", value)
              }
              label="Entry Date & Time"
              placeholder="Pick Entry date & time"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Technician Name</Label>
            <div className="relative top-1">
              <User className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                value={entry.technician}
                onChange={(e) =>
                  updateWorkEntry(entry.id, "technician", e.target.value)
                }
                placeholder="Technician name"
                className="pl-8 h-9 text-xs"
                readOnly={isReadOnly}
              />
            </div>
          </div>
          <DateTimePicker
            value={entry.estimated_time}
            onChange={(value) =>
              updateWorkEntry(entry.id, "estimated_time", value)
            }
            label="Estimated Time"
            placeholder="Pick estimated completion date & time"
            disabled={isReadOnly}
          />
        </div>

        {/* Work Description */}
        <div className="space-y-1">
          <Label className="text-xs">Work Description *</Label>
          <Textarea
            value={entry.description}
            onChange={(e) =>
              updateWorkEntry(entry.id, "description", e.target.value)
            }
            placeholder="Detailed description of work performed..."
            readOnly={isReadOnly}
            required
            rows={2}
            className="text-xs"
          />
        </div>

        {/* Financial Details */}
        <div className="bg-muted/20 p-3 rounded-lg space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-xs">
            <DollarSign className="h-3 w-3" />
            Financial Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Parts Cost</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={entry.parts_cost}
                  onChange={(e) =>
                    updateWorkEntry(entry.id, "parts_cost", e.target.value)
                  }
                  placeholder="0.00"
                  className="pl-8 h-8 text-xs"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Labor Cost</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={entry.labor_cost}
                  onChange={(e) =>
                    updateWorkEntry(entry.id, "labor_cost", e.target.value)
                  }
                  placeholder="0.00"
                  className="pl-8 h-8 text-xs"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GST/Tax</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={entry.gst}
                  onChange={(e) =>
                    updateWorkEntry(entry.id, "gst", e.target.value)
                  }
                  placeholder="0.00"
                  className="pl-8 h-8 text-xs"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>
          <div className="text-right p-2 bg-white dark:bg-slate-800 rounded border">
            <span className="text-sm font-bold">
              Entry Total: ${calculateEntryTotal(entry).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Expanded Details */}
        {expandedEntry === entry.id && (
          <div className="space-y-4 border-t pt-3">
            {/* Media and Documentation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Images */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-xs">
                    <Camera className="h-3 w-3" />
                    Images
                  </Label>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={createFileUploadHandler("images", "image/*")}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 min-h-[40px] max-h-[120px] overflow-y-auto">
                  {entry.images.map((image: any, idx: number) => (
                    <div key={idx} className="relative group">
                      <img
                        src={image.url}
                        alt={image.description}
                        className="w-full h-12 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => window.open(image.url, "_blank")}
                      />
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const updatedImages = entry.images.filter(
                              (_: any, i: number) => i !== idx
                            );
                            updateWorkEntry(entry.id, "images", updatedImages);
                          }}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {entry.images.length === 0 && (
                    <div className="col-span-2 text-center py-3 text-muted-foreground border-2 border-dashed rounded text-xs">
                      No images
                    </div>
                  )}
                </div>
              </div>

              {/* Videos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-xs">
                    <Video className="h-3 w-3" />
                    Videos
                  </Label>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={createFileUploadHandler("videos", "video/*")}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1 min-h-[40px] max-h-[120px] overflow-y-auto">
                  {entry.videos.map((video: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs"
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Video className="h-3 w-3 text-purple-600 flex-shrink-0" />
                        <span className="truncate">{video.description}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(video.url, "_blank")}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedVideos = entry.videos.filter(
                                (_: any, i: number) => i !== idx
                              );
                              updateWorkEntry(
                                entry.id,
                                "videos",
                                updatedVideos
                              );
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {entry.videos.length === 0 && (
                    <div className="text-center py-3 text-muted-foreground border-2 border-dashed rounded text-xs">
                      No videos
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-xs">
                    <FileText className="h-3 w-3" />
                    Documents
                  </Label>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={createFileUploadHandler(
                        "pdfs",
                        ".pdf,.doc,.docx"
                      )}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1 min-h-[40px] max-h-[120px] overflow-y-auto">
                  {entry.pdfs.map((doc: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs"
                    >
                      <div className="flex items-center gap-1 truncate">
                        <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{doc.description}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.url, "_blank")}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedDocs = entry.pdfs.filter(
                                (_: any, i: number) => i !== idx
                              );
                              updateWorkEntry(entry.id, "pdfs", updatedDocs);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {entry.pdfs.length === 0 && (
                    <div className="text-center py-3 text-muted-foreground border-2 border-dashed rounded text-xs">
                      No documents
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoices and Warranties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoices */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-xs">
                    <Receipt className="h-3 w-3" />
                    Invoices
                  </Label>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={createFileUploadHandler(
                        "invoices",
                        ".pdf,.jpg,.png"
                      )}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1 min-h-[40px] max-h-[100px] overflow-y-auto">
                  {entry.invoices.map((invoice: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded border text-xs"
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Receipt className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="truncate">{invoice.description}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(invoice.url, "_blank")}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedInvoices = entry.invoices.filter(
                                (_: any, i: number) => i !== idx
                              );
                              updateWorkEntry(
                                entry.id,
                                "invoices",
                                updatedInvoices
                              );
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {entry.invoices.length === 0 && (
                    <div className="text-center py-2 text-muted-foreground border-2 border-dashed rounded text-xs">
                      No invoices
                    </div>
                  )}
                </div>
              </div>

              {/* Warranties */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-xs">
                    <Shield className="h-3 w-3" />
                    Warranties
                  </Label>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addWarrantyToEntry(entry.id)}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1 min-h-[40px] max-h-[100px] overflow-y-auto">
                  {entry.warranties.map((warranty: any, idx: number) => (
                    <div
                      key={idx}
                      className="space-y-1 p-2 border rounded bg-muted/20"
                    >
                      <div className="grid grid-cols-3 gap-1">
                        <Input
                          placeholder="Part"
                          value={warranty.part}
                          onChange={(e) => {
                            const updatedWarranties = entry.warranties.map(
                              (w: any, i: number) =>
                                i === idx ? { ...w, part: e.target.value } : w
                            );
                            updateWorkEntry(
                              entry.id,
                              "warranties",
                              updatedWarranties
                            );
                          }}
                          className="text-xs h-7"
                          readOnly={isReadOnly}
                        />
                        <Input
                          placeholder="Months"
                          type="number"
                          value={warranty.months}
                          onChange={(e) => {
                            const updatedWarranties = entry.warranties.map(
                              (w: any, i: number) =>
                                i === idx ? { ...w, months: e.target.value } : w
                            );
                            updateWorkEntry(
                              entry.id,
                              "warranties",
                              updatedWarranties
                            );
                          }}
                          className="text-xs h-7"
                          readOnly={isReadOnly}
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="Supplier"
                            value={warranty.supplier}
                            onChange={(e) => {
                              const updatedWarranties = entry.warranties.map(
                                (w: any, i: number) =>
                                  i === idx
                                    ? { ...w, supplier: e.target.value }
                                    : w
                              );
                              updateWorkEntry(
                                entry.id,
                                "warranties",
                                updatedWarranties
                              );
                            }}
                            className="text-xs h-7"
                            readOnly={isReadOnly}
                          />
                          {!isReadOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedWarranties =
                                  entry.warranties.filter(
                                    (_: any, i: number) => i !== idx
                                  );
                                updateWorkEntry(
                                  entry.id,
                                  "warranties",
                                  updatedWarranties
                                );
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Warranty Document Upload */}
                      <div className="flex items-center gap-2">
                        {warranty.document ? (
                          <div className="flex items-center gap-1 flex-1">
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span className="text-xs truncate">
                              {warranty.document.description}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(warranty.document.url, "_blank")
                              }
                              className="h-5 w-5 p-0"
                            >
                              <Eye className="h-2 w-2" />
                            </Button>
                            {!isReadOnly && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updatedWarranties =
                                    entry.warranties.map((w: any, i: number) =>
                                      i === idx ? { ...w, document: null } : w
                                    );
                                  updateWorkEntry(
                                    entry.id,
                                    "warranties",
                                    updatedWarranties
                                  );
                                }}
                                className="h-5 w-5 p-0"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          !isReadOnly && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = ".pdf,.doc,.docx,.jpg,.png";
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement)
                                    .files?.[0];
                                  if (file) {
                                    handleWarrantyDocumentUpload(
                                      file,
                                      entry.id,
                                      idx
                                    );
                                  }
                                };
                                input.click();
                              }}
                              className="h-6 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Doc
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                  {entry.warranties.length === 0 && (
                    <div className="text-center py-2 text-muted-foreground border-2 border-dashed rounded text-xs">
                      No warranties
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Persons Involved */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1 text-xs">
                  <User className="h-3 w-3" />
                  Persons Involved
                </Label>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPersonToEntry(entry.id)}
                    className="h-6 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Person
                  </Button>
                )}
              </div>
              <div className="grid gap-2 max-h-[120px] overflow-y-auto">
                {entry.persons.map((person: any, idx: number) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 border rounded bg-blue-50/50 dark:bg-blue-950/20"
                  >
                    <Input
                      placeholder="Name"
                      value={person.name}
                      onChange={(e) => {
                        const updatedPersons = entry.persons.map(
                          (p: any, i: number) =>
                            i === idx ? { ...p, name: e.target.value } : p
                        );
                        updateWorkEntry(entry.id, "persons", updatedPersons);
                      }}
                      readOnly={isReadOnly}
                      className="text-xs h-7"
                    />
                    <Input
                      placeholder="Role"
                      value={person.role}
                      onChange={(e) => {
                        const updatedPersons = entry.persons.map(
                          (p: any, i: number) =>
                            i === idx ? { ...p, role: e.target.value } : p
                        );
                        updateWorkEntry(entry.id, "persons", updatedPersons);
                      }}
                      readOnly={isReadOnly}
                      className="text-xs h-7"
                    />
                    <Input
                      placeholder="Contact"
                      value={person.contact}
                      onChange={(e) => {
                        const updatedPersons = entry.persons.map(
                          (p: any, i: number) =>
                            i === idx ? { ...p, contact: e.target.value } : p
                        );
                        updateWorkEntry(entry.id, "persons", updatedPersons);
                      }}
                      readOnly={isReadOnly}
                      className="text-xs h-7"
                    />
                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedPersons = entry.persons.filter(
                            (_: any, i: number) => i !== idx
                          );
                          updateWorkEntry(entry.id, "persons", updatedPersons);
                        }}
                        className="h-7"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {entry.persons.length === 0 && (
                  <div className="text-center py-3 text-muted-foreground border-2 border-dashed rounded text-xs">
                    No persons added
                  </div>
                )}
              </div>
            </div>

            {/* Quality Check */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm font-semibold">
                <ClipboardCheck className="h-4 w-4" />
                Quality Check for this Entry
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                {Object.entries(entry.quality_check)
                  .filter(([key]) => key !== "notes")
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${entry.id}-${key}`}
                        checked={value as boolean}
                        onChange={(e) => {
                          const updatedQualityCheck = {
                            ...entry.quality_check,
                            [key]: e.target.checked,
                          };
                          updateWorkEntry(
                            entry.id,
                            "quality_check",
                            updatedQualityCheck
                          );
                        }}
                        disabled={isReadOnly}
                        className="h-3 w-3"
                      />
                      <Label
                        htmlFor={`${entry.id}-${key}`}
                        className="text-xs capitalize"
                      >
                        {key.replace(/_/g, " ")}
                        {value && (
                          <CheckCircle2 className="h-3 w-3 text-green-500 ml-1 inline" />
                        )}
                      </Label>
                    </div>
                  ))}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quality Check Notes</Label>
                <Textarea
                  value={entry.quality_check.notes}
                  onChange={(e) => {
                    const updatedQualityCheck = {
                      ...entry.quality_check,
                      notes: e.target.value,
                    };
                    updateWorkEntry(
                      entry.id,
                      "quality_check",
                      updatedQualityCheck
                    );
                  }}
                  placeholder="Quality check notes and observations..."
                  rows={2}
                  readOnly={isReadOnly}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                Comments for this Entry
              </Label>
              <Textarea
                value={entry.comments}
                onChange={(e) =>
                  updateWorkEntry(entry.id, "comments", e.target.value)
                }
                placeholder="Additional comments, notes, or observations for this specific work entry..."
                rows={2}
                readOnly={isReadOnly}
                className="text-xs"
              />
            </div>

            {/* Completion Status */}
            <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
              <input
                type="checkbox"
                id={`completed-${entry.id}`}
                checked={entry.completed}
                onChange={(e) =>
                  updateWorkEntry(entry.id, "completed", e.target.checked)
                }
                disabled={isReadOnly}
                className="h-4 w-4"
              />
              <Label
                htmlFor={`completed-${entry.id}`}
                className="flex items-center gap-2 font-medium text-sm"
              >
                Mark this entry as completed
                {entry.completed && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkEntryCard;
