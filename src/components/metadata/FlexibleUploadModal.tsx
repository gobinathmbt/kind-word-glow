import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X } from "lucide-react";
import { vehicleMetadataServices } from "@/api/services";
import {
  metaSocketService,
  UploadProgress,
  BatchProgress,
  UploadResults,
} from "@/lib/metaSocket";
import UploadStepContent from "./UploadStepContent";

interface FlexibleUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (result: any) => void;
}

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

interface BatchStatus {
  batchNumber: number;
  status: "pending" | "sending" | "processing" | "completed" | "error";
  recordCount: number;
  results?: {
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

const BATCH_SIZE = 100;

const FlexibleUploadModal: React.FC<FlexibleUploadModalProps> = ({
  open,
  onClose,
  onUploadComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0); // 0: upload, 1: configure, 2: upload progress

  // Socket connection state
  const [socketConnected, setSocketConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // File and data states
  const [fileType, setFileType] = useState<"json" | "excel">("json");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Mapping states
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [dataTypeMapping, setDataTypeMapping] = useState<DataTypeMapping>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldMapping, setCustomFieldMapping] = useState<FieldMapping>(
    {}
  );
  const [batchStatuses, setBatchStatuses] = useState<BatchStatus[]>([]);

  // Schema and configuration
  const [schemaFields, setSchemaFields] = useState<any>(null);
  const [uploadOptions, setUploadOptions] = useState({
    updateExisting: true,
    validateData: true,
    createTags: true,
  });

  // Enhanced progress tracking with socket support
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    progress: 0,
    currentBatch: 0,
    totalBatches: 0,
    message: "",
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    batchId: "",
    estimatedTimeRemaining: 0,
    canCancel: false,
  });

  // Batch-level progress
  const [batchProgress, setBatchProgress] = useState({
    currentBatchNumber: 0,
    recordsInBatch: 0,
    recordsProcessedInBatch: 0,
    batchProgressPercent: 0,
  });

  // Initialize socket connection when modal opens
  useEffect(() => {
    if (open && !socketConnected && !connecting) {
      connectToMetaSocket();
    }
  }, [open, socketConnected, connecting]);

  // Clean up socket listeners when modal closes
  useEffect(() => {
    return () => {
      cleanupSocketListeners();
    };
  }, []);

  const connectToMetaSocket = async () => {
    setConnecting(true);
    try {
      await metaSocketService.ensureConnection();
      setSocketConnected(true);
      setupSocketListeners();
      toast.success("Connected to upload service");
    } catch (error) {
      console.error("Failed to connect to meta socket:", error);
      toast.error("Failed to connect to upload service. Using fallback mode.");
    } finally {
      setConnecting(false);
    }
  };

