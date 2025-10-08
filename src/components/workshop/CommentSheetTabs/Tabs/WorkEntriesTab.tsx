import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Wrench } from "lucide-react";
import { FormData } from "../../CommentSheetModal";
import WorkEntryCard from "../WorkEntryCard";
import { S3Uploader } from "@/lib/s3-client";
import { supplierDashboardServices } from "@/api/services";

interface WorkEntriesTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  isReadOnly: boolean;
  uploading: boolean;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
  expandedEntry: string | null;
  setExpandedEntry: React.Dispatch<React.SetStateAction<string | null>>;
  calculateEntryTotal: (entry: any) => number;
}

const WorkEntriesTab: React.FC<WorkEntriesTabProps> = ({
  formData,
  setFormData,
  isReadOnly,
  uploading,
  setUploading,
  expandedEntry,
  setExpandedEntry,
  calculateEntryTotal,
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

  const addWorkEntry = () => {
    const newEntry = {
      id: Date.now().toString(),
      description: "",
      parts_cost: "",
      labor_cost: "",
      gst: "",
      parts_used: "",
      labor_hours: "",
      technician: formData.technician_company_assigned,
      completed: false,
      entry_date_time: "",
      estimated_time: "",
      invoices: [],
      pdfs: [],
      videos: [],
      warranties: [],
      documents: [],
      images: [],
      persons: [],
      quality_check: {
        visual_inspection: false,
        functional_test: false,
        road_test: false,
        safety_check: false,
        notes: "",
      },
      comments: "",
    };
    setFormData((prev) => ({
      ...prev,
      work_entries: [...prev.work_entries, newEntry],
    }));
    setExpandedEntry(newEntry.id);
  };

  const updateWorkEntry = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      work_entries: prev.work_entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const removeWorkEntry = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      work_entries: prev.work_entries.filter((entry) => entry.id !== id),
    }));
  };

  const handleFileUpload = async (
    file: File,
    entryId: string,
    category: string,
    description = ""
  ) => {
    setUploading(true);
    try {
      const result = await s3Uploader.uploadFile(file, category);
      const StructuredResult = {
        url: result.url,
        key: result.key,
        description: description || file.name,
      };

      const entry = formData.work_entries.find((e) => e.id === entryId);
      if (entry) {
        const updatedCategory = [
          ...(entry[category as keyof typeof entry] as any[]),
          StructuredResult,
        ];
        updateWorkEntry(entryId, category, updatedCategory);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Work Entries</h2>
        {!isReadOnly && (
          <Button
            type="button"
            onClick={addWorkEntry}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        )}  
      </div>

        {formData.work_entries.map((entry, index) => (
          <WorkEntryCard
            key={entry.id}
            entry={entry}
            index={index}
            isReadOnly={isReadOnly}
            expandedEntry={expandedEntry}
            setExpandedEntry={setExpandedEntry}
            updateWorkEntry={updateWorkEntry}
            removeWorkEntry={removeWorkEntry}
            calculateEntryTotal={calculateEntryTotal}
            handleFileUpload={handleFileUpload}
            uploading={uploading}
          />
        ))}

        {formData.work_entries.length === 0 && (
          <Card className="border-2 border-dashed border-muted-foreground/25">
            <CardContent className="text-center py-8">
              <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No work entries added yet
              </p>
              {!isReadOnly && (
                <Button
                  onClick={addWorkEntry}
                  className="bg-blue-600 hover:bg-blue-700 h-9"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        )}

    </div>
  );
};

export default WorkEntriesTab;
