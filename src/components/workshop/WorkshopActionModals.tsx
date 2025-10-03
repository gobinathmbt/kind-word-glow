import React from "react";
import QuoteModal from "./QuoteModal";
import ReceivedQuotesModal from "./ReceivedQuotesModal";
import ChatModal from "./ChatModal";
import CommentSheetModal from "./CommentSheetModal";
import InsertWorkshopFieldModal from "./InsertWorkshopFieldModal";

interface WorkshopActionModalsProps {
  selectedField: any;
  quoteModalOpen: boolean;
  setQuoteModalOpen: (open: boolean) => void;
  receivedQuotesModalOpen: boolean;
  setReceivedQuotesModalOpen: (open: boolean) => void;
  messagingModalOpen: boolean;
  setMessagingModalOpen: (open: boolean) => void;
  finalWorkModalOpen: boolean;
  setFinalWorkModalOpen: (open: boolean) => void;
  viewWorkModalOpen: boolean;
  setViewWorkModalOpen: (open: boolean) => void;
  insertFieldModalOpen: boolean;
  setInsertFieldModalOpen: (open: boolean) => void;
  editFieldModalOpen: boolean;
  setEditFieldModalOpen: (open: boolean) => void;
  selectedEditField: any;
  selectedCategoryForField: string | null;
  vehicleType: string;
  dropdowns: any;
  s3Config: any;
  getQuote: (fieldId: string) => any;
  setSelectedField: (field: any) => void;
  setSelectedEditField: (field: any) => void;
  queryClient: any;
  addWorkshopFieldMutation: any;
  updateWorkshopFieldMutation: any;
}

const WorkshopActionModals: React.FC<WorkshopActionModalsProps> = ({
  selectedField,
  quoteModalOpen,
  setQuoteModalOpen,
  receivedQuotesModalOpen,
  setReceivedQuotesModalOpen,
  messagingModalOpen,
  setMessagingModalOpen,
  finalWorkModalOpen,
  setFinalWorkModalOpen,
  viewWorkModalOpen,
  setViewWorkModalOpen,
  insertFieldModalOpen,
  setInsertFieldModalOpen,
  editFieldModalOpen,
  setEditFieldModalOpen,
  selectedEditField,
  selectedCategoryForField,
  vehicleType,
  dropdowns,
  s3Config,
  getQuote,
  setSelectedField,
  setSelectedEditField,
  queryClient,
  addWorkshopFieldMutation,
  updateWorkshopFieldMutation,
}) => {
  return (
    <>
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

      <InsertWorkshopFieldModal
        open={insertFieldModalOpen}
        onOpenChange={setInsertFieldModalOpen}
        onFieldCreated={addWorkshopFieldMutation.mutate}
        vehicleType={vehicleType}
        categoryId={selectedCategoryForField}
        dropdowns={dropdowns}
        s3Config={s3Config}
      />

      {selectedEditField && (
        <InsertWorkshopFieldModal
          open={editFieldModalOpen}
          onOpenChange={setEditFieldModalOpen}
          onFieldCreated={updateWorkshopFieldMutation.mutate}
          vehicleType={vehicleType}
          categoryId={selectedEditField.categoryId}
          dropdowns={dropdowns}
          s3Config={s3Config}
          editMode={true}
          existingField={selectedEditField}
        />
      )}
    </>
  );
};

export default WorkshopActionModals;