  const setupSocketListeners = () => {
    // Connection events
    metaSocketService.on("connected", (data) => {
      setSocketConnected(true);
    });

    metaSocketService.on("disconnected", (data) => {
      setSocketConnected(false);
      if (uploadProgress.isUploading) {
        toast.error(
          "Connection lost during upload. Please check your connection."
        );
      }
    });

    // Upload events
    metaSocketService.on("uploadStarted", (data) => {
      setUploadProgress((prev) => ({
        ...prev,
        isUploading: true,
        batchId: data.batchId,
        totalBatches: data.totalBatches,
        message: `Upload started - Processing ${data.totalRecords.toLocaleString()} records in ${
          data.totalBatches
        } batches`,
        canCancel: true,
      }));
    });

    metaSocketService.on("batchStart", (data) => {
      setBatchProgress({
        currentBatchNumber: data.batchNumber,
        recordsInBatch: data.recordsInBatch,
        recordsProcessedInBatch: 0,
        batchProgressPercent: 0,
      });
      setUploadProgress((prev) => ({
        ...prev,
        message: `Processing batch ${data.batchNumber} of ${data.totalBatches} (${data.recordsInBatch} records)`,
      }));
    });

    metaSocketService.on("batchProgress", (data: BatchProgress) => {
      setBatchProgress({
        currentBatchNumber: data.batchNumber,
        recordsInBatch: data.totalRecordsInBatch,
        recordsProcessedInBatch: data.recordsProcessed,
        batchProgressPercent: data.progressInBatch,
      });
    });

    metaSocketService.on("batchComplete", (data) => {
      console.log("Batch completed:", data);
    });

    metaSocketService.on("uploadProgress", (data: UploadProgress) => {
      setUploadProgress((prev) => ({
        ...prev,
        progress: data.progress,
        currentBatch: data.currentBatch,
        totalBatches: data.totalBatches,
        processed: data.results.processed,
        created: data.results.created,
        updated: data.results.updated,
        skipped: data.results.skipped,
        errors: data.results.errors,
        estimatedTimeRemaining: data.estimatedTimeRemaining || 0,
        message: `Batch ${data.currentBatch} of ${data.totalBatches} - ${data.progress}% complete`,
      }));
    });

    metaSocketService.on(
      "uploadCompleted",
      (data: { success: boolean; data: UploadResults; duration?: number }) => {
        const results = data.data;
        setUploadProgress((prev) => ({
          ...prev,
          isUploading: false,
          progress: 100,
          message: `Upload completed successfully! (${
            data.duration ? Math.round(data.duration / 1000) : "Unknown"
          } seconds)`,
          canCancel: false,
        }));

        toast.success(
          `Upload completed! Created: ${results.created}, Updated: ${
            results.updated
          }, Skipped: ${results.skipped}${
            results.errors.length > 0
              ? `, Errors: ${results.errors.length}`
              : ""
          }`
        );

        onUploadComplete(results);
        setTimeout(() => {
          onClose();
          resetModal();
        }, 3000);
      }
    );

    metaSocketService.on("uploadError", (data) => {
      setUploadProgress((prev) => ({
        ...prev,
        isUploading: false,
        message: `Upload failed: ${data.error}`,
        canCancel: false,
      }));
      toast.error("Upload failed: " + data.error);
    });

    metaSocketService.on("uploadCancelled", (data) => {
      setUploadProgress((prev) => ({
        ...prev,
        isUploading: false,
        message: "Upload cancelled by user",
        canCancel: false,
      }));
      toast.info("Upload cancelled");
    });

    metaSocketService.on("error", (error) => {
      console.error("Meta socket error:", error);
      toast.error(
        "Upload service error: " + (error.message || "Unknown error")
      );
    });
  };

