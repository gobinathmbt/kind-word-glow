import { MediaItem } from "@/components/common/MediaViewer";

export const useWorkshopHandlers = (
  setSelectedField: (field: any) => void,
  setQuoteModalOpen: (open: boolean) => void,
  setReceivedQuotesModalOpen: (open: boolean) => void,
  setMessagingModalOpen: (open: boolean) => void,
  setFinalWorkModalOpen: (open: boolean) => void,
  setViewWorkModalOpen: (open: boolean) => void,
  setRearrangeModalOpen: (open: boolean) => void,
  setInspectionOrder: (order: any) => void,
  setInsertFieldModalOpen: (open: boolean) => void,
  setSelectedCategoryForField: (categoryId: string | null) => void,
  setSelectedEditField: (field: any) => void,
  setEditFieldModalOpen: (open: boolean) => void,
  setFieldToDelete: (field: any) => void,
  setDeleteConfirmOpen: (open: boolean) => void,
  setCurrentMediaItems: (items: MediaItem[]) => void,
  setCurrentMediaId: (id: string) => void,
  setMediaViewerOpen: (open: boolean) => void,
  setStageSelectionModalOpen: (open: boolean) => void,
  setCompleteWorkshopModalOpen: (open: boolean) => void,
  setSelectedCompletionStage: (stage: string) => void,
  setConfirmText: (text: string) => void,
  vehicle: any,
  vehicleType: string,
  getQuote: (fieldId: string) => any,
  canCompleteWorkshop: boolean,
  availableCompletionStages: string[],
  completeWorkshopMutation: any,
  updateOrderMutation: any,
  inspectionOrder: any[]
) => {
  const handleSendQuote = (
    field: any,
    categoryId: string | null,
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

  const handleReceivedQuotes = (
    field: any,
    categoryId: string | null,
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
    categoryId: string | null,
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
    categoryId: string | null,
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
    categoryId: string | null,
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
    const resultData =
      vehicleType === "inspection"
        ? vehicle?.inspection_result
        : vehicle?.trade_in_result;

    if (resultData) {
      setInspectionOrder([...resultData]);
      setRearrangeModalOpen(true);
    }
  };

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
    }
  };

  const handleDiscardChanges = () => {
    setInspectionOrder([]);
    setRearrangeModalOpen(false);
  };

  const handleInsertField = (categoryId?: string) => {
    setSelectedCategoryForField(categoryId || null);
    setInsertFieldModalOpen(true);
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

  const handleOpenMediaViewer = (field: any, selectedMediaId: string) => {
    const mediaItems: MediaItem[] = [];

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

  const handleCompleteWorkshop = () => {
    if (vehicle.vehicle_type === "inspection") {
      if (availableCompletionStages.length > 0) {
        setStageSelectionModalOpen(true);
      }
    } else {
      if (canCompleteWorkshop) {
        setCompleteWorkshopModalOpen(true);
      }
    }
  };

  const handleStageCompletion = () => {
    setStageSelectionModalOpen(false);
    setCompleteWorkshopModalOpen(true);
  };

  const handleConfirmCompleteWorkshop = () => {
    const confirmText = "CONFIRM";
    completeWorkshopMutation.mutate(confirmText);
  };

  return {
    handleSendQuote,
    handleReceivedQuotes,
    handleMessaging,
    handleFinalWork,
    handleViewWork,
    handleRearrange,
    handleUpdateCategoriesOrder,
    handleUpdateSectionsOrder,
    handleUpdateFieldsOrder,
    handleSaveOrder,
    handleDiscardChanges,
    handleInsertField,
    handleEditField,
    handleDeleteField,
    handleOpenMediaViewer,
    handleCompleteWorkshop,
    handleStageCompletion,
    handleConfirmCompleteWorkshop,
  };
};
