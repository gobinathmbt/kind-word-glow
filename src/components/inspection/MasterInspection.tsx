import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { S3Uploader, S3Config } from "@/lib/s3-client";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import PdfReportGenerator from "./PdfReportGenerator";
import ConfigurationSelectionDialog from "./ConfigurationSelectionDialog";
import { masterInspectionServices } from "@/api/services";
import InsertWorkshopFieldModal from "../workshop/InsertWorkshopFieldModal";
import MediaViewer, { MediaItem } from "@/components/common/MediaViewer";
import MasterInspectionHeader from "@/components/inspection/MasterInspectionSupport/MasterInspectionHeader";
import CategorySection from "@/components/inspection/MasterInspectionSupport/CategorySection";
import SectionAccordion from "@/components/inspection/MasterInspectionSupport/SectionAccordion";

interface MasterInspectionProps {
  // Props for component usage
  isOpen?: boolean;
  onClose?: () => void;
  companyId?: string;
  vehicleStockId?: string;
  vehicleType?: string;
  mode?: string;
}
const MasterInspection: React.FC<MasterInspectionProps> = ({
  isOpen,
  onClose,
  companyId: propCompanyId,
  vehicleStockId: propVehicleStockId,
  vehicleType: propVehicleType,
  mode: propMode,
}) => {
  const params = useParams();
  const {
    company_id: paramCompanyId,
    vehicle_stock_id: paramVehicleStockId,
    vehicle_type: paramVehicleType,
    mode: paramMode,
  } = params;

  // Use props if available, otherwise use params
  const company_id = propCompanyId || paramCompanyId;
  const vehicle_stock_id = propVehicleStockId || paramVehicleStockId;
  const vehicle_type = propVehicleType || paramVehicleType;
  const mode = propMode || paramMode;

  // Determine if this is being used as a modal component
  const isModalComponent = isOpen !== undefined && onClose !== undefined;

  const handleBack = () => {
    if (isModalComponent && onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [dropdowns, setDropdowns] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [formNotes, setFormNotes] = useState<any>({});
  const [formImages, setFormImages] = useState<any>({});
  const [formVideos, setFormVideos] = useState<any>({});
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPdfUrl, setReportPdfUrl] = useState("");
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [calculations, setCalculations] = useState<any>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [showConfigDialog, setShowConfigDialog] = useState(true);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [editFieldModalOpen, setEditFieldModalOpen] = useState(false);
  const [selectedEditField, setSelectedEditField] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<any>(null);
  const [configurationLoaded, setConfigurationLoaded] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: boolean;
  }>({});
  const [mediaViewer, setMediaViewer] = useState<{
    open: boolean;
    media: MediaItem[];
    currentMediaId?: string;
  }>({
    open: false,
    media: [],
    currentMediaId: undefined,
  });
  const [insertFieldModalOpen, setInsertFieldModalOpen] = useState(false);
  const [selectedCategoryForField, setSelectedCategoryForField] = useState<
    string | null
  >(null);
  const [inspectorId] = useState<string>("68a405a06c25cd6de3e5619b"); // This should come from authentication
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [regeneratePdfOnSave, setRegeneratePdfOnSave] = useState(false);
  const [categoryPdfs, setCategoryPdfs] = useState<{ [key: string]: string }>(
    {}
  );

  const handlePdfUploaded = (pdfUrl: string) => {
    if (vehicle_type === "inspection" && selectedCategory) {
      // Store PDF URL for the specific category
      setCategoryPdfs((prev) => ({
        ...prev,
        [selectedCategory]: pdfUrl,
      }));
    } else {
      // For trade-in, store as single PDF
      setReportPdfUrl(pdfUrl);
    }
  };

  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    loadConfiguration();
    if (vehicle_stock_id) {
      loadVehicleData();
    }
  }, [company_id, vehicle_type]);

  const openMediaViewer = (media: MediaItem[], currentMediaId?: string) => {
    setMediaViewer({
      open: true,
      media,
      currentMediaId,
    });
  };

  const loadConfiguration = async (configId?: string) => {
    try {
      const response = await masterInspectionServices.getMasterConfiguration(
        company_id!,
        vehicle_type!,
        vehicle_stock_id,
        configId
      );
      const data = response.data.data;

      if (!data.config) {
        setConfig(null);
        setShowConfigDialog(mode === "edit");
        setConfigurationLoaded(true);
        setLoading(false);
        return;
      }

      setConfig(data.config);
      setDropdowns(data.dropdowns);
      setS3Config(data.s3Config);

      if (data.s3Config) {
        setS3Uploader(new S3Uploader(data.s3Config));
      }

      if (vehicle_type === "inspection" && data.config.categories?.length > 0) {
        const sortedCategories = [...data.config.categories].sort(
          (a, b) => a.display_order - b.display_order
        );
        setSelectedCategory(sortedCategories[0].category_id);
      }

      if (data.company.last_config_id) {
        setShowConfigDialog(false);
      }
      setConfigurationLoaded(true);
      setLoading(false);
    } catch (error: any) {
      console.error("Load configuration error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load configuration"
      );
      setConfig(null);
      setShowConfigDialog(mode === "edit");
      setLoading(false);
    }
  };


  const handleConfigurationSelected = (configId: string) => {
    setSelectedConfigId(configId);
    setShowConfigDialog(false);
    loadConfiguration(configId);
  };

  const loadVehicleData = async () => {
    try {
      const response = await axios.get(
        `/api/master-inspection/view/${company_id}/${vehicle_stock_id}/${vehicle_type}`
      );
      const data = response.data.data;

      setVehicle(data.vehicle);

      // Load existing category PDFs for inspection
      if (vehicle_type === "inspection" && data.vehicle.inspection_report_pdf) {
        const pdfMap: { [key: string]: string } = {};
        data.vehicle.inspection_report_pdf.forEach((pdf: any) => {
          pdfMap[pdf.category] = pdf.link;
        });
        setCategoryPdfs(pdfMap);
      } else if (
        vehicle_type === "tradein" &&
        data.vehicle.tradein_report_pdf
      ) {
        setReportPdfUrl(data.vehicle.tradein_report_pdf);
      }

      if (data.result && data.result.length > 0) {
        if (
          Array.isArray(data.result) &&
          data.result[0] &&
          data.result[0].category_id
        ) {
          const completeFormData: any = {};
          const completeFormNotes: any = {};
          const completeFormImages: any = {};
          const completeFormVideos: any = {};

          data.result.forEach((category: any) => {
            category.sections?.forEach((section: any) => {
              section.fields?.forEach((field: any) => {
                completeFormData[field.field_id] = field.field_value;
                if (field.notes)
                  completeFormNotes[field.field_id] = field.notes;
                if (field.images)
                  completeFormImages[field.field_id] = field.images;
                if (field.videos)
                  completeFormVideos[field.field_id] = field.videos;
              });
            });
          });

          setFormData(completeFormData);
          setFormNotes(completeFormNotes);
          setFormImages(completeFormImages);
          setFormVideos(completeFormVideos);
        } else {
          const resultObj: any = {};
          const notesObj: any = {};
          const imagesObj: any = {};
          const videosObj: any = {};

          data.result.forEach((item: any) => {
            resultObj[item.field_id] = item.value;
            if (item.notes) notesObj[item.field_id] = item.notes;
            if (item.images) imagesObj[item.field_id] = item.images;
            if (item.videos) videosObj[item.field_id] = item.videos;
          });

          setFormData(resultObj);
          setFormNotes(notesObj);
          setFormImages(imagesObj);
          setFormVideos(videosObj);
        }
      }
    } catch (error) {
      console.error("Load vehicle data error:", error);
      toast.error("Failed to load vehicle data");
    }
  };

  const handleFieldChange = (
    fieldId: string,
    value: any,
    isRequired: boolean = false
  ) => {
    if (isViewMode) return;

    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    if (isRequired && value) {
      setValidationErrors((prev) => ({
        ...prev,
        [fieldId]: false,
      }));
    }
  };

  const handleNotesChange = (fieldId: string, notes: string) => {
    if (isViewMode) return;

    setFormNotes((prev) => ({
      ...prev,
      [fieldId]: notes,
    }));
  };

  const handleMultiSelectChange = (
    fieldId: string,
    value: string,
    checked: boolean,
    isRequired: boolean = false
  ) => {
    if (isViewMode) return;

    setFormData((prev) => {
      const currentValues = prev[fieldId]
        ? Array.isArray(prev[fieldId])
          ? prev[fieldId]
          : prev[fieldId].split(",")
        : [];

      let newValues;
      if (checked) {
        newValues = [...currentValues, value];
      } else {
        newValues = currentValues.filter((v: string) => v !== value);
      }

      if (isRequired && newValues.length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          [fieldId]: false,
        }));
      }

      return {
        ...prev,
        [fieldId]: newValues,
      };
    });
  };

  const handleMultiplierChange = (
    fieldId: string,
    type: "quantity" | "price",
    value: string
  ) => {
    if (isViewMode) return;

    setFormData((prev) => {
      const currentData = prev[fieldId] || {
        quantity: "",
        price: "",
        total: 0,
      };
      const newData = { ...currentData, [type]: value };

      if (newData.quantity && newData.price) {
        const quantity = parseFloat(newData.quantity);
        const price = parseFloat(newData.price);
        newData.total = (quantity * price).toFixed(2);
      } else {
        newData.total = 0;
      }

      return {
        ...prev,
        [fieldId]: newData,
      };
    });
  };

  const handleFileUpload = async (
    fieldId: string,
    file: File,
    isImage: boolean = true
  ) => {
    if (!s3Uploader || isViewMode) return;

    setUploading((prev) => ({ ...prev, [fieldId]: true }));

    try {
      const uploadResult = await s3Uploader.uploadFile(file, "inspection");

      if (isImage) {
        setFormImages((prev) => ({
          ...prev,
          [fieldId]: [...(prev[fieldId] || []), uploadResult.url],
        }));
      } else {
        setFormVideos((prev) => ({
          ...prev,
          [fieldId]: [...(prev[fieldId] || []), uploadResult.url],
        }));
      }

      toast.success(`${isImage ? "Image" : "Video"} uploaded successfully`);
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(`Failed to upload ${isImage ? "image" : "video"}`);
    } finally {
      setUploading((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  const removeImage = (fieldId: string, imageUrl: string) => {
    if (isViewMode) return;

    setFormImages((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter(
        (url: string) => url !== imageUrl
      ),
    }));
  };

  const removeVideo = (fieldId: string, videoUrl: string) => {
    if (isViewMode) return;

    setFormVideos((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter(
        (url: string) => url !== videoUrl
      ),
    }));
  };

  const calculateFormulas = () => {
    if (!config) return;

    const newCalculations: any = {};

    if (vehicle_type === "inspection") {
      config.categories.forEach((category: any) => {
        category.calculations?.forEach((calc: any) => {
          if (!calc.is_active) return;

          let result = 0;
          calc.formula.forEach((item: any, index: number) => {
            if (item.field_id) {
              let value = 0;

              if (
                formData[item.field_id] &&
                typeof formData[item.field_id] === "object"
              ) {
                value = parseFloat(formData[item.field_id].total || 0);
              } else {
                value = parseFloat(formData[item.field_id] || 0);
              }

              if (index === 0) {
                result = value;
              } else {
                const prevOp = calc.formula[index - 1];
                switch (prevOp.operation) {
                  case "+":
                    result += value;
                    break;
                  case "-":
                    result -= value;
                    break;
                  case "*":
                    result *= value;
                    break;
                  case "/":
                    result = value !== 0 ? result / value : result;
                    break;
                }
              }
            }
          });
          newCalculations[calc.calculation_id] = result;
        });
      });
    } else {
      config.calculations?.forEach((calc: any) => {
        if (!calc.is_active) return;

        let result = 0;
        calc.formula.forEach((item: any, index: number) => {
          if (item.field_id) {
            let value = 0;

            if (
              formData[item.field_id] &&
              typeof formData[item.field_id] === "object"
            ) {
              value = parseFloat(formData[item.field_id].total || 0);
            } else {
              value = parseFloat(formData[item.field_id] || 0);
            }

            if (index === 0) {
              result = value;
            } else {
              const prevOp = calc.formula[index - 1];
              switch (prevOp.operation) {
                case "+":
                  result += value;
                  break;
                case "-":
                  result -= value;
                  break;
                case "*":
                  result *= value;
                  break;
                case "/":
                  result = value !== 0 ? result / value : result;
                  break;
              }
            }
          }
        });
        newCalculations[calc.calculation_id] = result;
      });
    }

    setCalculations(newCalculations);
  };

  useEffect(() => {
    calculateFormulas();
  }, [formData, config]);

  const validateForm = (categoryId?: string) => {
    const errors: { [key: string]: boolean } = {};
    let isValid = true;

    if (vehicle_type === "inspection") {
      // For inspection, validate only the specified category or selected category
      const targetCategoryId = categoryId || selectedCategory;
      const category = config.categories.find(
        (cat: any) => cat.category_id === targetCategoryId
      );

      if (category) {
        category.sections?.forEach((section: any) => {
          section.fields?.forEach((field: any) => {
            if (field.is_required && !formData[field.field_id]) {
              errors[field.field_id] = true;
              isValid = false;
            }
          });
        });
      }
    } else {
      config.sections?.forEach((section: any) => {
        section.fields?.forEach((field: any) => {
          if (field.is_required && !formData[field.field_id]) {
            errors[field.field_id] = true;
            isValid = false;
          }
        });
      });
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleGenerateReport = () => {
    // For inspection, validate only the active category
    if (vehicle_type === "inspection") {
      if (!validateForm(selectedCategory)) {
        toast.error("Please fill all required fields in the current category");
        return;
      }
    } else {
      // For trade-in, validate all fields
      if (!validateForm()) {
        toast.error("Please fill all required fields");
        return;
      }
    }

    setReportDialogOpen(true);
  };

  const handleViewPdf = () => {
    if (vehicle_type === "inspection" && selectedCategory) {
      const pdfUrl = categoryPdfs[selectedCategory];
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      } else {
        toast.error("No PDF available for this category");
      }
    } else if (vehicle_type === "tradein" && reportPdfUrl) {
      window.open(reportPdfUrl, "_blank");
    } else {
      toast.error("No PDF available");
    }
  };

  const handleSaveClick = () => {
    // For inspection, validate only the active category
    if (vehicle_type === "inspection") {
      if (!validateForm(selectedCategory)) {
        toast.error("Please fill all required fields in the current category");
        return;
      }
    } else {
      // For trade-in, validate all fields
      if (!validateForm()) {
        toast.error("Please fill all required fields");
        return;
      }
    }

    // Show confirmation dialog for PDF regeneration
    setSaveConfirmOpen(true);
  };

  const saveData = async (regeneratePdf: boolean = false) => {
    if (isViewMode) return;

    setSaving(true);
    let finalPdfUrl = "";

    try {
      // If regenerate PDF is requested, generate it first
      if (regeneratePdf && s3Uploader) {
        try {
          // Generate PDF programmatically using the utility function
          const { generatePdfBlob } = await import(
            "@/utils/InspectionTradeinReportpdf"
          );

          const pdfBlob = await generatePdfBlob(
            {
              formData,
              formNotes,
              formImages,
              formVideos,
              calculations,
            },
            vehicle,
            config,
            vehicle_type,
            selectedCategory
          );

          const pdfFile = new File(
            [pdfBlob],
            `report-${
              vehicle?.vehicle_stock_id || "unknown"
            }-${Date.now()}.pdf`,
            {
              type: "application/pdf",
            }
          );

          const uploadResult = await s3Uploader.uploadFile(pdfFile, "reports");
          finalPdfUrl = uploadResult.url;

          // Update category PDFs state
          if (vehicle_type === "inspection" && selectedCategory) {
            setCategoryPdfs((prev) => ({
              ...prev,
              [selectedCategory]: finalPdfUrl,
            }));
          } else {
            setReportPdfUrl(finalPdfUrl);
          }

          toast.success("PDF regenerated successfully");
        } catch (pdfError) {
          console.error("PDF generation error:", pdfError);
          toast.error("Failed to regenerate PDF, saving without PDF update");
        }
      }

      let inspectionResult: any;

      if (vehicle_type === "inspection") {
        inspectionResult = config.categories.map((category: any) => ({
          category_id: category.category_id,
          category_name: category.category_name,
          description: category.description || "",
          display_order: category.display_order || 0,
          is_active: category.is_active,
          sections: category.sections.map((section: any) => ({
            section_id: section.section_id,
            section_name: section.section_name,
            description: section.description || "",
            display_order: section.display_order || 0,
            is_collapsible: section.is_collapsible,
            is_expanded_by_default: section.is_expanded_by_default,
            fields: section.fields.map((field: any) => ({
              field_id: field.field_id,
              field_name: field.field_name,
              field_type: field.field_type,
              is_required: field.is_required,
              has_image: field.has_image,
              display_order: field.display_order || 0,
              placeholder: field.placeholder || "",
              help_text: field.help_text || "",
              field_value: formData[field.field_id] || "",
              dropdown_config: field.dropdown_config || null,
              images: formImages[field.field_id] || [],
              videos: formVideos[field.field_id] || [],
              notes: formNotes[field.field_id] || "",
              inspector_id: inspectorId,
              inspection_date: new Date().toISOString(),
            })),
          })),
        }));
      } else {
        inspectionResult = [
          {
            category_id: vehicle_type,
            category_name: config.config_name,
            description: config.description || "",
            display_order: 0,
            is_active: true,
            sections: config.sections.map((section: any) => ({
              section_id: section.section_id,
              section_name: section.section_name,
              description: section.description || "",
              display_order: section.display_order || 0,
              is_collapsible: section.is_collapsible,
              is_expanded_by_default: section.is_expanded_by_default,
              fields: section.fields.map((field: any) => ({
                field_id: field.field_id,
                field_name: field.field_name,
                field_type: field.field_type,
                is_required: field.is_required,
                has_image: field.has_image,
                display_order: field.display_order || 0,
                placeholder: field.placeholder || "",
                help_text: field.help_text || "",
                field_value: formData[field.field_id] || "",
                dropdown_config: field.dropdown_config || null,
                images: formImages[field.field_id] || [],
                videos: formVideos[field.field_id] || [],
                notes: formNotes[field.field_id] || "",
                inspector_id: inspectorId,
                inspection_date: new Date().toISOString(),
              })),
            })),
          },
        ];
      }

      const savePayload: any = {
        inspection_result: inspectionResult,
        config_id: selectedConfigId || config._id,
      };

      // Add appropriate PDF URLs to payload
      if (vehicle_type === "inspection") {
        if (regeneratePdf && finalPdfUrl) {
          savePayload.inspection_report_pdf = finalPdfUrl;
          savePayload.current_category = selectedCategory;
        }
      } else {
        if (regeneratePdf && finalPdfUrl) {
          savePayload.tradein_report_pdf = finalPdfUrl;
        }
      }

      await masterInspectionServices.saveInspectionData(
        company_id!,
        vehicle_stock_id!,
        vehicle_type!,
        savePayload
      );

      toast.success(`${vehicle_type} data saved successfully`);
    } catch (error) {
      console.error("Save data error:", error);
      toast.error("Failed to save data");
    } finally {
      setSaving(false);
      setSaveConfirmOpen(false);
    }
  };

  const getDropdownById = (dropdownId: any) => {
    if (!dropdowns) return null;

    const id =
      typeof dropdownId === "object"
        ? dropdownId._id || dropdownId.$oid
        : dropdownId;
    return dropdowns.find((d: any) => d._id === id);
  };

  const handleEditWorkshopField = (
    field: any,
    categoryIndex?: number,
    sectionIndex?: number
  ) => {
    setSelectedEditField({
      ...field,
      categoryIndex,
      sectionIndex,
    });
    setEditFieldModalOpen(true);
  };

  const handleDeleteWorkshopField = (
    field: any,
    categoryIndex?: number,
    sectionIndex?: number
  ) => {
    setFieldToDelete({
      ...field,
      categoryIndex,
      sectionIndex,
    });
    setDeleteConfirmOpen(true);
  };

  const deleteWorkshopField = async (fieldData: any) => {
    try {
      let updatedConfig = { ...config };

      if (vehicle_type === "inspection") {
        if (
          typeof fieldData.categoryIndex === "number" &&
          typeof fieldData.sectionIndex === "number"
        ) {
          updatedConfig.categories[fieldData.categoryIndex].sections[
            fieldData.sectionIndex
          ].fields = updatedConfig.categories[fieldData.categoryIndex].sections[
            fieldData.sectionIndex
          ].fields.filter((f: any) => f.field_id !== fieldData.field_id);
        }
      } else {
        if (typeof fieldData.sectionIndex === "number") {
          updatedConfig.sections[fieldData.sectionIndex].fields =
            updatedConfig.sections[fieldData.sectionIndex].fields.filter(
              (f: any) => f.field_id !== fieldData.field_id
            );
        }
      }

      setConfig(updatedConfig);

      const newFormData = { ...formData };
      const newFormNotes = { ...formNotes };
      const newFormImages = { ...formImages };
      const newFormVideos = { ...formVideos };

      delete newFormData[fieldData.field_id];
      delete newFormNotes[fieldData.field_id];
      delete newFormImages[fieldData.field_id];
      delete newFormVideos[fieldData.field_id];

      setFormData(newFormData);
      setFormNotes(newFormNotes);
      setFormImages(newFormImages);
      setFormVideos(newFormVideos);

      toast.success("Workshop field deleted successfully");
      setDeleteConfirmOpen(false);
      setFieldToDelete(null);
    } catch (error) {
      console.error("Delete field error:", error);
      toast.error("Failed to delete workshop field");
    }
  };

  const updateWorkshopField = async (fieldData: any) => {
    try {
      let updatedConfig = { ...config };

      if (vehicle_type === "inspection") {
        if (
          typeof fieldData.categoryIndex === "number" &&
          typeof fieldData.sectionIndex === "number"
        ) {
          const fieldIndex = updatedConfig.categories[
            fieldData.categoryIndex
          ].sections[fieldData.sectionIndex].fields.findIndex(
            (f: any) => f.field_id === fieldData.field_id
          );
          if (fieldIndex !== -1) {
            updatedConfig.categories[fieldData.categoryIndex].sections[
              fieldData.sectionIndex
            ].fields[fieldIndex] = fieldData;
          }
        }
      } else {
        if (typeof fieldData.sectionIndex === "number") {
          const fieldIndex = updatedConfig.sections[
            fieldData.sectionIndex
          ].fields.findIndex((f: any) => f.field_id === fieldData.field_id);
          if (fieldIndex !== -1) {
            updatedConfig.sections[fieldData.sectionIndex].fields[fieldIndex] =
              fieldData;
          }
        }
      }

      setConfig(updatedConfig);

      toast.success("Workshop field updated successfully");
      setEditFieldModalOpen(false);
      setSelectedEditField(null);
    } catch (error) {
      console.error("Update field error:", error);
      toast.error("Failed to update workshop field");
    }
  };

  // Workshop field insertion functionality
  const handleInsertWorkshopField = (categoryId?: string) => {
    setSelectedCategoryForField(categoryId || null);
    setInsertFieldModalOpen(true);
  };

  const addWorkshopField = async (fieldData: any) => {
    try {
      let updatedConfig = { ...config };

      if (vehicle_type === "inspection") {
        // Find the category to add field to
        const categoryIndex = updatedConfig.categories.findIndex(
          (cat: any) => cat.category_id === selectedCategoryForField
        );

        if (categoryIndex === -1) {
          throw new Error("Category not found");
        }

        // Find or create "at_workshop_onstaging" section
        let workshopSectionIndex = updatedConfig.categories[
          categoryIndex
        ].sections?.findIndex(
          (section: any) =>
            section.section_display_name === "at_workshop_onstaging"
        );

        if (workshopSectionIndex === -1) {
          // Create new workshop section
          const newWorkshopSection = {
            section_id: `workshop_section_${Date.now()}`,
            section_name: "At Workshop - Add On",
            section_display_name: "at_workshop_onstaging",
            display_order:
              updatedConfig.categories[categoryIndex].sections?.length || 0,
            is_collapsible: true,
            is_expanded_by_default: true,
            fields: [],
          };

          if (!updatedConfig.categories[categoryIndex].sections) {
            updatedConfig.categories[categoryIndex].sections = [];
          }

          updatedConfig.categories[categoryIndex].sections.push(
            newWorkshopSection
          );
          workshopSectionIndex =
            updatedConfig.categories[categoryIndex].sections.length - 1;
        }

        // Add field to workshop section
        updatedConfig.categories[categoryIndex].sections[
          workshopSectionIndex
        ].fields.push(fieldData);
      } else {
        // For trade_in, find or create workshop section as direct section
        let workshopSectionIndex = updatedConfig.sections.findIndex(
          (section: any) =>
            section.section_display_name === "at_workshop_onstaging" ||
            section.section_name.includes("At Workshop")
        );

        if (workshopSectionIndex === -1) {
          // Create new workshop section as direct section
          const newWorkshopSection = {
            section_id: `workshop_section_${Date.now()}`,
            section_name: "At Workshop - Add On",
            section_display_name: "at_workshop_onstaging",
            display_order: updatedConfig.sections.length,
            is_collapsible: true,
            is_expanded_by_default: true,
            fields: [fieldData],
          };

          updatedConfig.sections.push(newWorkshopSection);
        } else {
          // Add field to existing workshop section
          if (!updatedConfig.sections[workshopSectionIndex].fields) {
            updatedConfig.sections[workshopSectionIndex].fields = [];
          }
          updatedConfig.sections[workshopSectionIndex].fields.push(fieldData);
        }
      }

      // Update local state
      setConfig(updatedConfig);

      toast.success("Workshop field added successfully");
      setInsertFieldModalOpen(false);
      setSelectedCategoryForField(null);
    } catch (error) {
      console.error("Add workshop field error:", error);
      toast.error("Failed to add workshop field");
    }
  };

  // Get current category PDF URL for inspection
  const getCurrentCategoryPdfUrl = () => {
    if (vehicle_type === "inspection" && selectedCategory) {
      return categoryPdfs[selectedCategory];
    } else if (vehicle_type === "tradein") {
      return reportPdfUrl;
    }
    return "";
  };

  if (
    loading ||
    (mode === "edit" && !configurationLoaded && !showConfigDialog)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading configuration...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  if (!config) {
    if (mode === "edit") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <ConfigurationSelectionDialog
            isOpen={true}
            companyId={company_id!}
            vehicleType={vehicle_type!}
            onConfigurationSelected={handleConfigurationSelected}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-auto text-center shadow-lg">
          <CardContent className="pt-8 pb-6">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Configuration Not Found
            </h3>
            <p className="text-muted-foreground mb-6">
              No active {vehicle_type} configuration found. Please set up
              configuration or make one active.
            </p>
            <Button onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {showConfigDialog && company_id && vehicle_type && (
        <ConfigurationSelectionDialog
          isOpen={showConfigDialog}
          companyId={company_id}
          vehicleType={vehicle_type}
          onConfigurationSelected={handleConfigurationSelected}
        />
      )}

      {/* Header */}
      <MasterInspectionHeader
        vehicle={vehicle}
        vehicleType={vehicle_type!}
        mode={mode!}
        config={config}
        saving={saving}
        reportPdfUrl={getCurrentCategoryPdfUrl()}
        onBack={() => handleBack()}
        onGenerateReport={handleGenerateReport}
        onSave={handleSaveClick}
        onViewPdf={handleViewPdf}
        hasCurrentPdf={!!getCurrentCategoryPdfUrl()}
      />

      {/* Content */}
      <div className="container mx-auto px-3 sm:px-4 py-6">
        {vehicle_type === "inspection" ? (
          <CategorySection
            config={config}
            calculations={calculations}
            categories={config.categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            formData={formData}
            formNotes={formNotes}
            formImages={formImages}
            formVideos={formVideos}
            validationErrors={validationErrors}
            uploading={uploading}
            onFieldChange={handleFieldChange}
            onNotesChange={handleNotesChange}
            onMultiSelectChange={handleMultiSelectChange}
            onMultiplierChange={handleMultiplierChange}
            onFileUpload={handleFileUpload}
            onRemoveImage={removeImage}
            onRemoveVideo={removeVideo}
            onEditWorkshopField={handleEditWorkshopField}
            onDeleteWorkshopField={handleDeleteWorkshopField}
            onInsertWorkshopField={handleInsertWorkshopField}
            onOpenMediaViewer={openMediaViewer}
            getDropdownById={getDropdownById}
            isViewMode={isViewMode}
            isEditMode={isEditMode}
            vehicleType={vehicle_type!}
          />
        ) : (
          <SectionAccordion
            config={config}
            sections={config.sections || []}
            calculations={calculations}
            formData={formData}
            formNotes={formNotes}
            formImages={formImages}
            formVideos={formVideos}
            validationErrors={validationErrors}
            uploading={uploading}
            onFieldChange={handleFieldChange}
            onNotesChange={handleNotesChange}
            onMultiSelectChange={handleMultiSelectChange}
            onMultiplierChange={handleMultiplierChange}
            onFileUpload={handleFileUpload}
            onRemoveImage={removeImage}
            onRemoveVideo={removeVideo}
            onEditWorkshopField={handleEditWorkshopField}
            onDeleteWorkshopField={handleDeleteWorkshopField}
            onInsertWorkshopField={() => handleInsertWorkshopField()}
            onOpenMediaViewer={openMediaViewer}
            getDropdownById={getDropdownById}
            isViewMode={isViewMode}
            isEditMode={isEditMode}
            vehicleType={vehicle_type!}
          />
        )}
      </div>

      {/* Modals */}
      <PdfReportGenerator
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        data={{ formData, formNotes, formImages, formVideos, calculations }}
        vehicle={vehicle}
        config={config}
        vehicleType={vehicle_type}
        selectedCategory={
          vehicle_type === "inspection" ? selectedCategory : undefined
        }
        s3Uploader={s3Uploader}
        onPdfUploaded={handlePdfUploaded}
        inspectorId={inspectorId}
      />

      {selectedEditField && (
        <InsertWorkshopFieldModal
          open={editFieldModalOpen}
          onOpenChange={setEditFieldModalOpen}
          onFieldCreated={updateWorkshopField}
          vehicleType={vehicle_type!}
          categoryId={selectedEditField.categoryId}
          dropdowns={dropdowns}
          s3Config={s3Config}
          editMode={true}
          existingField={selectedEditField}
        />
      )}

      {/* Insert Workshop Field Modal */}
      <InsertWorkshopFieldModal
        open={insertFieldModalOpen}
        onOpenChange={setInsertFieldModalOpen}
        onFieldCreated={addWorkshopField}
        vehicleType={vehicle_type!}
        categoryId={selectedCategoryForField}
        dropdowns={dropdowns}
        s3Config={s3Config}
        editMode={false}
      />

      <MediaViewer
        media={mediaViewer.media}
        currentMediaId={mediaViewer.currentMediaId}
        isOpen={mediaViewer.open}
        onClose={() =>
          setMediaViewer({ open: false, media: [], currentMediaId: undefined })
        }
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Workshop Field</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fieldToDelete?.field_name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteWorkshopField(fieldToDelete);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Data</DialogTitle>
            <DialogDescription>
              Do you want to regenerate the{" "}
              {vehicle_type === "inspection" ? "category" : "trade-in"} PDF
              report before saving?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => saveData(false)}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              No, Save Without PDF
            </Button>
            <Button onClick={() => saveData(true)} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Yes, Regenerate PDF & Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isModalComponent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh] p-0 overflow-hidden">
          <div className="h-full overflow-y-auto">{content}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};

export default MasterInspection;