  const cleanupSocketListeners = () => {
    const events = [
      "connected",
      "disconnected",
      "uploadStarted",
      "batchStart",
      "batchProgress",
      "batchComplete",
      "uploadProgress",
      "uploadCompleted",
      "uploadError",
      "uploadCancelled",
      "error",
    ];

    events.forEach((event) => {
      metaSocketService.off(event);
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isJsonFile = file.name.endsWith(".json");
    const isExcelFile =
      file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isJsonFile && !isExcelFile) {
      toast.error("Please select a JSON or Excel file");
      return;
    }

    setFileType(isJsonFile ? "json" : "excel");
    setIsParsingFile(true);

    try {
      toast.loading("Parsing file and creating batches...", {
        id: "file-parse",
      });

      let parsedRecords = [];

      if (isJsonFile) {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        if (Array.isArray(jsonData)) {
          parsedRecords = jsonData;
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          parsedRecords = jsonData.data;
        } else if (typeof jsonData === "object") {
          parsedRecords = [jsonData];
        } else {
          throw new Error("Invalid JSON structure - expected array of objects");
        }
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRecords = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      }

      // Create batches
      const batches: any[][] = [];
      for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
        batches.push(parsedRecords.slice(i, i + BATCH_SIZE));
      }

      // Analyze data types
      const detectedFields =
        parsedRecords.length > 0 ? Object.keys(parsedRecords[0]) : [];
      const dataTypeAnalysis = analyzeDataTypesFrontend(parsedRecords);

      const processingInfo = {
        estimatedBatches: batches.length,
        estimatedTime: `${Math.ceil(batches.length * 2)} minutes`,
        batchSize: BATCH_SIZE,
        isLargeDataset: parsedRecords.length > 5000,
      };

      setParsedData({
        records: parsedRecords,
        batches,
        detectedFields,
        recordCount: parsedRecords.length,
        dataTypeAnalysis,
        sampleData: parsedRecords.slice(0, 10),
        processingInfo,
      });

      // Initialize batch statuses
      const initialBatchStatuses: BatchStatus[] = batches.map(
        (batch, index) => ({
          batchNumber: index + 1,
          status: "pending",
          recordCount: batch.length,
        })
      );
      setBatchStatuses(initialBatchStatuses);

      toast.success(
        `File parsed successfully! ${parsedRecords.length} records divided into ${batches.length} batches`
      );
      loadSchemaFields();
      setStep(1);
    } catch (error) {
      console.error("File parsing error:", error);
      toast.error(
        "Error parsing file: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsParsingFile(false);
      toast.dismiss("file-parse");
    }
  };

  // Data type analysis helper
  const analyzeDataTypesFrontend = (data: any[]) => {
    const analysis: any = {};

    if (!data || data.length === 0) return analysis;

    const sampleSize = Math.min(100, data.length);
    const fields = Object.keys(data[0]);

    fields.forEach((field) => {
      const values = data
        .slice(0, sampleSize)
        .map((row) => row[field])
        .filter((val) => val !== null && val !== undefined && val !== "");

      if (values.length === 0) {
        analysis[field] = { type: "String", confidence: 0, sampleValues: [] };
        return;
      }

      let numberCount = 0;
      let integerCount = 0;
      let booleanCount = 0;
      let dateCount = 0;
      const sampleValues = values.slice(0, 5);

      values.forEach((value) => {
        const str = String(value).toLowerCase().trim();

        if (["true", "false", "1", "0", "yes", "no"].includes(str)) {
          booleanCount++;
        }

        if (!isNaN(parseFloat(value)) && value !== "") {
          numberCount++;
          if (Number.isInteger(parseFloat(value))) {
            integerCount++;
          }
        }

        if (!isNaN(Date.parse(value)) && value !== "") {
          dateCount++;
        }
      });

      const total = values.length;

      if (booleanCount / total > 0.8) {
        analysis[field] = {
          type: "Boolean",
          confidence: booleanCount / total,
          sampleValues,
        };
      } else if (integerCount / total > 0.8) {
        analysis[field] = {
          type: "Integer",
          confidence: integerCount / total,
          sampleValues,
        };
      } else if (numberCount / total > 0.8) {
        analysis[field] = {
          type: "Number",
          confidence: numberCount / total,
          sampleValues,
        };
      } else if (dateCount / total > 0.8) {
        analysis[field] = {
          type: "Date",
          confidence: dateCount / total,
          sampleValues,
        };
      } else {
        analysis[field] = { type: "String", confidence: 1.0, sampleValues };
      }
    });

    return analysis;
  };

  const loadSchemaFields = async () => {
    try {
      const result = await vehicleMetadataServices.getSchemaFields();
      if (result.data.success) {
        setSchemaFields(result.data.data);
      }
    } catch (error) {
      console.error("Error loading schema fields:", error);
    }
  };

  // In FlexibleUploadModal.tsx - Update handleUpload method
  // In FlexibleUploadModal.tsx - Replace the handleUpload method
  const handleUpload = async () => {
    if (!validateConfiguration()) return;

    if (!socketConnected) {
      toast.error(
        "Not connected to upload service. Please wait for connection..."
      );
      try {
        await connectToMetaSocket();
      } catch (error) {
        toast.error("Failed to connect to upload service. Upload aborted.");
        return;
      }
    }

    setStep(2);

    // Initialize progress
    setUploadProgress({
      isUploading: true,
      progress: 0,
      currentBatch: 0,
      totalBatches: parsedData?.processingInfo.estimatedBatches || 1,
      message: "Initializing upload...",
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      batchId: "",
      estimatedTimeRemaining: 0,
      canCancel: true,
    });

    try {
      const uploadData = {
        fieldMapping: {
          ...fieldMapping,
          customFields: customFieldMapping,
        },
        dataTypes: dataTypeMapping,
        customFieldTypes: Object.fromEntries(
          customFields.map((cf) => [cf.name, cf.type])
        ),
        options: uploadOptions,
        totalRecords: parsedData?.recordCount || 0,
        totalBatches: parsedData?.processingInfo.estimatedBatches || 1,
      };

      // Send configuration first, then start sequential batch processing
      metaSocketService.startSequentialUpload(
        uploadData,
        parsedData?.batches || []
      );
    } catch (error) {
      setUploadProgress((prev) => ({
        ...prev,
        isUploading: false,
        message: "Upload failed to start",
        canCancel: false,
      }));
      toast.error(
        "Upload failed to start: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      console.error("Upload error:", error);
    }
  };

  const handleFieldMappingChange = (dbField: string, jsonField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [dbField]: jsonField === "all" ? "" : jsonField,
    }));
  };

  const handleDataTypeChange = (field: string, type: string) => {
    setDataTypeMapping((prev) => ({
      ...prev,
      [field]: type,
    }));
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { name: "", type: "String" }]);
  };

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    setCustomFields((prev) =>
      prev.map((cf, i) => (i === index ? { ...cf, ...field } : cf))
    );
  };

  const removeCustomField = (index: number) => {
    const fieldName = customFields[index]?.name;
    setCustomFields((prev) => prev.filter((_, i) => i !== index));

    if (fieldName) {
      setCustomFieldMapping((prev) => {
        const newMapping = { ...prev };
        delete newMapping[fieldName];
        return newMapping;
      });
    }
  };

  const handleCustomFieldMapping = (
    customFieldName: string,
    jsonField: string
  ) => {
    setCustomFieldMapping((prev) => ({
      ...prev,
      [customFieldName]: jsonField === "all" ? "" : jsonField,
    }));
  };

  const validateConfiguration = () => {
    if (!fieldMapping.make || !fieldMapping.model) {
      toast.error("Make and Model fields are required");
      return false;
    }

    const invalidCustomFields = customFields.filter(
      (cf) => cf.name.trim() === ""
    );
    if (invalidCustomFields.length > 0) {
      toast.error("All custom fields must have names");
      return false;
    }

    const fieldNames = customFields.map((cf) => cf.name.trim().toLowerCase());
    const duplicates = fieldNames.filter(
      (name, index) => fieldNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      toast.error("Custom field names must be unique");
      return false;
    }

    return true;
  };

  const resetModal = () => {
    setStep(0);
    setParsedData(null);
    setFieldMapping({});
    setDataTypeMapping({});
    setCustomFields([]);
    setCustomFieldMapping({});
    setUploadProgress({
      isUploading: false,
      progress: 0,
      currentBatch: 0,
      totalBatches: 0,
      message: "",
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      batchId: "",
      estimatedTimeRemaining: 0,
      canCancel: false,
    });
    setBatchProgress({
      currentBatchNumber: 0,
      recordsInBatch: 0,
      recordsProcessedInBatch: 0,
      batchProgressPercent: 0,
    });
    setIsParsingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadOptionsChange = (
    options: Partial<typeof uploadOptions>
  ) => {
    setUploadOptions((prev) => ({
      ...prev,
      ...options,
    }));
  };

  const handleCloseWithReset = () => {
    onClose();
    resetModal();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Flexible Metadata Upload</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <UploadStepContent
          step={step}
          socketConnected={socketConnected}
          connecting={connecting}
          isParsingFile={isParsingFile}
          parsedData={parsedData}
          schemaFields={schemaFields}
          fieldMapping={fieldMapping}
          dataTypeMapping={dataTypeMapping}
          customFields={customFields}
          customFieldMapping={customFieldMapping}
          uploadOptions={uploadOptions}
          uploadProgress={uploadProgress}
          onFileUpload={handleFileInputClick}
          onFieldMappingChange={handleFieldMappingChange}
          onDataTypeChange={handleDataTypeChange}
          onAddCustomField={addCustomField}
          onUpdateCustomField={updateCustomField}
          onRemoveCustomField={removeCustomField}
          onCustomFieldMapping={handleCustomFieldMapping}
          onUploadOptionsChange={handleUploadOptionsChange}
          onStartUpload={handleUpload}
          onResetModal={resetModal}
          onClose={handleCloseWithReset}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};

export default FlexibleUploadModal;
