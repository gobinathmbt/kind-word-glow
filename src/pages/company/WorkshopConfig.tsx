import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  workshopServices,
  vehicleServices,
  dropdownServices,
  configServices,
} from "@/api/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Car,
  DollarSign,
  MessageSquare,
  FileText,
  ArrowLeft,
  Settings2,
  Eye,
  CheckCircle,
  Save,
  Plus,
  Settings,
  X,
  ZoomIn,
  Video,
  HardHat,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import QuoteModal from "@/components/workshop/QuoteModal";
import ReceivedQuotesModal from "@/components/workshop/ReceivedQuotesModal";
import ChatModal from "@/components/workshop/ChatModal";
import DraggableWorkshopCategoriesList from "@/components/workshop/DraggableWorkshopCategoriesList";
import InsertWorkshopFieldModal from "@/components/workshop/InsertWorkshopFieldModal";
import { useAuth } from "@/auth/AuthContext";
import { Input } from "@/components/ui/input";
import MediaViewer, { MediaItem } from "@/components/common/MediaViewer";
import CommentSheetModal from "@/components/workshop/CommentSheetModal";
import BayBookingDialog from "@/components/workshop/BayBookingDialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ManualCompleteConfirmDialog from "@/components/workshop/ManualCompleteConfirmDialog";

