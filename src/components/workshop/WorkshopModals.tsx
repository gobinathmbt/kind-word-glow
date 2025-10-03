import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Settings2, Save, CheckCircle, Car } from "lucide-react";
import DraggableWorkshopCategoriesList from "./DraggableWorkshopCategoriesList";
import VehicleDetailsPanel from "./VehicleDetailsPanel";

interface WorkshopModalsProps {
  colorPaletteModalOpen: boolean;
  setColorPaletteModalOpen: (open: boolean) => void;
  deleteConfirmOpen: boolean;
  setDeleteConfirmOpen: (open: boolean) => void;
  fieldToDelete: any;
  deleteWorkshopFieldMutation: any;
  vehicleDetailsModalOpen: boolean;
  setVehicleDetailsModalOpen: (open: boolean) => void;
  vehicle: any;
  rearrangeModalOpen: boolean;
  setRearrangeModalOpen: (open: boolean) => void;
  inspectionOrder: any[];
  onUpdateCategoriesOrder: (categories: any[]) => void;
  onUpdateSectionsOrder: (categoryIndex: number, sections: any[]) => void;
  onUpdateFieldsOrder: (categoryIndex: number, sectionIndex: number, fields: any[]) => void;
  getFieldBorderColor: (field: any) => string;
  updateOrderMutation: any;
  onSaveOrder: () => void;
  onDiscardChanges: () => void;
  vehicleType: string;
  stageSelectionModalOpen: boolean;
  setStageSelectionModalOpen: (open: boolean) => void;
  availableCompletionStages: string[];
  selectedCompletionStage: string;
  setSelectedCompletionStage: (stage: string) => void;
  onStageCompletion: () => void;
  completeWorkshopModalOpen: boolean;
  setCompleteWorkshopModalOpen: (open: boolean) => void;
  confirmText: string;
  setConfirmText: (text: string) => void;
  completeWorkshopMutation: any;
  onConfirmCompleteWorkshop: () => void;
}

const WorkshopModals: React.FC<WorkshopModalsProps> = ({
  colorPaletteModalOpen,
  setColorPaletteModalOpen,
  deleteConfirmOpen,
  setDeleteConfirmOpen,
  fieldToDelete,
  deleteWorkshopFieldMutation,
  vehicleDetailsModalOpen,
  setVehicleDetailsModalOpen,
  vehicle,
  rearrangeModalOpen,
  setRearrangeModalOpen,
  inspectionOrder,
  onUpdateCategoriesOrder,
  onUpdateSectionsOrder,
  onUpdateFieldsOrder,
  getFieldBorderColor,
  updateOrderMutation,
  onSaveOrder,
  onDiscardChanges,
  vehicleType,
  stageSelectionModalOpen,
  setStageSelectionModalOpen,
  availableCompletionStages,
  selectedCompletionStage,
  setSelectedCompletionStage,
  onStageCompletion,
  completeWorkshopModalOpen,
  setCompleteWorkshopModalOpen,
  confirmText,
  setConfirmText,
  completeWorkshopMutation,
  onConfirmCompleteWorkshop,
}) => {
  return (
    <>
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
                label: "Quote Request - Quote Is sent To Supplier's",
                className: "bg-yellow-500",
              },
              {
                label: "Quote Approved - Quote Accepted From The Supplier",
                className: "bg-blue-500",
              },
              {
                label:
                  "Work in Progress - Supplier Started Working On the Vehicle",
                className: "bg-purple-500",
              },
              {
                label:
                  "Work Review - Supplier Submitted the Work And Processing For Preview",
                className: "bg-indigo-500",
              },
              {
                label:
                  "Completed Job - The Work From the Supplier Got Accepted ",
                className: "bg-green-500",
              },
              {
                label: "Rework - Company Will Send the Vehicle For Reworks",
                className: "bg-red-500",
              },
              {
                label: "Quote Rejected - Supplier Rejects the Quote",
                className: "bg-gray-500",
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
            <div className="p-1">
              <VehicleDetailsPanel vehicle={vehicle} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
                  onUpdateCategoriesOrder={onUpdateCategoriesOrder}
                  onUpdateSectionsOrder={onUpdateSectionsOrder}
                  onUpdateFieldsOrder={onUpdateFieldsOrder}
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
                onClick={onDiscardChanges}
                disabled={updateOrderMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={onSaveOrder}
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
              availableCompletionStages.map((stageName) => (
                <div key={stageName} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`stage-${stageName}`}
                    name="completionStage"
                    value={stageName}
                    checked={selectedCompletionStage === stageName}
                    onChange={(e) =>
                      setSelectedCompletionStage(e.target.value)
                    }
                    className="rounded"
                  />
                  <label
                    htmlFor={`stage-${stageName}`}
                    className="flex-1 cursor-pointer p-2 border rounded hover:bg-muted"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{stageName}</span>
                      <Badge variant="default" className="ml-2 bg-green-600">
                        Ready to Complete
                      </Badge>
                    </div>
                  </label>
                </div>
              ))
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
              onClick={onStageCompletion}
              disabled={
                !selectedCompletionStage ||
                availableCompletionStages.length === 0
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
                onClick={onConfirmCompleteWorkshop}
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
    </>
  );
};

export default WorkshopModals;
