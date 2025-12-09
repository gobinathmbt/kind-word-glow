import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Loader2, FileText, Plus } from "lucide-react";
import PdfReportGenerator from "./PdfReportGenerator";
import ConfigurationSelectionDialog from "./ConfigurationSelectionDialog";
import { masterInspectionServices } from "@/api/services";
import InsertWorkshopFieldModal from "../workshop/InsertWorkshopFieldModal";
import MediaViewer, { MediaItem } from "@/components/common/MediaViewer";
import MasterInspectionHeader from "@/components/inspection/MasterInspectionSupport/MasterInspectionHeader";
import CategorySection from "@/components/inspection/MasterInspectionSupport/CategorySection";
import SectionAccordion from "@/components/inspection/MasterInspectionSupport/SectionAccordion";
import AddTradeinCategoryDialog from "@/components/tradein/AddTradeincategoryDialog";

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
  const [formWorkshopFlags, setFormWorkshopFlags] = useState<any>({});
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPdfUrl, setReportPdfUrl] = useState("");
  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [calculations, setCalculations] = useState<any>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [showConfigDialog, setShowConfigDialog] = useState(false);
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
  const [categoryPdfs, setCategoryPdfs] = useState<{ [key: string]: string }>(
    {}
  );
  const [workshopSections, setWorkshopSections] = useState<any[]>([]);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [selectedCategoryForSection, setSelectedCategoryForSection] = useState<string | null>(null);
  
  // Edit/Delete states for template free mode
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  
  const [isEditSectionDialogOpen, setIsEditSectionDialogOpen] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState<any>(null);
  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<any>(null);
  
  const [isEditFieldDialogOpen, setIsEditFieldDialogOpen] = useState(false);
  const [fieldToEditInTemplate, setFieldToEditInTemplate] = useState<any>(null);
  const [isDeleteFieldDialogOpen, setIsDeleteFieldDialogOpen] = useState(false);
  const [fieldToDeleteInTemplate, setFieldToDeleteInTemplate] = useState<any>(null);
  const [isResetTemplateDialogOpen, setIsResetTemplateDialogOpen] = useState(false);

  const handlePdfUploaded = (pdfUrl: string) => {
    if (vehicle_type === "inspection" && selectedCategory) {
      // Store PDF URL for the specific category
      setCategoryPdfs((prev) => ({
        ...prev,
        [selectedCategory]: pdfUrl,
      }));
      // Also update the main report PDF URL
      setReportPdfUrl(pdfUrl);
    } else if (vehicle_type === "tradein" && selectedCategory) {
      // For trade-in, store as single PDF
      setCategoryPdfs((prev) => ({
        ...prev,
        [selectedCategory]: pdfUrl,
      }));
      // Also update the main report PDF URL
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
      setLoading(true);
      const response = await masterInspectionServices.getMasterConfiguration(
        company_id!,
        vehicle_type!,
        vehicle_stock_id,
        configId
      );
      const data = response.data.data;

      // Check if vehicle was saved with template-free mode
      if (data.company.last_config_id === "template_free_mode" && vehicle_stock_id) {
        // Load vehicle data to reconstruct config from saved structure
        const vehicleResponse = await axios.get(
          `/api/master-inspection/view/${company_id}/${vehicle_stock_id}/${vehicle_type}`
        );
        const vehicleData = vehicleResponse.data.data;

        if (vehicleData.result && vehicleData.result.length > 0) {
          // Reconstruct config from saved data
          const reconstructedConfig = {
            _id: "template_free_mode",
            config_name: "Template Free Mode",
            description: "Create and fill details on the spot",
            categories: vehicleData.result,
            is_active: true,
            version: "1.0",
          };

          setConfig(reconstructedConfig);
          setDropdowns(data.dropdowns);
          setS3Config(data.s3Config);
          
          if (data.s3Config) {
            setS3Uploader(new S3Uploader(data.s3Config));
          }

          // Set initial category
          if (reconstructedConfig.categories.length > 0) {
            setSelectedCategory(reconstructedConfig.categories[0].category_id);
          }

          setShowConfigDialog(false);
          setConfigurationLoaded(true);
          setLoading(false);
          return;
        }
      }

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
      setWorkshopSections(data.workshopSections || []);

      if (data.s3Config) {
        setS3Uploader(new S3Uploader(data.s3Config));
      }

      // Set initial category for both inspection and tradein
      if (data.config.categories?.length > 0) {
        const sortedCategories = [...data.config.categories].sort(
          (a, b) => a.display_order - b.display_order
        );
        setSelectedCategory(sortedCategories[0].category_id);
      }

      // Show config dialog only if no config is selected and we're in edit mode
      if (mode === "edit" && !configId && !data.company.last_config_id) {
        setShowConfigDialog(true);
      } else {
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

  const handleTemplateFreeMode = () => {
    // Set a completely blank config for template-free mode - NO default categories
    const blankConfig = {
      _id: "template_free_mode",
      config_name: "Template Free Mode",
      description: "Create and fill details on the spot",
      categories: [], // Start completely empty
      is_active: true,
      version: "1.0",
    };
    
    // Batch all state updates together
    setLoading(false);
    setConfig(blankConfig);
    setSelectedCategory("");
    setShowConfigDialog(false);
    setConfigurationLoaded(true);
    
    toast.success("Template Free Mode activated. Add categories, sections, and fields as you go.");
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
        
        // Set report PDF URL if current category has a PDF
        if (selectedCategory && pdfMap[selectedCategory]) {
          setReportPdfUrl(pdfMap[selectedCategory]);
        }
      } else if (
        vehicle_type === "tradein" &&
        data.vehicle.tradein_report_pdf
      ) {
        const pdfMap: { [key: string]: string } = {};
        data.vehicle.tradein_report_pdf.forEach((pdf: any) => {
          pdfMap[pdf.category] = pdf.link;
        });
        setCategoryPdfs(pdfMap);
        
        // Set report PDF URL if current category has a PDF
        if (selectedCategory && pdfMap[selectedCategory]) {
          setReportPdfUrl(pdfMap[selectedCategory]);
        }
      }

      if (data.result && data.result.length > 0) {
        // Unified data structure handling for both inspection and tradein
        if (
          Array.isArray(data.result) &&
          data.result[0] &&
          data.result[0].category_id
        ) {
          const completeFormData: any = {};
          const completeFormNotes: any = {};
          const completeFormImages: any = {};
          const completeFormVideos: any = {};

          const completeFormWorkshopFlags: any = {};

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
                if (field.workshop_work_required !== undefined)
                  completeFormWorkshopFlags[field.field_id] = field.workshop_work_required;
              });
            });
          });

          setFormData(completeFormData);
          setFormNotes(completeFormNotes);
          setFormImages(completeFormImages);
          setFormVideos(completeFormVideos);
          setFormWorkshopFlags(completeFormWorkshopFlags);
        } else {
          // Fallback for old data structure
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

  const handleWorkshopFlagChange = (fieldId: string, required: boolean) => {
    if (isViewMode) return;

    setFormWorkshopFlags((prev) => ({
      ...prev,
      [fieldId]: required,
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
      if (!validateForm(selectedCategory)) {
      toast.error("Please fill all required fields in the current category");
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
    } else if (vehicle_type === "tradein" && selectedCategory) {
      const pdfUrl = categoryPdfs[selectedCategory];
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      } else {
        toast.error("No PDF available for this category");
      }
    } else {
      toast.error("No PDF available");
    }
  };

  const handleSaveClick = () => {
    // For both inspection and tradein, validate only the active category
    if (!validateForm(selectedCategory)) {
      toast.error("Please fill all required fields in the current category");
      return;
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
      // Dynamically import the PDF generation utility
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
          } else if(vehicle_type === "tradein" && selectedCategory){
            setCategoryPdfs((prev) => ({
              ...prev,
              [selectedCategory]: finalPdfUrl,
            }));
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
        sections: (category.sections || []).map((section: any) => ({
          section_id: section.section_id,
          section_name: section.section_name,
          description: section.description || "",
          display_order: section.display_order || 0,
          is_collapsible: section.is_collapsible,
          is_expanded_by_default: section.is_expanded_by_default,
          fields: (section.fields || []).map((field: any) => ({
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
            workshop_work_required: formWorkshopFlags[field.field_id] !== undefined ? formWorkshopFlags[field.field_id] : true,
            inspector_id: inspectorId,
            inspection_date: new Date().toISOString(),
          })),
        })),
      }));
      } else {
        inspectionResult = config.categories.map((category: any) => ({
        category_id: category.category_id,
        category_name: category.category_name,
        description: category.description || "",
        display_order: category.display_order || 0,
        is_active: category.is_active,
        sections: (category.sections || []).map((section: any) => ({
          section_id: section.section_id,
          section_name: section.section_name,
          description: section.description || "",
          display_order: section.display_order || 0,
          is_collapsible: section.is_collapsible,
          is_expanded_by_default: section.is_expanded_by_default,
          fields: (section.fields || []).map((field: any) => ({
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
            workshop_work_required: formWorkshopFlags[field.field_id] !== undefined ? formWorkshopFlags[field.field_id] : true,
            inspector_id: inspectorId,
            inspection_date: new Date().toISOString(),
          })),
        })),
      }));
      }

      const savePayload: any = {
        inspection_result: inspectionResult,
        current_category: selectedCategory, // Add current category to payload
      };

      // For template-free mode, send a special marker
      // For normal mode, send the actual config_id
      if (config._id === "template_free_mode") {
        savePayload.config_id = "template_free_mode";
      } else {
        savePayload.config_id = selectedConfigId || config._id;
      }

      // Add PDF URL to payload if regenerated successfully
      if (regeneratePdf && finalPdfUrl && selectedCategory) {
        if (vehicle_type === "inspection") {
          savePayload.inspection_report_pdf = finalPdfUrl;
        } else if (vehicle_type === "tradein") {
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
    } catch (error: any) {
      console.error("Save data error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save data";
      toast.error(errorMessage);
      console.error("Full error:", error.response?.data);
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

  // Template Free Mode - Add Category
  const handleAddCategoryInTemplateFreeMode = (categoryData: {
    category_name: string;
    category_id: string;
    description: string;
  }) => {
    // Check if category name already exists (case-insensitive)
    const categoryExists = config.categories.some(
      (cat: any) => cat.category_name.toLowerCase() === categoryData.category_name.toLowerCase()
    );

    if (categoryExists) {
      toast.error(`Category "${categoryData.category_name}" already exists. Please use a different name.`);
      return;
    }

    const newCategory = {
      category_id: categoryData.category_id || `category_${Date.now()}`,
      category_name: categoryData.category_name,
      description: categoryData.description || "",
      display_order: config.categories.length,
      is_active: true,
      sections: [],
    };

    const updatedConfig = {
      ...config,
      categories: [...config.categories, newCategory],
    };

    setConfig(updatedConfig);
    setSelectedCategory(newCategory.category_id);
    setIsAddCategoryDialogOpen(false);
    toast.success("Category added successfully. Now add sections to organize your fields.");
  };

  // Template Free Mode - Add Section
  const handleAddSectionInTemplateFreeMode = (categoryId: string) => {
    setSelectedCategoryForSection(categoryId);
    setIsAddSectionDialogOpen(true);
  };

  // Template Free Mode - Handle section creation
  const handleCreateSection = (sectionData: {
    section_name: string;
    description: string;
    is_collapsible: boolean;
    is_expanded_by_default: boolean;
  }) => {
    if (!selectedCategoryForSection) return;

    const updatedConfig = { ...config };
    const categoryIndex = updatedConfig.categories.findIndex(
      (cat: any) => cat.category_id === selectedCategoryForSection
    );

    if (categoryIndex === -1) {
      toast.error("Category not found");
      return;
    }

    const newSection = {
      section_id: `section_${Date.now()}`,
      section_name: sectionData.section_name,
      section_display_name: sectionData.section_name.toLowerCase().replace(/\s+/g, '_'),
      description: sectionData.description || "",
      display_order: updatedConfig.categories[categoryIndex].sections?.length || 0,
      is_collapsible: sectionData.is_collapsible,
      is_expanded_by_default: sectionData.is_expanded_by_default,
      fields: [],
    };

    if (!updatedConfig.categories[categoryIndex].sections) {
      updatedConfig.categories[categoryIndex].sections = [];
    }

    updatedConfig.categories[categoryIndex].sections.push(newSection);
    setConfig(updatedConfig);
    setIsAddSectionDialogOpen(false);
    setSelectedCategoryForSection(null);
    toast.success("Section added successfully. Now add fields to this section.");
  };

  // Template Free Mode - Override handleInsertWorkshopField to add fields
  const handleInsertWorkshopFieldInTemplateFreeMode = (categoryId: string) => {
    // In template free mode, this will be used to add fields
    // We'll use the existing InsertWorkshopFieldModal
    setSelectedCategoryForField(categoryId);
    setInsertFieldModalOpen(true);
  };

  // Template Free Mode - Edit Category
  const handleEditCategoryInTemplateFreeMode = (category: any) => {
    setCategoryToEdit(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleUpdateCategory = (categoryData: { category_name: string; category_id: string; description: string }) => {
    if (!categoryToEdit) return;
    
    // Check if the new name already exists in other categories (case-insensitive)
    const categoryExists = config.categories.some(
      (cat: any) => 
        cat.category_id !== categoryToEdit.category_id && 
        cat.category_name.toLowerCase() === categoryData.category_name.toLowerCase()
    );

    if (categoryExists) {
      toast.error(`Category "${categoryData.category_name}" already exists. Please use a different name.`);
      return;
    }
    
    const updatedConfig = { ...config };
    const categoryIndex = updatedConfig.categories.findIndex(
      (cat: any) => cat.category_id === categoryToEdit.category_id
    );
    
    if (categoryIndex !== -1) {
      updatedConfig.categories[categoryIndex] = {
        ...updatedConfig.categories[categoryIndex],
        category_name: categoryData.category_name,
        description: categoryData.description,
      };
      setConfig(updatedConfig);
      setIsEditCategoryDialogOpen(false);
      setCategoryToEdit(null);
      toast.success("Category updated successfully");
    }
  };

  // Template Free Mode - Delete Category
  const handleDeleteCategoryInTemplateFreeMode = (category: any) => {
    setCategoryToDelete(category);
    setIsDeleteCategoryDialogOpen(true);
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    
    const updatedConfig = {
      ...config,
      categories: config.categories.filter(
        (cat: any) => cat.category_id !== categoryToDelete.category_id
      ),
    };
    
    setConfig(updatedConfig);
    if (selectedCategory === categoryToDelete.category_id) {
      setSelectedCategory(updatedConfig.categories[0]?.category_id || "");
    }
    setIsDeleteCategoryDialogOpen(false);
    setCategoryToDelete(null);
    toast.success("Category deleted successfully");
  };

  // Template Free Mode - Edit Section
  const handleEditSectionInTemplateFreeMode = (section: any, categoryId: string) => {
    setSectionToEdit({ ...section, categoryId });
    setIsEditSectionDialogOpen(true);
  };

  const handleUpdateSection = (sectionData: any) => {
    if (!sectionToEdit) return;
    
    const updatedConfig = { ...config };
    const categoryIndex = updatedConfig.categories.findIndex(
      (cat: any) => cat.category_id === sectionToEdit.categoryId
    );
    
    if (categoryIndex !== -1) {
      const sectionIndex = updatedConfig.categories[categoryIndex].sections.findIndex(
        (sec: any) => sec.section_id === sectionToEdit.section_id
      );
      
      if (sectionIndex !== -1) {
        updatedConfig.categories[categoryIndex].sections[sectionIndex] = {
          ...updatedConfig.categories[categoryIndex].sections[sectionIndex],
          section_name: sectionData.section_name,
          description: sectionData.description,
          is_collapsible: sectionData.is_collapsible,
          is_expanded_by_default: sectionData.is_expanded_by_default,
        };
        setConfig(updatedConfig);
        setIsEditSectionDialogOpen(false);
        setSectionToEdit(null);
        toast.success("Section updated successfully");
      }
    }
  };

  // Template Free Mode - Delete Section
  const handleDeleteSectionInTemplateFreeMode = (section: any, categoryId: string) => {
    setSectionToDelete({ ...section, categoryId });
    setIsDeleteSectionDialogOpen(true);
  };

  const confirmDeleteSection = () => {
    if (!sectionToDelete) return;
    
    const updatedConfig = { ...config };
    const categoryIndex = updatedConfig.categories.findIndex(
      (cat: any) => cat.category_id === sectionToDelete.categoryId
    );
    
    if (categoryIndex !== -1) {
      updatedConfig.categories[categoryIndex].sections = updatedConfig.categories[
        categoryIndex
      ].sections.filter((sec: any) => sec.section_id !== sectionToDelete.section_id);
      
      setConfig(updatedConfig);
      setIsDeleteSectionDialogOpen(false);
      setSectionToDelete(null);
      toast.success("Section deleted successfully");
    }
  };

  // Template Free Mode - Edit Field
  const handleEditFieldInTemplateFreeMode = (field: any, categoryId: string, sectionId: string) => {
    setFieldToEditInTemplate({ ...field, categoryId, sectionId });
    setIsEditFieldDialogOpen(true);
  };

  const handleUpdateField = (fieldData: any) => {
    if (!fieldToEditInTemplate) return;
    
    const updatedConfig = { ...config };
    const categoryIndex = updatedConfig.categories.findIndex(
      (cat: any) => cat.category_id === fieldToEditInTemplate.categoryId
    );
    
    if (categoryIndex !== -1) {
      const sectionIndex = updatedConfig.categories[categoryIndex].sections.findIndex(
        (sec: any) => sec.section_id === fieldToEditInTemplate.sectionId
      );
      
      if (sectionIndex !== -1) {
        const fieldIndex = updatedConfig.categories[categoryIndex].sections[
          sectionIndex
        ].fields.findIndex((f: any) => f.field_id === fieldToEditInTemplate.field_id);
        
        if (fieldIndex !== -1) {
          updatedConfig.categories[categoryIndex].sections[sectionIndex].fields[fieldIndex] = {
            ...updatedConfig.categories[categoryIndex].sections[sectionIndex].fields[fieldIndex],
            ...fieldData,
          };
          setConfig(updatedConfig);
          setIsEditFieldDialogOpen(false);
          setFieldToEditInTemplate(null);
          toast.success("Field updated successfully");
        }
      }
    }
  };

  // Template Free Mode - Delete Field
  const handleDeleteFieldInTemplateFreeMode = (field: any, categoryId: string, sectionId: string) => {
    setFieldToDeleteInTemplate({ ...field, categoryId, sectionId });
    setIsDeleteFieldDialogOpen(true);
  };

  const confirmDeleteField = () => {
    if (!fieldToDeleteInTemplate) return;
    
    const updatedConfig = { ...config };
    const categoryIndex = updatedConfig.categories.findIndex(
      (cat: any) => cat.category_id === fieldToDeleteInTemplate.categoryId
    );
    
    if (categoryIndex !== -1) {
      const sectionIndex = updatedConfig.categories[categoryIndex].sections.findIndex(
        (sec: any) => sec.section_id === fieldToDeleteInTemplate.sectionId
      );
      
      if (sectionIndex !== -1) {
        updatedConfig.categories[categoryIndex].sections[sectionIndex].fields = 
          updatedConfig.categories[categoryIndex].sections[sectionIndex].fields.filter(
            (f: any) => f.field_id !== fieldToDeleteInTemplate.field_id
          );
        
        setConfig(updatedConfig);
        setIsDeleteFieldDialogOpen(false);
        setFieldToDeleteInTemplate(null);
        toast.success("Field deleted successfully");
      }
    }
  };

  // Reset Template - Clear all saved data
  const handleResetTemplate = async () => {
    try {
      setSaving(true);
      
      // Clear the saved data by sending empty result
      const resetPayload = {
        inspection_result: [],
        config_id: null, // Clear the config_id
      };

      await masterInspectionServices.saveInspectionData(
        company_id!,
        vehicle_stock_id!,
        vehicle_type!,
        resetPayload
      );

      // Reset to blank template-free mode
      const blankConfig = {
        _id: "template_free_mode",
        config_name: "Template Free Mode",
        description: "Create and fill details on the spot",
        categories: [],
        is_active: true,
        version: "1.0",
      };

      setConfig(blankConfig);
      setFormData({});
      setFormNotes({});
      setFormImages({});
      setFormVideos({});
      setFormWorkshopFlags({});
      setSelectedCategory("");
      setIsResetTemplateDialogOpen(false);
      
      toast.success("Template reset successfully. All data cleared.");
    } catch (error: any) {
      console.error("Reset template error:", error);
      toast.error(error.response?.data?.message || "Failed to reset template");
    } finally {
      setSaving(false);
    }
  };

  const addWorkshopField = async (fieldData: any) => {
    try {
      let updatedConfig = { ...config };
      const isTemplateFreeMode = config._id === "template_free_mode";

      // Find the category to add field to
      const categoryIndex = updatedConfig.categories.findIndex(
        (cat: any) => cat.category_id === selectedCategoryForField
      );

      if (categoryIndex === -1) {
        throw new Error("Category not found");
      }

      // For template-free mode, add field to the first section
      if (isTemplateFreeMode) {
        if (!updatedConfig.categories[categoryIndex].sections || updatedConfig.categories[categoryIndex].sections.length === 0) {
          toast.error("Please add a section first before adding fields");
          setInsertFieldModalOpen(false);
          return;
        }

        // Add field to the first section
        updatedConfig.categories[categoryIndex].sections[0].fields.push(fieldData);
      } else {
        // Original workshop logic for non-template-free mode
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
      }

      // Update local state
      setConfig(updatedConfig);

      toast.success(isTemplateFreeMode ? "Field added successfully" : "Workshop field added successfully");
      setInsertFieldModalOpen(false);
      setSelectedCategoryForField(null);
    } catch (error) {
      console.error("Add field error:", error);
      toast.error("Failed to add field");
    }
  };

  // Get current category PDF URL for both inspection and tradein
  const getCurrentCategoryPdfUrl = () => {
    if (vehicle_type === "inspection" && selectedCategory) {
      return categoryPdfs[selectedCategory];
    } else if (vehicle_type === "tradein" && selectedCategory) {
      return categoryPdfs[selectedCategory];
    }
    return "";
  };

  if (
    loading ||
    (mode === "edit" && !configurationLoaded && !showConfigDialog && !config)
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

  if (!config && !configurationLoaded) {
    if (mode === "edit") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <ConfigurationSelectionDialog
            isOpen={true}
            companyId={company_id!}
            vehicleType={vehicle_type!}
            onConfigurationSelected={handleConfigurationSelected}
            onTemplateFreeMode={handleTemplateFreeMode}
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

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-auto text-center shadow-lg">
          <CardContent className="pt-8 pb-6">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Configuration Error
            </h3>
            <p className="text-muted-foreground mb-6">
              Something went wrong. Please try again.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
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
          onTemplateFreeMode={handleTemplateFreeMode}
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
        onResetTemplate={config?._id === "template_free_mode" ? () => setIsResetTemplateDialogOpen(true) : undefined}
      />

      {/* Content */}
      <div className="container mx-auto px-3 sm:px-4 py-6">

        {/* Check if template free mode with no categories - show empty state */}
        {config._id === "template_free_mode" && config.categories.length === 0 ? (
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Start Building Your Evaluation</h3>
                <p className="text-muted-foreground mb-6">
                  Add your first category to organize the {vehicle_type} evaluation fields.
                </p>
              </div>
              
              <Button 
                size="lg" 
                onClick={() => setIsAddCategoryDialogOpen(true)}
                className="w-full max-w-md"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Unified category-based approach for both inspection and tradein */
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
          formWorkshopFlags={formWorkshopFlags}
          validationErrors={validationErrors}
          uploading={uploading}
          onFieldChange={handleFieldChange}
          onNotesChange={handleNotesChange}
          onWorkshopFlagChange={handleWorkshopFlagChange}
          onMultiSelectChange={handleMultiSelectChange}
          onMultiplierChange={handleMultiplierChange}
          onFileUpload={handleFileUpload}
          onRemoveImage={removeImage}
          onRemoveVideo={removeVideo}
          onEditWorkshopField={handleEditWorkshopField}
          onDeleteWorkshopField={handleDeleteWorkshopField}
          onInsertWorkshopField={config._id === "template_free_mode" ? handleInsertWorkshopFieldInTemplateFreeMode : handleInsertWorkshopField}
          onAddSection={config._id === "template_free_mode" ? handleAddSectionInTemplateFreeMode : undefined}
          onAddCategory={config._id === "template_free_mode" ? () => setIsAddCategoryDialogOpen(true) : undefined}
          onEditCategory={config._id === "template_free_mode" ? handleEditCategoryInTemplateFreeMode : undefined}
          onDeleteCategory={config._id === "template_free_mode" ? handleDeleteCategoryInTemplateFreeMode : undefined}
          onEditSection={config._id === "template_free_mode" ? handleEditSectionInTemplateFreeMode : undefined}
          onDeleteSection={config._id === "template_free_mode" ? handleDeleteSectionInTemplateFreeMode : undefined}
          onEditField={config._id === "template_free_mode" ? handleEditFieldInTemplateFreeMode : undefined}
          onDeleteField={config._id === "template_free_mode" ? handleDeleteFieldInTemplateFreeMode : undefined}
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
        selectedCategory={selectedCategory} // Pass selected category for both inspection and tradein
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

      {/* Add Field Dialog for Template Free Mode - Same as TradeinConfig */}
      {config?._id === "template_free_mode" ? (
        <Dialog open={insertFieldModalOpen} onOpenChange={setInsertFieldModalOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Field</DialogTitle>
              <DialogDescription>
                Create a new field for your evaluation
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const fieldData = {
                field_id: `field_${Date.now()}`,
                field_name: formData.get('field_name') as string,
                field_type: formData.get('field_type') as string,
                is_required: formData.get('is_required') === 'on',
                has_image: formData.get('has_image') === 'on',
                has_notes: formData.get('has_notes') === 'on',
                placeholder: formData.get('placeholder') as string,
                help_text: formData.get('help_text') as string,
                dropdown_config: formData.get('field_type') === 'dropdown' ? {
                  dropdown_name: formData.get('dropdown_name') as string,
                  allow_multiple: formData.get('allow_multiple') === 'on',
                } : undefined,
                display_order: 0,
              };
              addWorkshopField(fieldData);
            }} className="space-y-4">
              <div>
                <Label htmlFor="field_name">Field Name</Label>
                <Input
                  id="field_name"
                  name="field_name"
                  placeholder="e.g., Oil Level"
                  required
                />
              </div>
              <div>
                <Label htmlFor="field_type">Field Type</Label>
                <select
                  id="field_type"
                  name="field_type"
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="video">Video</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes/No</option>
                  <option value="calculation_field">Calculation Field</option>
                  <option value="multiplier">Multiply Field</option>
                </select>
              </div>
              <div>
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  name="placeholder"
                  placeholder="Enter placeholder text"
                />
              </div>
              <div>
                <Label htmlFor="help_text">Help Text</Label>
                <Input
                  id="help_text"
                  name="help_text"
                  placeholder="Enter help text"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_required"
                  name="is_required"
                  className="rounded"
                />
                <Label htmlFor="is_required">Required field</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_image"
                  name="has_image"
                  className="rounded"
                />
                <Label htmlFor="has_image">Include image capture</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_notes"
                  name="has_notes"
                  className="rounded"
                />
                <Label htmlFor="has_notes">Allow to enter notes</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInsertFieldModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Field</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ) : (
        /* Original Insert Workshop Field Modal for non-template-free mode */
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
      )}

      <MediaViewer
        media={mediaViewer.media}
        currentMediaId={mediaViewer.currentMediaId}
        isOpen={mediaViewer.open}
        onClose={() =>
          setMediaViewer({ open: false, media: [], currentMediaId: undefined })
        }
      />

      {/* Add Category Dialog for Template Free Mode */}
      {config?._id === "template_free_mode" && (
        <AddTradeinCategoryDialog
          isOpen={isAddCategoryDialogOpen}
          onClose={() => setIsAddCategoryDialogOpen(false)}
          onAddCategory={handleAddCategoryInTemplateFreeMode}
        />
      )}

      {/* Add Section Dialog for Template Free Mode */}
      {config?._id === "template_free_mode" && (
        <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
              <DialogDescription>
                Create a new section to organize your fields
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateSection({
                section_name: formData.get('section_name') as string,
                description: formData.get('description') as string,
                is_collapsible: formData.get('is_collapsible') === 'on',
                is_expanded_by_default: formData.get('is_expanded_by_default') === 'on',
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="section_name">Section Name</Label>
                <Input
                  id="section_name"
                  name="section_name"
                  placeholder="e.g., Vehicle Condition"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Brief description of this section"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_collapsible"
                  name="is_collapsible"
                  defaultChecked
                  className="rounded"
                />
                <Label htmlFor="is_collapsible">Collapsible section</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_expanded_by_default"
                  name="is_expanded_by_default"
                  defaultChecked
                  className="rounded"
                />
                <Label htmlFor="is_expanded_by_default">Expanded by default</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddSectionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Section</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Category Dialog */}
      {config?._id === "template_free_mode" && categoryToEdit && (
        <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateCategory({
                category_name: formData.get('category_name') as string,
                category_id: categoryToEdit.category_id,
                description: formData.get('description') as string,
              });
            }} className="space-y-4">
              <div>
                <Label>Category Name</Label>
                <Input name="category_name" defaultValue={categoryToEdit.category_name} required />
              </div>
              <div>
                <Label>Description</Label>
                <Input name="description" defaultValue={categoryToEdit.description} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditCategoryDialogOpen(false);
                  setCategoryToEdit(null);
                }}>Cancel</Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Category Confirmation */}
      {config?._id === "template_free_mode" && (
        <Dialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{categoryToDelete?.category_name}"? This will also delete all sections and fields within it.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteCategory}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Section Dialog */}
      {config?._id === "template_free_mode" && sectionToEdit && (
        <Dialog open={isEditSectionDialogOpen} onOpenChange={setIsEditSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateSection({
                section_name: formData.get('section_name') as string,
                description: formData.get('description') as string,
                is_collapsible: formData.get('is_collapsible') === 'on',
                is_expanded_by_default: formData.get('is_expanded_by_default') === 'on',
              });
            }} className="space-y-4">
              <div>
                <Label>Section Name</Label>
                <Input name="section_name" defaultValue={sectionToEdit.section_name} required />
              </div>
              <div>
                <Label>Description</Label>
                <Input name="description" defaultValue={sectionToEdit.description} />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" name="is_collapsible" defaultChecked={sectionToEdit.is_collapsible} className="rounded" />
                <Label>Collapsible section</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" name="is_expanded_by_default" defaultChecked={sectionToEdit.is_expanded_by_default} className="rounded" />
                <Label>Expanded by default</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditSectionDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Section Confirmation */}
      {config?._id === "template_free_mode" && (
        <Dialog open={isDeleteSectionDialogOpen} onOpenChange={setIsDeleteSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Section</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{sectionToDelete?.section_name}"? This will also delete all fields within it.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteSectionDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteSection}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Field Dialog */}
      {config?._id === "template_free_mode" && fieldToEditInTemplate && (
        <Dialog open={isEditFieldDialogOpen} onOpenChange={setIsEditFieldDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Field</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateField({
                field_name: formData.get('field_name') as string,
                field_type: formData.get('field_type') as string,
                is_required: formData.get('is_required') === 'on',
                has_image: formData.get('has_image') === 'on',
                has_notes: formData.get('has_notes') === 'on',
                placeholder: formData.get('placeholder') as string,
                help_text: formData.get('help_text') as string,
              });
            }} className="space-y-4">
              <div>
                <Label>Field Name</Label>
                <Input name="field_name" defaultValue={fieldToEditInTemplate.field_name} required />
              </div>
              <div>
                <Label>Field Type</Label>
                <select name="field_type" className="w-full p-2 border rounded" defaultValue={fieldToEditInTemplate.field_type}>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="video">Video</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes/No</option>
                </select>
              </div>
              <div>
                <Label>Placeholder</Label>
                <Input name="placeholder" defaultValue={fieldToEditInTemplate.placeholder} />
              </div>
              <div>
                <Label>Help Text</Label>
                <Input name="help_text" defaultValue={fieldToEditInTemplate.help_text} />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" name="is_required" defaultChecked={fieldToEditInTemplate.is_required} className="rounded" />
                <Label>Required field</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" name="has_image" defaultChecked={fieldToEditInTemplate.has_image} className="rounded" />
                <Label>Include image capture</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" name="has_notes" defaultChecked={fieldToEditInTemplate.has_notes} className="rounded" />
                <Label>Allow to enter notes</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditFieldDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Field Confirmation */}
      {config?._id === "template_free_mode" && (
        <Dialog open={isDeleteFieldDialogOpen} onOpenChange={setIsDeleteFieldDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Field</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{fieldToDeleteInTemplate?.field_name}"?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteFieldDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteField}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reset Template Confirmation Dialog */}
      {config?._id === "template_free_mode" && (
        <Dialog open={isResetTemplateDialogOpen} onOpenChange={setIsResetTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Template</DialogTitle>
              <DialogDescription>
                Are you sure you want to reset this template? This will clear all categories, sections, fields, and saved data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsResetTemplateDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleResetTemplate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Template"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
            Without Report
            </Button>
            <Button onClick={() => saveData(true)} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
           With Report
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