const WorkshopConfig = () => {
  const { vehicleId, vehicleType } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { completeUser } = useAuth();

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [editFieldModalOpen, setEditFieldModalOpen] = useState(false);
  const [selectedEditField, setSelectedEditField] = useState<any>(null);
  const [stageSelectionModalOpen, setStageSelectionModalOpen] = useState(false);
  const [selectedCompletionStage, setSelectedCompletionStage] = useState("");
  const [availableCompletionStages, setAvailableCompletionStages] = useState<
    string[]
  >([]);
  const [vehicleDetailsModalOpen, setVehicleDetailsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<any>(null);
  const [receivedQuotesModalOpen, setReceivedQuotesModalOpen] = useState(false);
  const [messagingModalOpen, setMessagingModalOpen] = useState(false);
  const [finalWorkModalOpen, setFinalWorkModalOpen] = useState(false);
  const [viewWorkModalOpen, setViewWorkModalOpen] = useState(false);
  const [rearrangeModalOpen, setRearrangeModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [inspectionOrder, setInspectionOrder] = useState([]);
  const [colorPaletteModalOpen, setColorPaletteModalOpen] = useState(false);
  const [insertFieldModalOpen, setInsertFieldModalOpen] = useState(false);
  const [selectedCategoryForField, setSelectedCategoryForField] = useState<
    string | null
  >(null);
  const [completeWorkshopModalOpen, setCompleteWorkshopModalOpen] =
    useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [canCompleteWorkshop, setCanCompleteWorkshop] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [currentMediaItems, setCurrentMediaItems] = useState<MediaItem[]>([]);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");
  const [bayBookingDialogOpen, setBayBookingDialogOpen] = useState(false);
  const [manualQuoteAmount, setManualQuoteAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualMode, setManualMode] = useState<"quote" | "bay" | null>(null);
  const [manualConfirmDialogOpen, setManualConfirmDialogOpen] = useState(false);

  // Add refresh function
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
    toast.success("Data Refreshed");
  };

  const { data: vehicleData, isLoading: vehicleLoading } = useQuery({
    queryKey: ["workshop-vehicle-details", vehicleId],
    queryFn: async () => {
      const response = await workshopServices.getWorkshopVehicleDetails(
        vehicleId!,
        vehicleType!
      );
      return response.data;
    },
    enabled: !!vehicleId,
  });

  const vehicle = vehicleData?.data?.vehicle;
  const vehicle_quotes = vehicleData?.data?.quotes;

  // Fetch dropdowns for workshop field creation
  const { data: dropdowns } = useQuery({
    queryKey: ["dropdowns-for-workshop"],
    queryFn: async () => {
      const response = await dropdownServices.getDropdowns();
      return response.data.data;
    },
  });

  // Add this useEffect to check if all fields are completed
  useEffect(() => {
    if (vehicleData) {
      const resultData =
        vehicleType === "inspection"
          ? vehicle?.inspection_result
          : vehicle?.trade_in_result;

      if (!resultData || resultData.length === 0) {
        setCanCompleteWorkshop(false);
        setAvailableCompletionStages([]);
        return;
      }

      if (vehicle.vehicle_type === "inspection") {
        setCanCompleteWorkshop(true);

        const completableStages: string[] = [];

        vehicle.inspection_result.forEach((category: any) => {
          let hasCompletedJobs = false;
          let allFieldsCompleted = true;

          if (category.sections) {
            category.sections.forEach((section: any) => {
              if (section.fields) {
                section.fields.forEach((field: any) => {
                  const fieldStatus = getStatus(field.field_id);
                  if (fieldStatus === "completed_jobs") {
                    hasCompletedJobs = true;
                  } else if (fieldStatus && fieldStatus !== "completed_jobs") {
                    allFieldsCompleted = false;
                  }
                });
              }
            });
          }

          // Check if stage is in workshop
          const stageInWorkshop =
            Array.isArray(vehicle.workshop_progress) &&
            vehicle.workshop_progress.some(
              (item: any) =>
                item.stage_name === category.category_name &&
                item.progress === "in_progress"
            );

          // Stage is completable if it has completed jobs, is in workshop, and all fields are completed
          if (hasCompletedJobs && stageInWorkshop && allFieldsCompleted) {
            completableStages.push(category.category_name);
          }
        });

        setAvailableCompletionStages(completableStages);
      } else {
        // For trade-in: Only enable complete workshop button when ALL fields are completed
        const allFields: any[] = [];

        resultData.forEach((item: any) => {
          if (item.sections) {
            // Category with sections
            item.sections.forEach((section: any) => {
              if (section.fields) {
                allFields.push(...section.fields);
              }
            });
          } else if (item.fields) {
            // Direct section
            allFields.push(...item.fields);
          }
        });

        // For tradein, all fields must be completed
        const allCompleted =
          allFields.length > 0 &&
          allFields.every((field: any) => {
            const fieldStatus = getStatus(field.field_id);
            return fieldStatus === "completed_jobs";
          });

        setCanCompleteWorkshop(allCompleted);
        setAvailableCompletionStages([]); // Not used for tradein
      }
    }
  }, [vehicleData, vehicleType, vehicle, vehicle_quotes]);

  // Also add this check when the component first loads
  useEffect(() => {
    if (vehicleData && vehicle_quotes) {
      const resultData =
        vehicleType === "inspection"
          ? vehicle?.inspection_result
          : vehicle?.trade_in_result;

      if (!resultData || resultData.length === 0) {
        setCanCompleteWorkshop(false);
        return;
      }

      const allFields: any[] = [];

      resultData.forEach((item: any) => {
        if (item.sections) {
          item.sections.forEach((section: any) => {
            if (section.fields) {
              allFields.push(...section.fields);
            }
          });
        } else if (item.fields) {
          allFields.push(...item.fields);
        }
      });

      const allCompleted = allFields.every((field: any) => {
        const fieldStatus = getStatus(field.field_id);
        return fieldStatus === "completed_jobs";
      });

      setCanCompleteWorkshop(allCompleted);
    }
  }, [vehicleData, vehicle_quotes, vehicleType, vehicle]);

  useEffect(() => {
    if (
      vehicle &&
      vehicle.vehicle_type === "inspection" &&
      vehicle.inspection_result
    ) {
      // Get stages that are in workshop and have completed jobs
      const completableStages: string[] = [];

      vehicle.inspection_result.forEach((category: any) => {
        // Check if this stage has any completed jobs
        let hasCompletedJobs = false;

        if (category.sections) {
          category.sections.forEach((section: any) => {
            if (section.fields) {
              section.fields.forEach((field: any) => {
                const fieldStatus = getStatus(field.field_id);
                if (fieldStatus === "completed_jobs") {
                  hasCompletedJobs = true;
                }
              });
            }
          });
        }

        // Check if stage is in workshop
        const stageInWorkshop =
          Array.isArray(vehicle.workshop_progress) &&
          vehicle.workshop_progress.some(
            (item: any) =>
              item.stage_name === category.category_name &&
              item.progress === "in_progress"
          );

        if (hasCompletedJobs && stageInWorkshop) {
          completableStages.push(category.category_name);
        }
      });

      setAvailableCompletionStages(completableStages);
    }
  }, [vehicle, vehicle_quotes]);

  const deleteWorkshopFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const currentResults =
        vehicleType === "inspection"
          ? vehicle?.inspection_result
          : vehicle?.trade_in_result;

      if (!currentResults) {
        throw new Error("No vehicle results found");
      }

      let updatedResults = [...currentResults];

      if (vehicleType === "inspection") {
        const categoryIndex = updatedResults.findIndex(
          (cat) => cat.category_id === fieldData.categoryId
        );

        if (categoryIndex !== -1) {
          const sectionIndex = updatedResults[
            categoryIndex
          ].sections?.findIndex(
            (section: any) => section.section_id === fieldData.sectionId
          );

          if (sectionIndex !== -1) {
            updatedResults[categoryIndex].sections[sectionIndex].fields =
              updatedResults[categoryIndex].sections[
                sectionIndex
              ].fields.filter((f: any) => f.field_id !== fieldData.field_id);
          }
        }
      } else {
        // For trade_in, handle both category-based and direct sections
        if (fieldData.categoryId) {
          // Handle category-based structure
          const categoryIndex = updatedResults.findIndex(
            (cat) => cat.category_id === fieldData.categoryId
          );

          if (categoryIndex !== -1) {
            const sectionIndex = updatedResults[
              categoryIndex
            ].sections?.findIndex(
              (section: any) => section.section_id === fieldData.sectionId
            );

            if (sectionIndex !== -1) {
              updatedResults[categoryIndex].sections[sectionIndex].fields =
                updatedResults[categoryIndex].sections[
                  sectionIndex
                ].fields.filter((f: any) => f.field_id !== fieldData.field_id);
            }
          }
        } else {
          // Handle direct section structure
          const sectionIndex = updatedResults.findIndex(
            (section: any) => section.section_id === fieldData.sectionId
          );

          if (sectionIndex !== -1) {
            updatedResults[sectionIndex].fields = updatedResults[
              sectionIndex
            ].fields.filter((f: any) => f.field_id !== fieldData.field_id);
          }
        }
      }

      const updateField =
        vehicleType === "inspection"
          ? { inspection_result: updatedResults }
          : { trade_in_result: updatedResults };

      await vehicleServices.updateVehicle(
        vehicle._id,
        vehicle.vehicle_type,
        updateField
      );
      return updatedResults;
    },
    onSuccess: () => {
      toast.success("Workshop field deleted successfully");
      setDeleteConfirmOpen(false);
      setFieldToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete workshop field");
    },
  });

  // Update field mutation
  const updateWorkshopFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const currentResults =
        vehicleType === "inspection"
          ? vehicle?.inspection_result
          : vehicle?.trade_in_result;

      if (!currentResults) {
        throw new Error("No vehicle results found");
      }

      let updatedResults = [...currentResults];

      if (vehicleType === "inspection") {
        const categoryIndex = updatedResults.findIndex(
          (cat) => cat.category_id === fieldData.categoryId
        );

        if (categoryIndex !== -1) {
          const sectionIndex = updatedResults[
            categoryIndex
          ].sections?.findIndex(
            (section: any) => section.section_id === fieldData.sectionId
          );

          if (sectionIndex !== -1) {
            const fieldIndex = updatedResults[categoryIndex].sections[
              sectionIndex
            ].fields.findIndex((f: any) => f.field_id === fieldData.field_id);

            if (fieldIndex !== -1) {
              updatedResults[categoryIndex].sections[sectionIndex].fields[
                fieldIndex
              ] = fieldData;
            }
          }
        }
      } else {
        // For trade_in, handle both category-based and direct sections
        if (fieldData.categoryId) {
          // Handle category-based structure
          const categoryIndex = updatedResults.findIndex(
            (cat) => cat.category_id === fieldData.categoryId
          );

          if (categoryIndex !== -1) {
            const sectionIndex = updatedResults[
              categoryIndex
            ].sections?.findIndex(
              (section: any) => section.section_id === fieldData.sectionId
            );

            if (sectionIndex !== -1) {
              const fieldIndex = updatedResults[categoryIndex].sections[
                sectionIndex
              ].fields.findIndex((f: any) => f.field_id === fieldData.field_id);

              if (fieldIndex !== -1) {
                updatedResults[categoryIndex].sections[sectionIndex].fields[
                  fieldIndex
                ] = fieldData;
              }
            }
          }
        } else {
          // Handle direct section structure
          const sectionIndex = updatedResults.findIndex(
            (section: any) => section.section_id === fieldData.sectionId
          );

          if (sectionIndex !== -1) {
            const fieldIndex = updatedResults[sectionIndex].fields.findIndex(
              (f: any) => f.field_id === fieldData.field_id
            );

            if (fieldIndex !== -1) {
              updatedResults[sectionIndex].fields[fieldIndex] = fieldData;
            }
          }
        }
      }

      const updateField =
        vehicleType === "inspection"
          ? { inspection_result: updatedResults }
          : { trade_in_result: updatedResults };

      await vehicleServices.updateVehicle(
        vehicle._id,
        vehicle.vehicle_type,
        updateField
      );
      return updatedResults;
    },
    onSuccess: () => {
      toast.success("Workshop field updated successfully");
      setEditFieldModalOpen(false);
      setSelectedEditField(null);
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update workshop field");
    },
  });

  const handleOpenMediaViewer = (field: any, selectedMediaId: string) => {
    const mediaItems: MediaItem[] = [];

    // Add images
    field.images?.forEach((image: string, index: number) => {
      mediaItems.push({
        id: `${field.field_id}-image-${index}`,
        url: image,
        type: "image",
        title: `${field.field_name} - Image ${index + 1}`,
        description: field.field_value
          ? `Value: ${field.field_value}`
          : undefined,
      });
    });

    // Add videos
    field.videos?.forEach((video: string, index: number) => {
      mediaItems.push({
        id: `${field.field_id}-video-${index}`,
        url: video,
        type: "video",
        title: `${field.field_name} - Video ${index + 1}`,
        description: field.field_value
          ? `Value: ${field.field_value}`
          : undefined,
      });
    });

    setCurrentMediaItems(mediaItems);
    setCurrentMediaId(selectedMediaId);
    setMediaViewerOpen(true);
  };

  // Update vehicle inspection order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (newOrder: any) => {
      const updateField =
        vehicleType === "inspection"
          ? { inspection_result: newOrder }
          : { trade_in_result: newOrder };

      await vehicleServices.updateVehicle(
        vehicle._id,
        vehicle.vehicle_type,
        updateField
      );
    },
    onSuccess: () => {
      toast.success(`${vehicleType} order updated successfully`);
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
      setRearrangeModalOpen(false);
      // Update the local state as well
      setInspectionOrder([]);
    },
    onError: (error: any) => {
      toast.error(`Failed to update ${vehicleType} order`);
      console.error("Update order error:", error);
    },
  });

  // Complete workshop mutation
  const completeWorkshopMutation = useMutation({
    mutationFn: async (confirmation: string) => {
      const requestBody: any = { confirmation };

      // Add stageName for inspection vehicles
      if (vehicle.vehicle_type === "inspection" && selectedCompletionStage) {
        requestBody.stageName = selectedCompletionStage;
      }

      return await workshopServices.completeWorkshop(
        vehicleId!,
        vehicleType!,
        requestBody
      );
    },
    onSuccess: (response) => {
      toast.success(response.data.message);
      setCompleteWorkshopModalOpen(false);
      setConfirmText("");
      setSelectedCompletionStage("");
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
      queryClient.invalidateQueries({ queryKey: ["workshop-completion"] });

      // For inspection stage completion, don't navigate away - just refresh the page
      if (vehicle.vehicle_type === "inspection") {
        // Stay on the same page and refresh data
      } else {
        // For tradein completion, navigate back to workshop list
        setTimeout(() => navigate("/company/workshop"), 2000);
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to complete workshop"
      );
    },
  });

  // Manual quote completion mutation
  const createManualQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await workshopServices.createManualQuote(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Manual quote created successfully");
      setManualMode(null);
      setManualQuoteAmount("");
      setManualDescription("");
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
      setFinalWorkModalOpen(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create manual quote");
    },
  });

  // Manual bay completion mutation
  const createManualBayQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await workshopServices.createManualBayQuote(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Manual bay booking created successfully");
      setManualMode(null);
      setBayBookingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
      setFinalWorkModalOpen(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create manual bay booking");
    },
  });

  // Complete manual quote mutation
  const completeManualQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: any }) => {
      const response = await workshopServices.completeManualQuote(quoteId, data);
      return response.data;
    },
    onSuccess: (response) => {
      toast.success(response.message);
      setManualConfirmDialogOpen(false);
      setFinalWorkModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to complete manual quote");
    },
  });

  const canStageBeCompleted = (stageName: string) => {
    if (!vehicle.inspection_result) return false;

    const category = vehicle.inspection_result.find(
      (cat: any) => cat.category_name === stageName
    );
    if (!category) return false;

    let allFieldsCompleted = true;
    let hasFields = false;

    if (category.sections) {
      category.sections.forEach((section: any) => {
        if (section.fields) {
          section.fields.forEach((field: any) => {
            hasFields = true;
            const fieldStatus = getStatus(field.field_id);
            if (fieldStatus !== "completed_jobs") {
              allFieldsCompleted = false;
            }
          });
        }
      });
    }

    // Check if stage is in workshop
    const stageInWorkshop =
      Array.isArray(vehicle.workshop_progress) &&
      vehicle.workshop_progress.some(
        (item: any) =>
          item.stage_name === stageName && item.progress === "in_progress"
      );

    return hasFields && allFieldsCompleted && stageInWorkshop;
  };

  const handleSendQuote = (
    field: any,
    categoryId: string,
    sectionId: string
  ) => {
    setSelectedField({
      ...field,
      categoryId,
      sectionId,
      vehicle_type: vehicle?.vehicle_type,
      vehicle_stock_id: vehicle?.vehicle_stock_id,
      images: field.images || [],
      videos: field.videos || [],
    });
    setQuoteModalOpen(true);
  };
  const handleSendBay = (
    field: any,
    categoryId: string,
    sectionId: string,
    isRejected: boolean
  ) => {
    const quote = getQuote(field.field_id);
    setSelectedField({
      ...field,
      categoryId,
      sectionId,
      vehicle_type: vehicle?.vehicle_type,
      vehicle_stock_id: vehicle?.vehicle_stock_id,
      images: field.images || [],
      videos: field.videos || [],
      bay_id: quote?.bay_id || "",
      bay_rebooking: isRejected,
    });
    setBayBookingDialogOpen(true);
  };
  const handleReceivedQuotes = (
    field: any,
    categoryId: string,
    sectionId: string
  ) => {
    setSelectedField({
      ...field,
      categoryId,
      sectionId,
      vehicle_type: vehicle?.vehicle_type,
      vehicle_stock_id: vehicle?.vehicle_stock_id,
    });
    setReceivedQuotesModalOpen(true);
  };

  const handleMessaging = (
    field: any,
    categoryId: string,
    sectionId: string
  ) => {
    setSelectedField({
      ...field,
      categoryId,
      sectionId,
      quote: getQuote(field.field_id),
      vehicle_type: vehicle?.vehicle_type,
      vehicle_stock_id: vehicle?.vehicle_stock_id,
    });
    setMessagingModalOpen(true);
  };

  const handleFinalWork = (
    field: any,
    categoryId: string,
    sectionId: string
  ) => {
    setSelectedField({
      ...field,
      categoryId,
      sectionId,
      vehicle_type: vehicle?.vehicle_type,
      vehicle_stock_id: vehicle?.vehicle_stock_id,
    });
    setFinalWorkModalOpen(true);
  };

  const handleViewWork = (
    field: any,
    categoryId: string,
    sectionId: string
  ) => {
    setSelectedField({
      ...field,
      categoryId,
      sectionId,
      vehicle_type: vehicle?.vehicle_type,
      vehicle_stock_id: vehicle?.vehicle_stock_id,
    });
    setViewWorkModalOpen(true);
  };
  const handleRearrange = () => {
    // Determine which result set to use based on vehicle type
    const resultData =
      vehicleType === "inspection"
        ? vehicle?.inspection_result
        : vehicle?.trade_in_result;

    if (resultData) {
      setInspectionOrder([...resultData]);
      setRearrangeModalOpen(true);
    }
  };

  // Drag and Drop Handlers
  const handleUpdateCategoriesOrder = (categories: any[]) => {
    setInspectionOrder(categories);
  };

  const handleUpdateSectionsOrder = (
    categoryIndex: number,
    sections: any[]
  ) => {
    const newOrder = [...inspectionOrder];
    newOrder[categoryIndex] = {
      ...newOrder[categoryIndex],
      sections: sections,
    };
    setInspectionOrder(newOrder);
  };

  const handleUpdateFieldsOrder = (
    categoryIndex: number,
    sectionIndex: number,
    fields: any[]
  ) => {
    const newOrder = [...inspectionOrder];
    newOrder[categoryIndex].sections[sectionIndex] = {
      ...newOrder[categoryIndex].sections[sectionIndex],
      fields: fields,
    };
    setInspectionOrder(newOrder);
  };

  const handleSaveOrder = () => {
    if (inspectionOrder.length > 0) {
      updateOrderMutation.mutate(inspectionOrder);
    } else {
      toast.error("No changes to save");
    }
  };

  // Workshop field creation
  const handleInsertField = (categoryId?: string) => {
    setSelectedCategoryForField(categoryId || null);
    setInsertFieldModalOpen(true);
  };

  // Add workshop field mutation - UPDATED LOGIC
  const addWorkshopFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const currentResults =
        vehicleType === "inspection"
          ? vehicle?.inspection_result
          : vehicle?.trade_in_result;

      if (!currentResults) {
        throw new Error("No vehicle results found");
      }

      let updatedResults = [...currentResults];

      if (vehicleType === "inspection") {
        // Find the category to add field to
        const categoryIndex = updatedResults.findIndex(
          (cat) => cat.category_id === selectedCategoryForField
        );

        if (categoryIndex === -1) {
          throw new Error("Category not found");
        }

        // Find existing "At Workshop - Add On" section OR create if doesn't exist
        let workshopSectionIndex = updatedResults[
          categoryIndex
        ].sections?.findIndex(
          (section: any) =>
            section.section_name === "At Workshop - Add On" ||
            section.section_display_name === "at_workshop_onstaging"
        );

        if (workshopSectionIndex === -1) {
          // Create new workshop section only if it doesn't exist
          const newWorkshopSection = {
            section_id: `workshop_section_${Date.now()}`,
            section_name: "At Workshop - Add On",
            section_display_name: "at_workshop_onstaging",
            display_order: updatedResults[categoryIndex].sections?.length || 0,
            fields: [fieldData], // Add the field directly
          };

          if (!updatedResults[categoryIndex].sections) {
            updatedResults[categoryIndex].sections = [];
          }

          updatedResults[categoryIndex].sections.push(newWorkshopSection);
        } else {
          // Add field to existing workshop section
          if (
            !updatedResults[categoryIndex].sections[workshopSectionIndex].fields
          ) {
            updatedResults[categoryIndex].sections[
              workshopSectionIndex
            ].fields = [];
          }
          updatedResults[categoryIndex].sections[
            workshopSectionIndex
          ].fields.push(fieldData);
        }
      } else {
        // For trade_in, find existing workshop section OR create if doesn't exist
        let workshopSectionIndex = updatedResults.findIndex(
          (item: any) =>
            item.section_id &&
            (item.section_name === "At Workshop - Add On" ||
              item.section_display_name === "at_workshop_onstaging")
        );

        if (workshopSectionIndex === -1) {
          // Create new workshop section as direct section
          const newWorkshopSection = {
            section_id: `workshop_section_${Date.now()}`,
            section_name: "At Workshop - Add On",
            section_display_name: "at_workshop_onstaging",
            display_order: updatedResults.length,
            fields: [fieldData], // Add the field directly
          };

          updatedResults.push(newWorkshopSection);
        } else {
          // Add field to existing workshop section
          if (!updatedResults[workshopSectionIndex].fields) {
            updatedResults[workshopSectionIndex].fields = [];
          }
          updatedResults[workshopSectionIndex].fields.push(fieldData);
        }
      }

      // Update vehicle with new results
      const updateField =
        vehicleType === "inspection"
          ? { inspection_result: updatedResults }
          : { trade_in_result: updatedResults };

      await vehicleServices.updateVehicle(
        vehicle._id,
        vehicle.vehicle_type,
        updateField
      );
      return updatedResults;
    },
    onSuccess: () => {
      toast.success("Workshop field added successfully");
      setInsertFieldModalOpen(false);
      setSelectedCategoryForField(null);
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add workshop field");
      console.error("Add workshop field error:", error);
    },
  });

  const handleDiscardChanges = () => {
    setInspectionOrder([]);
    setRearrangeModalOpen(false);
  };

  // Get supplier quote for a field
  const getSupplierQuote = (field_id: string) => {
    if (!vehicle_quotes) return null;
    return vehicle_quotes.find(
      (q) => q.field_id === field_id && q.quote_type === "supplier"
    );
  };

  // Get bay quote for a field
  const getBayQuote = (field_id: string) => {
    if (!vehicle_quotes) return null;
    return vehicle_quotes.find(
      (q) => q.field_id === field_id && q.quote_type === "bay"
    );
  };

  // Get primary quote (supplier preferred, fallback to bay)
  const getQuote = (field_id: string) => {
    return getSupplierQuote(field_id) || getBayQuote(field_id);
  };

  const getStatus = (field_id: string) => {
    const quote = getQuote(field_id);
    return quote ? quote.status : null;
  };
  const getFieldBorderColor = (field: any) => {
    const status = getStatus(field.field_id);

    const statusToBorder: Record<string, string> = {
      quote_request: "border-yellow-500 border-2",
      quote_sent: "border-orange-500 border-2",
      quote_approved: "border-blue-500 border-2",
      work_in_progress: "border-purple-500 border-2",
      work_review: "border-indigo-500 border-2",
      completed_jobs: "border-green-500 border-2",
      rework: "border-red-500 border-2",
      // Bay quote specific statuses (unique colors)
      booking_request: "border-pink-500 border-2",
      booking_accepted: "border-teal-500 border-2",
      booking_rejected: "border-rose-500 border-2",
    };

    return statusToBorder[status] || "border-gray-500 border-2";
  };

  const getBadgeColor = (status: string | undefined) => {
    const statusToBadge: Record<string, string> = {
      quote_request: "bg-yellow-500 text-white",
      quote_sent: "bg-orange-500 text-white",
      quote_approved: "bg-blue-500 text-white",
      work_in_progress: "bg-purple-500 text-white",
      work_review: "bg-indigo-500 text-white",
      completed_jobs: "bg-green-500 text-white",
      rework: "bg-red-500 text-white",
      // Bay quote specific statuses (unique colors)
      booking_request: "bg-pink-500 text-white",
      booking_accepted: "bg-teal-500 text-white",
      booking_rejected: "bg-rose-500 text-white",
    };

    return `px-2 py-1 rounded-md text-xs font-semibold ${
      statusToBadge[status || ""] || "bg-gray-500 text-white"
    }`;
  };

  const handleEditField = (
    field: any,
    categoryId: string | null,
    sectionId: string
  ) => {
    setSelectedEditField({
      ...field,
      categoryId,
      sectionId,
    });
    setEditFieldModalOpen(true);
  };

  const handleDeleteField = (
    field: any,
    categoryId: string | null,
    sectionId: string
  ) => {
    setFieldToDelete({
      ...field,
      categoryId,
      sectionId,
    });
    setDeleteConfirmOpen(true);
  };

  const handleCompleteWorkshop = () => {
    if (vehicle.vehicle_type === "inspection") {
      // For inspection, always show stage selection (if there are completable stages)
      if (availableCompletionStages.length > 0) {
        setStageSelectionModalOpen(true);
      } else {
        toast.error(
          "No stages are ready for completion. Ensure at least one stage has all jobs completed and is in workshop."
        );
      }
    } else {
      // For tradein, check if all jobs are completed
      if (canCompleteWorkshop) {
        setCompleteWorkshopModalOpen(true);
      } else {
        toast.error(
          "All workshop jobs must be completed before finishing workshop"
        );
      }
    }
  };

  const handleStageCompletion = () => {
    if (!selectedCompletionStage) {
      toast.error("Please select a stage to complete");
      return;
    }

    setStageSelectionModalOpen(false);
    setCompleteWorkshopModalOpen(true);
  };

  const handleConfirmCompleteWorkshop = () => {
    if (confirmText === "CONFIRM") {
      completeWorkshopMutation.mutate(confirmText);
    } else {
      toast.error("Please type CONFIRM to complete workshop");
    }
  };

  if (vehicleLoading) {
    return (
      <DashboardLayout title="Workshop Configuration">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!vehicle) {
    return (
      <DashboardLayout title="Workshop Configuration">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Vehicle not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const renderResults = (vehicleType: string) => {
    const resultData =
      vehicleType === "inspection"
        ? vehicle.inspection_result
        : vehicle.trade_in_result;

    if (!resultData || resultData.length === 0) {
      return (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                No {vehicleType} results available
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/company/workshop")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Fixed Header Section */}
        <div className="sticky top-0 z-10 bg-background py-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {vehicleType
                ? vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)
                : ""}{" "}
              Results
            </h3>

            <div className="flex gap-2">
              {/* Insert Field button for tradein (no categories) */}
              {vehicleType === "tradein" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        onClick={() => handleInsertField()}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Insert Field</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <div className="lg:hidden">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setVehicleDetailsModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Car className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vehicle Details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Refresh Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleRearrange}
                      className="flex items-center gap-2"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Rearrange</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setColorPaletteModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      🎨
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stage Legend</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/company/workshop")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Back to List</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Complete Workshop Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      onClick={() => handleCompleteWorkshop()}
                      disabled={
                        vehicle.vehicle_type === "inspection"
                          ? false // Always enabled for inspection (will show appropriate message if no stages ready)
                          : !canCompleteWorkshop ||
                            completeWorkshopMutation.isPending // For tradein, check if all completed
                      }
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {completeWorkshopMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complete Workshop</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="pt-4">
          {vehicleType === "inspection"
            ? // Render inspection results (categories with sections)
              resultData.map((category: any, categoryIndex: number) => (
                <Card key={categoryIndex} className="mb-4">
                  {category.sections?.length > 0 && (
                    <>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{category.category_name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {category.sections?.length || 0} Sections
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleInsertField(category.category_id)
                              }
                              className="flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Insert Field
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="multiple" className="w-full">
                          {category.sections?.map(
                            (section: any, sectionIndex: number) =>
                              // Only render section if it has fields - UPDATED CONDITION
                              section.fields?.length > 0 && (
                                <AccordionItem
                                  key={sectionIndex}
                                  value={`section-${categoryIndex}-${sectionIndex}`}
                                >
                                  <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full mr-4">
                                      <span>{section.section_name}</span>
                                      <Badge variant="outline">
                                        {section.fields?.length || 0} Fields
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-4">
                                      {section.fields?.map(
                                        (field: any, fieldIndex: number) => (
                                          <div
                                            key={fieldIndex}
                                            className={`rounded-lg p-4 ${getFieldBorderColor(
                                              field
                                            )}`}
                                          >
                                            {renderFieldContent(
                                              field,
                                              category.category_id,
                                              section.section_id
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              )
                          )}
                        </Accordion>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))
            : // Render trade-in results (mixed structure - both categories and direct sections)
              resultData.map((item: any, itemIndex: number) => {
                // Check if this is a category (has category_id and sections) or a direct section
                const isCategory = item.category_id && item.sections;
                const isDirectSection = item.section_id && item.fields;

                if (isCategory) {
                  // Render as category with sections - UPDATED: Only render if sections have fields
                  const hasSectionsWithFields = item.sections?.some(
                    (section: any) => section.fields?.length > 0
                  );

                  if (!hasSectionsWithFields) return null;

                  return (
                    <Card key={itemIndex} className="mb-4">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{item.category_name}</span>
                          <Badge variant="secondary">
                            {item.sections?.length || 0} Sections
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="multiple" className="w-full">
                          {item.sections?.map(
                            (section: any, sectionIndex: number) =>
                              // Only render section if it has fields - UPDATED CONDITION
                              section.fields?.length > 0 && (
                                <AccordionItem
                                  key={sectionIndex}
                                  value={`section-${itemIndex}-${sectionIndex}`}
                                >
                                  <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full mr-4">
                                      <span>{section.section_name}</span>
                                      <Badge variant="outline">
                                        {section.fields?.length || 0} Fields
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-4">
                                      {section.fields?.map(
                                        (field: any, fieldIndex: number) => (
                                          <div
                                            key={fieldIndex}
                                            className={`rounded-lg p-4 ${getFieldBorderColor(
                                              field
                                            )}`}
                                          >
                                            {renderFieldContent(
                                              field,
                                              item.category_id,
                                              section.section_id
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              )
                          )}
                        </Accordion>
                      </CardContent>
                    </Card>
                  );
                } else if (isDirectSection) {
                  // Only render direct section if it has fields - UPDATED CONDITION
                  if (!item.fields?.length) return null;

                  // Render as direct section
                  return (
                    <Card key={itemIndex} className="mb-4">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{item.section_name}</span>
                          <Badge variant="secondary">
                            {item.fields?.length || 0} Fields
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {item.fields?.map(
                            (field: any, fieldIndex: number) => (
                              <div
                                key={fieldIndex}
                                className={`rounded-lg p-4 ${getFieldBorderColor(
                                  field
                                )}`}
                              >
                                {renderFieldContent(
                                  field,
                                  null, // No category for direct sections
                                  item.section_id
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return null; // Skip unknown structures
              })}
        </div>
      </div>
    );
  };

  const renderFieldContent = (
    field: any,
    categoryId: string | null, // Allow null for direct sections
    sectionId: string
  ) => {
    const isWorkshopField =
      field.section_display_name === "at_workshop_onstaging" ||
      sectionId.includes("workshop_section");
    const quote = getQuote(field.field_id);
    const isRejected = quote?.status === "booking_rejected";

    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">{field.field_name}</h4>
          <div className="flex items-center gap-2">
            <Badge className={getBadgeColor(getStatus(field.field_id))}>
              {getStatus(field.field_id) || "Not Progressed"}
            </Badge>

            {/* Workshop field edit/delete buttons */}
            {isWorkshopField && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditField(field, categoryId, sectionId)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    handleDeleteField(field, categoryId, sectionId)
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {(() => {
              const supplierQuote = getSupplierQuote(field.field_id);
              const bayQuote = getBayQuote(field.field_id);

              // Check if any quote is approved/accepted
              const supplierApproved = supplierQuote?.supplier_responses?.some(
                (q) => q.status === "approved"
              );
              const bayAccepted =
                bayQuote?.status === "booking_accepted" ||
                bayQuote?.status === "work_in_progress" ||
                bayQuote?.status === "work_review" ||
                bayQuote?.status === "rework" ||
                bayQuote?.status === "completed_jobs";

              const anyApproved = supplierApproved || bayAccepted;

              // Calculate pending suppliers correctly
              const hasSupplierQuote =
                supplierQuote && supplierQuote.selected_suppliers?.length > 0;

              // Get list of suppliers who have responded
              const respondedSupplierIds =
                supplierQuote?.supplier_responses?.map(
                  (response) => response.supplier_id._id || response.supplier_id
                ) || [];

              // Suppliers who haven't responded yet (true pending)
              const pendingSuppliers =
                supplierQuote?.selected_suppliers?.filter((supplier) => {
                  const supplierId = supplier._id || supplier;
                  return !respondedSupplierIds.includes(supplierId);
                }) || [];

              // Check if all suppliers are not interested
              const allSuppliersNotInterested =
                hasSupplierQuote &&
                supplierQuote.supplier_responses?.length ===
                  supplierQuote.selected_suppliers?.length &&
                supplierQuote.supplier_responses.every(
                  (response) => response.status === "not_interested"
                );

              const shouldDisableBayButton =
                hasSupplierQuote &&
                (pendingSuppliers.length > 0 || !allSuppliersNotInterested);

              if (!anyApproved) {
                return (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={
                              bayQuote?.status === "booking_request"
                                ? "cursor-not-allowed"
                                : ""
                            }
                          >
                            <Button
                              size="sm"
                              disabled={bayQuote?.status === "booking_request"}
                              onClick={() =>
                                handleSendQuote(field, categoryId, sectionId)
                              }
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              {supplierQuote
                                ? "Edit Quote"
                                : "Request For Quote"}
                            </Button>
                          </span>
                        </TooltipTrigger>

                        {bayQuote?.status === "booking_request" && (
                          <TooltipContent>
                            Bay booking is in progress
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={
                              shouldDisableBayButton ? "cursor-not-allowed" : ""
                            }
                          >
                            <Button
                              size="sm"
                              disabled={shouldDisableBayButton}
                              onClick={() =>
                                handleSendBay(
                                  field,
                                  categoryId,
                                  sectionId,
                                  isRejected
                                )
                              }
                            >
                              <HardHat className="h-3 w-3 mr-1" />
                              {isRejected
                                ? "Rebook Bay"
                                : bayQuote
                                ? "Edit Bay"
                                : "Request For Bay"}
                            </Button>
                          </span>
                        </TooltipTrigger>

                        {shouldDisableBayButton && (
                          <TooltipContent>
                            {pendingSuppliers.length > 0
                              ? `Waiting for ${pendingSuppliers.length} supplier response(s)`
                              : "Supplier quote is in progress"}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Manual Completion
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56">
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedField({
                                ...field,
                                categoryId,
                                sectionId,
                                vehicle_type: vehicle?.vehicle_type,
                                vehicle_stock_id: vehicle?.vehicle_stock_id,
                              });
                              setManualMode("quote");
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Manual Quote Completion
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedField({
                                ...field,
                                categoryId,
                                sectionId,
                                vehicle_type: vehicle?.vehicle_type,
                                vehicle_stock_id: vehicle?.vehicle_stock_id,
                              });
                              setManualMode("bay");
                            }}
                          >
                            <HardHat className="h-4 w-4 mr-2" />
                            Manual Bay Completion
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                );
              }
            })()}
            {(() => {
              const quote = getQuote(field.field_id);
              const hasWorkSubmitted = quote?.status === "quote_request";

              if (hasWorkSubmitted) {
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleReceivedQuotes(field, categoryId, sectionId)
                    }
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Received Quotes
                  </Button>
                );
              }
              return null;
            })()}

            {(() => {
              const quote = getQuote(field.field_id);
              const hasWorkSubmitted = quote?.status === "work_review";

              if (hasWorkSubmitted) {
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewWork(field, categoryId, sectionId)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    View Work
                  </Button>
                );
              }
              return null;
            })()}

            {(() => {
              const quote = getQuote(field.field_id);
              const hasWorkSubmitted = quote?.status === "completed_jobs";

              if (hasWorkSubmitted) {
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleFinalWork(field, categoryId, sectionId)
                    }
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Final Work
                  </Button>
                );
              }
              return null;
            })()}

            {(getQuote(field.field_id)?.supplier_responses.some(
              (q) => q.status === "approved"
            ) ||
              [
                "booking_accepted",
                "work_in_progress",
                "work_review",
                "completed_jobs",
                "rework",
              ].includes(getQuote(field.field_id)?.status)) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMessaging(field, categoryId, sectionId)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Message
              </Button>
            )}
          </div>
        </div>
        {/* Rest of the field content rendering remains the same */}
        {field.field_value && (
          <div className="text-sm text-muted-foreground mb-2">
            Value:{" "}
            {typeof field.field_value === "object"
              ? JSON.stringify(field.field_value)
              : field.field_value}
          </div>
        )}

        {(field.images?.length > 0 || field.videos?.length > 0) && (
          <div className="grid grid-cols-6 gap-2 mt-2">
            {/* Render Images */}
            {field.images?.map((image: string, imgIndex: number) => {
              const mediaId = `${field.field_id}-image-${imgIndex}`;
              return (
                <div
                  key={imgIndex}
                  className="relative group cursor-pointer"
                  onClick={() => handleOpenMediaViewer(field, mediaId)}
                >
                  <img
                    src={image}
                    alt={`${field.field_name} image ${imgIndex + 1}`}
                    className="w-full h-20 object-cover rounded transition-all duration-200 group-hover:opacity-80 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-all duration-200 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {/* Replace svg with Lucide Icon */}
                      <ZoomIn className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Render Videos */}
            {field.videos?.map((video: string, vidIndex: number) => {
              const mediaId = `${field.field_id}-video-${vidIndex}`;
              return (
                <div
                  key={vidIndex}
                  className="relative group cursor-pointer"
                  onClick={() => handleOpenMediaViewer(field, mediaId)}
                >
                  <video
                    src={video}
                    className="w-full h-20 object-cover rounded transition-all duration-200 group-hover:opacity-80 group-hover:scale-105"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-all duration-200 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {/* Replace svg with Lucide Icon */}
                      <Video className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <DashboardLayout title="Workshop Configuration">
      <div className="flex flex-col h-full">
        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-10 h-full gap-6">
            {/* Left Panel - 70% - Inspection Results with Scroll */}
            <div className="lg:col-span-7 h-full overflow-hidden">
              <div className="h-full overflow-y-auto pr-2">
                {renderResults(vehicleType)}
              </div>
            </div>

            {/* Right Panel - 30% - Vehicle Details with Scroll */}
            <div className="hidden lg:block lg:col-span-3 h-full overflow-hidden">
              <div className="h-full overflow-y-auto">
                <Card className="h-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Vehicle Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Hero Image */}
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <img
                        src={vehicle.vehicle_hero_image}
                        alt={vehicle.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">
                        {vehicle.name ||
                          `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Stock ID:
                          </span>
                          <p className="font-medium">
                            {vehicle.vehicle_stock_id}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium capitalize">
                            {vehicle.vehicle_type}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">VIN:</span>
                          <p className="font-medium">{vehicle.vin}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plate:</span>
                          <p className="font-medium">{vehicle.plate_no}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Specs */}
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Specifications</h4>
                      <div className="space-y-1 text-sm">
                        {vehicle.variant && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Variant:
                            </span>
                            <span>{vehicle.variant}</span>
                          </div>
                        )}
                        {vehicle.body_style && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Body Style:
                            </span>
                            <span>{vehicle.body_style}</span>
                          </div>
                        )}
                        {vehicle.chassis_no && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Chassis:
                            </span>
                            <span>{vehicle.chassis_no}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge
                          variant={
                            vehicle.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {vehicle.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        {/* Modals */}
        {selectedField && (
          <>
            <QuoteModal
              open={quoteModalOpen}
              onOpenChange={setQuoteModalOpen}
              field={selectedField}
              existingQuote={getQuote(selectedField.field_id)}
              onSuccess={() => {
                setQuoteModalOpen(false);
                setSelectedField(null);
                queryClient.invalidateQueries({
                  queryKey: ["workshop-vehicle-details"],
                });
              }}
            />

            <BayBookingDialog
              open={bayBookingDialogOpen}
              onOpenChange={setBayBookingDialogOpen}
              field={selectedField}
              vehicleType={vehicleType}
              vehicleStockId={vehicleId}
              onSuccess={handleRefresh}
            />
            <ReceivedQuotesModal
              open={receivedQuotesModalOpen}
              onOpenChange={setReceivedQuotesModalOpen}
              field={selectedField}
              onSuccess={() => {
                setReceivedQuotesModalOpen(false);
                setSelectedField(null);
                queryClient.invalidateQueries({
                  queryKey: ["workshop-vehicle-details"],
                });
              }}
            />

            <ChatModal
              open={messagingModalOpen}
              onOpenChange={setMessagingModalOpen}
              quote={selectedField.quote}
            />

            <CommentSheetModal
              open={finalWorkModalOpen}
              onOpenChange={setFinalWorkModalOpen}
              field={selectedField}
              mode="company_view"
              onSuccess={() => {
                setFinalWorkModalOpen(false);
                setSelectedField(null);
                queryClient.invalidateQueries({
                  queryKey: ["workshop-vehicle-details"],
                });
              }}
            />

            <CommentSheetModal
              open={viewWorkModalOpen}
              onOpenChange={setViewWorkModalOpen}
              field={selectedField}
              mode="company_review"
              onSuccess={() => {
                setViewWorkModalOpen(false);
                setSelectedField(null);
                queryClient.invalidateQueries({
                  queryKey: ["workshop-vehicle-details"],
                });
              }}
            />
          </>
        )}
        {/* Insert Workshop Field Modal */}
        <InsertWorkshopFieldModal
          open={insertFieldModalOpen}
          onOpenChange={setInsertFieldModalOpen}
          onFieldCreated={addWorkshopFieldMutation.mutate}
          vehicleType={vehicleType!}
          categoryId={selectedCategoryForField}
          dropdowns={dropdowns}
          s3Config={completeUser.company_id.s3_config} // Will be implemented with S3 config
        />
        {/* Rearrange Modal */}
        <Dialog open={rearrangeModalOpen} onOpenChange={setRearrangeModalOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Rearrange{" "}
                {vehicleType
                  ? vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)
                  : ""}{" "}
                Results
              </DialogTitle>
              <DialogDescription>
                Drag and drop to reorder categories, sections, and fields. All
                changes are live-updated.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                {inspectionOrder.length > 0 ? (
                  <DraggableWorkshopCategoriesList
                    categories={inspectionOrder}
                    onUpdateCategoriesOrder={handleUpdateCategoriesOrder}
                    onUpdateSectionsOrder={handleUpdateSectionsOrder}
                    onUpdateFieldsOrder={handleUpdateFieldsOrder}
                    getFieldBorderColor={getFieldBorderColor}
                  />
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <p className="text-muted-foreground">
                        No inspection data available for rearranging
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Changes are automatically tracked</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleDiscardChanges}
                  disabled={updateOrderMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveOrder}
                  disabled={
                    updateOrderMutation.isPending ||
                    inspectionOrder.length === 0
                  }
                  className="flex items-center gap-2"
                >
                  {updateOrderMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={stageSelectionModalOpen}
          onOpenChange={setStageSelectionModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Stage to Complete</DialogTitle>
              <DialogDescription>
                Choose which inspection stage you want to complete. Only stages
                with all completed jobs and in workshop status can be finished.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {availableCompletionStages.length > 0 ? (
                availableCompletionStages.map((stageName) => {
                  const isCompletable = canStageBeCompleted(stageName);

                  return (
                    <div
                      key={stageName}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="radio"
                        id={`stage-${stageName}`}
                        name="completionStage"
                        value={stageName}
                        checked={selectedCompletionStage === stageName}
                        onChange={(e) => {
                          if (isCompletable) {
                            setSelectedCompletionStage(e.target.value);
                          }
                        }}
                        disabled={!isCompletable}
                        className="rounded"
                      />
                      <label
                        htmlFor={`stage-${stageName}`}
                        className={`flex-1 p-2 border rounded ${
                          isCompletable
                            ? "cursor-pointer hover:bg-muted"
                            : "cursor-not-allowed opacity-60 bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{stageName}</span>
                          {isCompletable ? (
                            <Badge
                              variant="default"
                              className="ml-2 bg-green-600"
                            >
                              Ready to Complete
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="ml-2">
                              Not Ready
                            </Badge>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>No stages are ready for completion.</p>
                  <p className="text-xs mt-2">
                    Stages must have all jobs completed and be in workshop
                    status to be completable.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStageSelectionModalOpen(false);
                  setSelectedCompletionStage("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStageCompletion}
                disabled={
                  !selectedCompletionStage ||
                  availableCompletionStages.length === 0 ||
                  !canStageBeCompleted(selectedCompletionStage)
                }
                className="bg-green-600 hover:bg-green-700"
              >
                Continue to Complete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={completeWorkshopModalOpen}
          onOpenChange={setCompleteWorkshopModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Complete{" "}
                {vehicle.vehicle_type === "inspection" &&
                selectedCompletionStage
                  ? `${selectedCompletionStage} Stage`
                  : "Workshop"}
              </DialogTitle>
              <DialogDescription>
                {vehicle.vehicle_type === "inspection" &&
                selectedCompletionStage
                  ? `Are you sure you want to complete the "${selectedCompletionStage}" stage? This will generate the stage report and mark it as completed.`
                  : "Are you sure you want to complete the workshop for this vehicle? This action will generate the final workshop report and cannot be undone."}
                <br />
                <br />
                Type <strong>CONFIRM</strong> to proceed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Type CONFIRM"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCompleteWorkshopModalOpen(false);
                    setConfirmText("");
                    setSelectedCompletionStage("");
                  }}
                  disabled={completeWorkshopMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmCompleteWorkshop}
                  disabled={
                    confirmText !== "CONFIRM" ||
                    completeWorkshopMutation.isPending
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  {completeWorkshopMutation.isPending
                    ? "Processing..."
                    : `Complete ${
                        vehicle.vehicle_type === "inspection" &&
                        selectedCompletionStage
                          ? "Stage"
                          : "Workshop"
                      }`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Color Palette Modal */}
        <Dialog
          open={colorPaletteModalOpen}
          onOpenChange={setColorPaletteModalOpen}
        >
          <DialogContent className="max-w-lg w-[90vw]">
            <DialogHeader>
              <DialogTitle>Stage Legend Reference</DialogTitle>
              <DialogDescription>
                Status colors for inspection fields
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2 mt-4">
              {[
                {
                  label: "Not Progressed - No progress has been made",
                  className: "bg-gray-500",
                },
                {
                  label: "Quote Request - Quote is sent to suppliers",
                  className: "bg-yellow-500",
                },
                {
                  label: "Quote Sent - Supplier responded with a quote",
                  className: "bg-orange-500",
                },
                {
                  label: "Quote Approved - Quote accepted from the supplier",
                  className: "bg-blue-500",
                },
                {
                  label:
                    "Work in Progress - Supplier started working on the vehicle",
                  className: "bg-purple-500",
                },
                {
                  label:
                    "Work Review - Supplier submitted the work for review/approval",
                  className: "bg-indigo-500",
                },
                {
                  label: "Completed Job - Work has been accepted",
                  className: "bg-green-500",
                },
                {
                  label: "Rework - Vehicle sent back for reworks",
                  className: "bg-red-500",
                },
                // Bay quote specific statuses
                {
                  label: "Booking Request - Bay booking has been requested",
                  className: "bg-pink-500",
                },
                {
                  label: "Booking Accepted - Bay booking confirmed",
                  className: "bg-teal-500",
                },
                {
                  label: "Booking Rejected - Bay booking declined",
                  className: "bg-rose-500",
                },
              ].map((status) => (
                <div key={status.label} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full border ${status.className}`}
                  ></div>
                  <span>{status.label}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setColorPaletteModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
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
                disabled={deleteWorkshopFieldMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  deleteWorkshopFieldMutation.mutate(fieldToDelete)
                }
                disabled={deleteWorkshopFieldMutation.isPending}
              >
                {deleteWorkshopFieldMutation.isPending
                  ? "Deleting..."
                  : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={vehicleDetailsModalOpen}
          onOpenChange={setVehicleDetailsModalOpen}
        >
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Details
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 p-1">
                {/* Hero Image */}
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={vehicle.vehicle_hero_image}
                    alt={vehicle.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Basic Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">
                    {vehicle.name ||
                      `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Stock ID:</span>
                      <p className="font-medium">{vehicle.vehicle_stock_id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium capitalize">
                        {vehicle.vehicle_type}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">VIN:</span>
                      <p className="font-medium">{vehicle.vin}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Plate:</span>
                      <p className="font-medium">{vehicle.plate_no}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Specs */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Specifications</h4>
                  <div className="space-y-1 text-sm">
                    {vehicle.variant && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Variant:</span>
                        <span>{vehicle.variant}</span>
                      </div>
                    )}
                    {vehicle.body_style && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Body Style:
                        </span>
                        <span>{vehicle.body_style}</span>
                      </div>
                    )}
                    {vehicle.chassis_no && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chassis:</span>
                        <span>{vehicle.chassis_no}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={
                        vehicle.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {vehicle.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
        {/* Edit Workshop Field Modal */}
        {selectedEditField && (
          <InsertWorkshopFieldModal
            open={editFieldModalOpen}
            onOpenChange={setEditFieldModalOpen}
            onFieldCreated={updateWorkshopFieldMutation.mutate}
            vehicleType={vehicleType!}
            categoryId={selectedEditField.categoryId}
            dropdowns={dropdowns}
            s3Config={completeUser.company_id.s3_config}
            editMode={true}
            existingField={selectedEditField}
          />
        )}
      </div>

      <MediaViewer
        media={currentMediaItems}
        currentMediaId={currentMediaId}
        isOpen={mediaViewerOpen}
        onClose={() => {
          setMediaViewerOpen(false);
          setCurrentMediaItems([]);
          setCurrentMediaId("");
        }}
      />
    </DashboardLayout>
  );
};

export default WorkshopConfig;
