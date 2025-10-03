import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import MediaViewer from "@/components/common/MediaViewer";
import VehicleDetailsPanel from "@/components/workshop/VehicleDetailsPanel";
import WorkshopHeader from "@/components/workshop/WorkshopHeader";
import WorkshopResultsSection from "@/components/workshop/WorkshopResultsSection";
import WorkshopModals from "@/components/workshop/WorkshopModals";
import WorkshopActionModals from "@/components/workshop/WorkshopActionModals";
import { useWorkshopLogic } from "@/components/workshop/useWorkshopLogic";
import { useWorkshopHandlers } from "@/components/workshop/useWorkshopHandlers";

const WorkshopConfig = () => {
  const { vehicleId, vehicleType } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { completeUser } = useAuth();

  const {
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
  } = useWorkshopLogic(vehicleId!, vehicleType!);

  const {
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
  } = useWorkshopHandlers(
    setSelectedField,
    setQuoteModalOpen,
    setReceivedQuotesModalOpen,
    setMessagingModalOpen,
    setFinalWorkModalOpen,
    setViewWorkModalOpen,
    setRearrangeModalOpen,
    setInspectionOrder,
    setInsertFieldModalOpen,
    setSelectedCategoryForField,
    setSelectedEditField,
    setEditFieldModalOpen,
    setFieldToDelete,
    setDeleteConfirmOpen,
    setCurrentMediaItems,
    setCurrentMediaId,
    setMediaViewerOpen,
    setStageSelectionModalOpen,
    setCompleteWorkshopModalOpen,
    setSelectedCompletionStage,
    setConfirmText,
    vehicle,
    vehicleType!,
    getQuote,
    canCompleteWorkshop,
    availableCompletionStages,
    completeWorkshopMutation,
    updateOrderMutation,
    inspectionOrder
  );

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

  const resultData =
    vehicleType === "inspection"
      ? vehicle.inspection_result
      : vehicle.trade_in_result;

  if (!resultData || resultData.length === 0) {
    return (
      <DashboardLayout title="Workshop Configuration">
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Workshop Configuration">
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-10 h-full gap-6">
            <div className="lg:col-span-7 h-full overflow-hidden">
              <div className="h-full overflow-y-auto pr-2">
                <div className="space-y-4">
                  <WorkshopHeader
                    vehicleType={vehicleType!}
                    onInsertField={
                      vehicleType === "tradein"
                        ? () => handleInsertField()
                        : undefined
                    }
                    onVehicleDetailsClick={() =>
                      setVehicleDetailsModalOpen(true)
                    }
                    onRearrange={handleRearrange}
                    onColorPalette={() => setColorPaletteModalOpen(true)}
                    onBack={() => navigate("/company/workshop")}
                    onCompleteWorkshop={handleCompleteWorkshop}
                    canCompleteWorkshop={canCompleteWorkshop}
                    isCompletingWorkshop={completeWorkshopMutation.isPending}
                    isInspection={vehicle.vehicle_type === "inspection"}
                  />

                  <WorkshopResultsSection
                    vehicleType={vehicleType!}
                    resultData={resultData}
                    getStatus={getStatus}
                    getQuote={getQuote}
                    getBadgeColor={getBadgeColor}
                    getFieldBorderColor={getFieldBorderColor}
                    onSendQuote={handleSendQuote}
                    onReceivedQuotes={handleReceivedQuotes}
                    onMessaging={handleMessaging}
                    onFinalWork={handleFinalWork}
                    onViewWork={handleViewWork}
                    onEditField={handleEditField}
                    onDeleteField={handleDeleteField}
                    onOpenMediaViewer={handleOpenMediaViewer}
                    onInsertField={handleInsertField}
                  />
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-3 h-full overflow-hidden">
              <div className="h-full overflow-y-auto">
                <VehicleDetailsPanel vehicle={vehicle} />
              </div>
            </div>
          </div>
        </div>

        <WorkshopModals
          colorPaletteModalOpen={colorPaletteModalOpen}
          setColorPaletteModalOpen={setColorPaletteModalOpen}
          deleteConfirmOpen={deleteConfirmOpen}
          setDeleteConfirmOpen={setDeleteConfirmOpen}
          fieldToDelete={fieldToDelete}
          deleteWorkshopFieldMutation={deleteWorkshopFieldMutation}
          vehicleDetailsModalOpen={vehicleDetailsModalOpen}
          setVehicleDetailsModalOpen={setVehicleDetailsModalOpen}
          vehicle={vehicle}
          rearrangeModalOpen={rearrangeModalOpen}
          setRearrangeModalOpen={setRearrangeModalOpen}
          inspectionOrder={inspectionOrder}
          onUpdateCategoriesOrder={handleUpdateCategoriesOrder}
          onUpdateSectionsOrder={handleUpdateSectionsOrder}
          onUpdateFieldsOrder={handleUpdateFieldsOrder}
          getFieldBorderColor={getFieldBorderColor}
          updateOrderMutation={updateOrderMutation}
          onSaveOrder={handleSaveOrder}
          onDiscardChanges={handleDiscardChanges}
          vehicleType={vehicleType!}
          stageSelectionModalOpen={stageSelectionModalOpen}
          setStageSelectionModalOpen={setStageSelectionModalOpen}
          availableCompletionStages={availableCompletionStages}
          selectedCompletionStage={selectedCompletionStage}
          setSelectedCompletionStage={setSelectedCompletionStage}
          onStageCompletion={handleStageCompletion}
          completeWorkshopModalOpen={completeWorkshopModalOpen}
          setCompleteWorkshopModalOpen={setCompleteWorkshopModalOpen}
          confirmText={confirmText}
          setConfirmText={setConfirmText}
          completeWorkshopMutation={completeWorkshopMutation}
          onConfirmCompleteWorkshop={handleConfirmCompleteWorkshop}
        />

        <WorkshopActionModals
          selectedField={selectedField}
          quoteModalOpen={quoteModalOpen}
          setQuoteModalOpen={setQuoteModalOpen}
          receivedQuotesModalOpen={receivedQuotesModalOpen}
          setReceivedQuotesModalOpen={setReceivedQuotesModalOpen}
          messagingModalOpen={messagingModalOpen}
          setMessagingModalOpen={setMessagingModalOpen}
          finalWorkModalOpen={finalWorkModalOpen}
          setFinalWorkModalOpen={setFinalWorkModalOpen}
          viewWorkModalOpen={viewWorkModalOpen}
          setViewWorkModalOpen={setViewWorkModalOpen}
          insertFieldModalOpen={insertFieldModalOpen}
          setInsertFieldModalOpen={setInsertFieldModalOpen}
          editFieldModalOpen={editFieldModalOpen}
          setEditFieldModalOpen={setEditFieldModalOpen}
          selectedEditField={selectedEditField}
          selectedCategoryForField={selectedCategoryForField}
          vehicleType={vehicleType!}
          dropdowns={dropdowns}
          s3Config={completeUser.company_id.s3_config}
          getQuote={getQuote}
          setSelectedField={setSelectedField}
          setSelectedEditField={setSelectedEditField}
          queryClient={queryClient}
          addWorkshopFieldMutation={addWorkshopFieldMutation}
          updateWorkshopFieldMutation={updateWorkshopFieldMutation}
        />

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
      </div>
    </DashboardLayout>
  );
};

export default WorkshopConfig;
