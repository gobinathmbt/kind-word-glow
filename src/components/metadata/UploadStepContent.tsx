import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileText,
  Database,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Clock,
  Loader2,
  Info,
  Wifi,
  WifiOff,
} from "lucide-react";

interface FieldMapping {
  [dbField: string]: string;
}

interface DataTypeMapping {
  [field: string]: string;
}

interface CustomField {
  name: string;
  type: string;
  description?: string;
}

interface ParsedData {
  records: any[];
  detectedFields: string[];
  recordCount: number;
  dataTypeAnalysis: any;
  sampleData: any[];
  batches: any[][];
  processingInfo: {
    estimatedBatches: number;
    estimatedTime: string;
    batchSize: number;
    isLargeDataset: boolean;
  };
}

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  currentBatch: number;
  totalBatches: number;
  message: string;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  batchId: string;
  estimatedTimeRemaining: number;
  canCancel: boolean;
}

interface UploadOptions {
  updateExisting: boolean;
  validateData: boolean;
  createTags: boolean;
}

interface UploadStepContentProps {
  step: number;
  socketConnected: boolean;
  connecting: boolean;
  isParsingFile: boolean;
  parsedData: ParsedData | null;
  schemaFields: any;
  fieldMapping: FieldMapping;
  dataTypeMapping: DataTypeMapping;
  customFields: CustomField[];
  customFieldMapping: FieldMapping;
  uploadOptions: UploadOptions;
  uploadProgress: UploadProgress;
  onFileUpload: () => void;
  onFieldMappingChange: (dbField: string, jsonField: string) => void;
  onDataTypeChange: (field: string, type: string) => void;
  onAddCustomField: () => void;
  onUpdateCustomField: (index: number, field: Partial<CustomField>) => void;
  onRemoveCustomField: (index: number) => void;
  onCustomFieldMapping: (customFieldName: string, jsonField: string) => void;
  onUploadOptionsChange: (options: Partial<UploadOptions>) => void;
  onStartUpload: () => void;
  onResetModal: () => void;
  onClose: () => void;
}

