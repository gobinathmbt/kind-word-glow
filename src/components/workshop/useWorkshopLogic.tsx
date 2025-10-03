import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  workshopServices,
  vehicleServices,
  dropdownServices,
} from "@/api/services";

export const useWorkshopLogic = (vehicleId: string, vehicleType: string) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const [currentMediaItems, setCurrentMediaItems] = useState<any[]>([]);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");

  const { data: vehicleData, isLoading: vehicleLoading } = useQuery({
    queryKey: ["workshop-vehicle-details", vehicleId],
    queryFn: async () => {
      const response = await workshopServices.getWorkshopVehicleDetails(
        vehicleId,
        vehicleType
      );
      return response.data;
    },
    enabled: !!vehicleId,
  });

  const vehicle = vehicleData?.data?.vehicle;
  const vehicle_quotes = vehicleData?.data?.quotes;

  const { data: dropdowns } = useQuery({
    queryKey: ["dropdowns-for-workshop"],
    queryFn: async () => {
      const response = await dropdownServices.getDropdowns();
      return response.data.data;
    },
  });

  const getStatus = (field_id: string) => {
    if (!vehicle_quotes) return null;
    const quote = vehicle_quotes.find((q: any) => q.field_id === field_id);
    return quote ? quote.status : null;
  };

  const getQuote = (field_id: string) => {
    if (!vehicle_quotes) return null;
    return vehicle_quotes.find((q: any) => q.field_id === field_id);
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
    };
    return statusToBorder[status] || "border-yellow-500 border-2";
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
    };
    return `px-2 py-1 rounded-md text-xs font-semibold ${
      statusToBadge[status || ""] || "bg-gray-500 text-white"
    }`;
  };

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

          const stageInWorkshop =
            Array.isArray(vehicle.workshop_progress) &&
            vehicle.workshop_progress.some(
              (item: any) =>
                item.stage_name === category.category_name &&
                item.progress === "in_progress"
            );

          if (hasCompletedJobs && stageInWorkshop && allFieldsCompleted) {
            completableStages.push(category.category_name);
          }
        });

        setAvailableCompletionStages(completableStages);
      } else {
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

        const allCompleted =
          allFields.length > 0 &&
          allFields.every((field: any) => {
            const fieldStatus = getStatus(field.field_id);
            return fieldStatus === "completed_jobs";
          });

        setCanCompleteWorkshop(allCompleted);
        setAvailableCompletionStages([]);
      }
    }
  }, [vehicleData, vehicleType, vehicle, vehicle_quotes]);

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
        if (fieldData.categoryId) {
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
        if (fieldData.categoryId) {
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
      setInspectionOrder([]);
    },
    onError: (error: any) => {
      toast.error(`Failed to update ${vehicleType} order`);
      console.error("Update order error:", error);
    },
  });

  const completeWorkshopMutation = useMutation({
    mutationFn: async (confirmation: string) => {
      const requestBody: any = { confirmation };

      if (vehicle.vehicle_type === "inspection" && selectedCompletionStage) {
        requestBody.stageName = selectedCompletionStage;
      }

      return await workshopServices.completeWorkshop(
        vehicleId,
        vehicleType,
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

      if (vehicle.vehicle_type === "inspection") {
        // Stay on the same page and refresh data
      } else {
        setTimeout(() => navigate("/company/workshop"), 2000);
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to complete workshop"
      );
    },
  });

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
        const categoryIndex = updatedResults.findIndex(
          (cat) => cat.category_id === selectedCategoryForField
        );

        if (categoryIndex === -1) {
          throw new Error("Category not found");
        }

        let workshopSectionIndex = updatedResults[
          categoryIndex
        ].sections?.findIndex(
          (section: any) => section.section_name === "at_workshop"
        );

        if (workshopSectionIndex === -1) {
          const newWorkshopSection = {
            section_id: `workshop_section_${Date.now()}`,
            section_name: "At Workshop - Add On",
            section_display_name: "at_workshop_onstaging",
            display_order: updatedResults[categoryIndex].sections?.length || 0,
            fields: [],
          };

          if (!updatedResults[categoryIndex].sections) {
            updatedResults[categoryIndex].sections = [];
          }

          updatedResults[categoryIndex].sections.push(newWorkshopSection);
          workshopSectionIndex =
            updatedResults[categoryIndex].sections.length - 1;
        }

        updatedResults[categoryIndex].sections[
          workshopSectionIndex
        ].fields.push(fieldData);
      } else {
        let workshopSectionIndex = updatedResults.findIndex(
          (item: any) =>
            item.section_id &&
            (item.section_name === "at_workshop" ||
              item.section_name.includes("workshop"))
        );

        if (workshopSectionIndex === -1) {
          const newWorkshopSection = {
            section_id: `workshop_section_${Date.now()}`,
            section_name: "At Workshop - Add On",
            section_display_name: "at_workshop_onstaging",
            display_order: updatedResults.length,
            fields: [fieldData],
          };

          updatedResults.push(newWorkshopSection);
        } else {
          if (!updatedResults[workshopSectionIndex].fields) {
            updatedResults[workshopSectionIndex].fields = [];
          }
          updatedResults[workshopSectionIndex].fields.push(fieldData);
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

  return {
    vehicleData,
    vehicleLoading,
    vehicle,
    vehicle_quotes,
    dropdowns,
    quoteModalOpen,
    setQuoteModalOpen,
    editFieldModalOpen,
    setEditFieldModalOpen,
    selectedEditField,
    setSelectedEditField,
    stageSelectionModalOpen,
    setStageSelectionModalOpen,
    selectedCompletionStage,
    setSelectedCompletionStage,
    availableCompletionStages,
    vehicleDetailsModalOpen,
    setVehicleDetailsModalOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    fieldToDelete,
    setFieldToDelete,
    receivedQuotesModalOpen,
    setReceivedQuotesModalOpen,
    messagingModalOpen,
    setMessagingModalOpen,
    finalWorkModalOpen,
    setFinalWorkModalOpen,
    viewWorkModalOpen,
    setViewWorkModalOpen,
    rearrangeModalOpen,
    setRearrangeModalOpen,
    selectedField,
    setSelectedField,
    inspectionOrder,
    setInspectionOrder,
    colorPaletteModalOpen,
    setColorPaletteModalOpen,
    insertFieldModalOpen,
    setInsertFieldModalOpen,
    selectedCategoryForField,
    setSelectedCategoryForField,
    completeWorkshopModalOpen,
    setCompleteWorkshopModalOpen,
    confirmText,
    setConfirmText,
    canCompleteWorkshop,
    mediaViewerOpen,
    setMediaViewerOpen,
    currentMediaItems,
    setCurrentMediaItems,
    currentMediaId,
    setCurrentMediaId,
    getStatus,
    getQuote,
    getFieldBorderColor,
    getBadgeColor,
    deleteWorkshopFieldMutation,
    updateWorkshopFieldMutation,
    updateOrderMutation,
    completeWorkshopMutation,
    addWorkshopFieldMutation,
  };
};