const UploadStepContent: React.FC<UploadStepContentProps> = ({
  step,
  socketConnected,
  connecting,
  isParsingFile,
  parsedData,
  schemaFields,
  fieldMapping,
  dataTypeMapping,
  customFields,
  customFieldMapping,
  uploadOptions,
  uploadProgress,
  onFileUpload,
  onFieldMappingChange,
  onDataTypeChange,
  onAddCustomField,
  onUpdateCustomField,
  onRemoveCustomField,
  onCustomFieldMapping,
  onUploadOptionsChange,
  onStartUpload,
  onResetModal,
  onClose,
}) => {
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Upload Vehicle Metadata</h3>
        <p className="text-muted-foreground mb-6">
          Upload JSON or Excel files with real-time progress tracking via WebSocket connection
        </p>
        
        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {socketConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Connected to upload service</span>
            </>
          ) : connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
              <span className="text-sm text-yellow-600">Connecting to upload service...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">Disconnected - Will reconnect automatically</span>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Real-time Upload Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Enhanced Processing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Real-time batch progress</li>
                <li>• WebSocket connection</li>
                <li>• Live status updates</li>
                <li>• Cancel capability</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Batch Control</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 100 records per batch</li>
                <li>• Automatic retry logic</li>
                <li>• Connection monitoring</li>
                <li>• Progress persistence</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                Real-time Socket Processing
              </span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your upload will be processed in real-time with live progress updates. Each batch of 100 records is processed individually with detailed feedback on creation, updates, and any errors.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <Button 
              onClick={onFileUpload}
              size="lg"
              disabled={isParsingFile || connecting}
            >
              {isParsingFile ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isParsingFile ? "Parsing File..." : "Select File"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Configure Field Mapping</h3>
          <p className="text-muted-foreground">
            Map your data fields to database schema with real-time socket processing
          </p>
        </div>
        <div className="text-right">
          <Badge variant="secondary" className="mb-1">
            {parsedData?.recordCount.toLocaleString()} records
          </Badge>
          {parsedData?.processingInfo.isLargeDataset && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Est. time: {parsedData.processingInfo.estimatedTime}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs mt-1">
            {socketConnected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Socket Ready</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                <span className="text-red-600">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="required" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="required">Required Fields</TabsTrigger>
          <TabsTrigger value="optional">Optional Fields</TabsTrigger>
          <TabsTrigger value="custom">Custom Fields</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        <TabsContent value="required" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Required Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Label className="font-medium">Database Field</Label>
                <Label className="font-medium">Your Data Field</Label>
                <Label className="font-medium">Data Type</Label>
                <Label className="font-medium">Sample Values</Label>
              </div>

              {schemaFields?.required?.map((field: any) => (
                <div key={field.name} className="grid grid-cols-4 gap-4 items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">*</span>
                    <div>
                      <span className="font-medium">{field.name}</span>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    </div>
                  </div>
                  <Select
                    value={fieldMapping[field.name] || ""}
                    onValueChange={(value) => onFieldMappingChange(field.name, value)}
                  >
                    <SelectTrigger className={!fieldMapping[field.name] ? "border-red-300" : ""}>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedData?.detectedFields?.map((detectedField: string) => (
                        <SelectItem key={detectedField} value={detectedField}>
                          {detectedField}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">{field.type}</Badge>
                  <div className="text-sm text-muted-foreground">
                    {fieldMapping[field.name] && parsedData?.dataTypeAnalysis?.[fieldMapping[field.name]]?.sampleValues ? (
                      <div>
                        {parsedData.dataTypeAnalysis[fieldMapping[field.name]].sampleValues
                          .slice(0, 2)
                          .map((val: any, idx: number) => (
                            <div key={idx} className="truncate">"{val}"</div>
                          ))}
                      </div>
                    ) : (
                      "Select field to see samples"
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optional Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Label className="font-medium">Database Field</Label>
                <Label className="font-medium">Your Data Field</Label>
                <Label className="font-medium">Data Type</Label>
                <Label className="font-medium">Detected Type</Label>
              </div>

              {schemaFields?.optional?.map((field: any) => (
                <div key={field.name} className="grid grid-cols-4 gap-4 items-start py-3 border-b">
                  <div>
                    <span className="font-medium">{field.name}</span>
                    <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                  </div>
                  <Select
                    value={fieldMapping[field.name] || ""}
                    onValueChange={(value) => onFieldMappingChange(field.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Skip field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Skip this field</SelectItem>
                      {parsedData?.detectedFields?.map((detectedField: string) => (
                        <SelectItem key={detectedField} value={detectedField}>
                          {detectedField}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">{field.type}</Badge>
                  <div>
                    {fieldMapping[field.name] && parsedData?.dataTypeAnalysis?.[fieldMapping[field.name]] && (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">
                          {parsedData.dataTypeAnalysis[fieldMapping[field.name]].type}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(parsedData.dataTypeAnalysis[fieldMapping[field.name]].confidence * 100)}% confidence
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Custom Fields
                <Button variant="outline" size="sm" onClick={onAddCustomField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customFields.map((customField, index) => (
                  <div key={index} className="grid grid-cols-6 gap-4 items-end p-3 border rounded-lg">
                    <div>
                      <Label>Field Name *</Label>
                      <Input
                        value={customField.name}
                        onChange={(e) =>
                          onUpdateCustomField(index, { name: e.target.value })
                        }
                        placeholder="e.g., warranty_years"
                        className={!customField.name.trim() ? "border-red-300" : ""}
                      />
                    </div>
                    <div>
                      <Label>Data Type</Label>
                      <Select
                        value={customField.type}
                        onValueChange={(value) =>
                          onUpdateCustomField(index, { type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {schemaFields?.dataTypes?.map((type: string) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Source Field</Label>
                      <Select
                        value={customFieldMapping[customField.name] || ""}
                        onValueChange={(value) =>
                          onCustomFieldMapping(customField.name, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Skip this field</SelectItem>
                          {parsedData?.detectedFields?.map((detectedField: string) => (
                            <SelectItem key={detectedField} value={detectedField}>
                              {detectedField}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Input
                        value={customField.description || ""}
                        onChange={(e) =>
                          onUpdateCustomField(index, { description: e.target.value })
                        }
                        placeholder="Optional description"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveCustomField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {customFields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No custom fields defined</p>
                    <p className="text-sm">Click "Add Field" to create custom fields that will be stored in the customFields object</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="updateExisting"
                    checked={uploadOptions.updateExisting}
                    onCheckedChange={(checked) =>
                      onUploadOptionsChange({ updateExisting: !!checked })
                    }
                  />
                  <div>
                    <Label htmlFor="updateExisting" className="font-medium">Update existing records</Label>
                    <p className="text-sm text-muted-foreground">
                      Update records that already exist (based on make, model, body, year combination)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="validateData"
                    checked={uploadOptions.validateData}
                    onCheckedChange={(checked) =>
                      onUploadOptionsChange({ validateData: !!checked })
                    }
                  />
                  <div>
                    <Label htmlFor="validateData" className="font-medium">Validate data types</Label>
                    <p className="text-sm text-muted-foreground">
                      Perform data type validation and conversion during upload
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createTags"
                    checked={uploadOptions.createTags}
                    onCheckedChange={(checked) =>
                      onUploadOptionsChange({ createTags: !!checked })
                    }
                  />
                  <div>
                    <Label htmlFor="createTags" className="font-medium">Auto-generate search tags</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create searchable tags from make, model, fuel type, etc.
                    </p>
                  </div>
                </div>
              </div>

              {parsedData?.processingInfo.isLargeDataset && (
                <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-900 dark:text-orange-100">
                      Large Dataset Detected
                    </span>
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                    <p>• Records: {parsedData.recordCount.toLocaleString()}</p>
                    <p>• Estimated batches: {parsedData.processingInfo.estimatedBatches}</p>
                    <p>• Estimated processing time: {parsedData.processingInfo.estimatedTime}</p>
                    <p>• Please keep this window open during upload</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onResetModal}>
          Start Over
        </Button>
        <Button
          onClick={onStartUpload}
          disabled={!fieldMapping.make || !fieldMapping.model}
          size="lg"
        >
          Start Upload ({parsedData?.recordCount.toLocaleString()} records)
        </Button>
      </div>
    </div>
  );

  const renderProgressStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Database className="mx-auto h-16 w-16 text-blue-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Processing Upload</h3>
        <p className="text-muted-foreground">{uploadProgress.message}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Main Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{uploadProgress.progress}%</span>
              </div>
              <Progress value={uploadProgress.progress} className="w-full h-3" />
            </div>

            {/* Batch Progress */}
            {uploadProgress.totalBatches > 1 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Batch Progress</span>
                  <span>{uploadProgress.currentBatch} / {uploadProgress.totalBatches}</span>
                </div>
                <Progress 
                  value={(uploadProgress.currentBatch / uploadProgress.totalBatches) * 100} 
                  className="w-full h-2" 
                />
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{uploadProgress.created}</div>
                <div className="text-sm text-green-800 dark:text-green-200">Created</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{uploadProgress.updated}</div>
                <div className="text-sm text-blue-800 dark:text-blue-200">Updated</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{uploadProgress.skipped}</div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">Skipped</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{uploadProgress.errors}</div>
                <div className="text-sm text-red-800 dark:text-red-200">Errors</div>
              </div>
            </div>

            {uploadProgress.isUploading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing... Please keep this window open
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!uploadProgress.isUploading && uploadProgress.progress === 100 && (
        <div className="flex justify-center">
          <Button onClick={onClose}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      )}
    </div>
  );

  switch (step) {
    case 0:
      return renderUploadStep();
    case 1:
      return renderConfigurationStep();
    case 2:
      return renderProgressStep();
    default:
      return null;
  }
};

export default UploadStepContent;