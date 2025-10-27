import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Car, Wrench, ClipboardList, Calculator, FileText, Building } from "lucide-react";
import { commonVehicleServices, vehicleServices } from "@/api/services";
import { toast } from "sonner";
import VehicleOverviewSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleOverviewSection";
import VehicleGeneralInfoSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleGeneralInfoSection";
import VehicleSourceSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleSourceSection";
import VehicleRegistrationSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleRegistrationSection";
import VehicleImportSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleImportSection";
import VehicleEngineSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleEngineSection";
import VehicleSpecificationsSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleSpecificationsSection";
import VehicleOdometerSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleOdometerSection";
import VehicleOwnershipSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleOwnershipSection";
import VehicleAttachmentsSection from "@/components/vehicles/VehicleSections/InspectionSections/VehicleAttachmentsSection";
import WorkshopReportModal from "@/components/workshop/WorkshopReportModal";
import { DealershipManagerButton } from "@/components/common/DealershipManager";
import MasterInspection from "@/components/inspection/MasterInspection";

interface VehicleInspectSideModalProps {
  vehicle: any;
  vehicleType: "inspection" | "tradein" | "advertisement" | "master";
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const VehicleInspectSideModal: React.FC<VehicleInspectSideModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onUpdate,
  vehicleType,
}) => {
  const [workshopReportModalOpen, setWorkshopReportModalOpen] = useState(false);
  const [workshopStageSelectionOpen, setWorkshopStageSelectionOpen] =
    useState(false);
  const [isUpdatingWorkshop, setIsUpdatingWorkshop] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [stageSelectionOpen, setStageSelectionOpen] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [availableStages, setAvailableStages] = useState<string[]>([]);
  const [masterInspectionOpen, setMasterInspectionOpen] = useState(false);
  const [modePopoverOpen, setModePopoverOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"view" | "edit">("edit");
  const [isPricingReady, setIsPricingReady] = useState(false);

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "tradein" | "inspection";
    action?: "push" | "remove";
    stages?: string[];
  } | null>(null);

  useEffect(() => {
    if (
      vehicle &&
      vehicle.vehicle_type === "inspection" &&
      vehicle.inspection_result
    ) {
      const stages = vehicle.inspection_result
        .map((item: any) => item.category_name)
        .filter(Boolean);
      setAvailableStages(stages);
    }
    if (vehicle) {
      setIsPricingReady(vehicle.is_pricing_ready || false);
    }
  }, [vehicle]);

  const handleTogglePricingReady = async () => {
    try {
      await commonVehicleServices.togglePricingReady(vehicle.vehicle_stock_id, {
        vehicle_type: vehicle.vehicle_type,
        is_pricing_ready: !isPricingReady,
      });
      setIsPricingReady(!isPricingReady);
      toast.success(
        `Vehicle ${
          !isPricingReady ? "marked as" : "removed from"
        } pricing ready`
      );
      onUpdate();
    } catch (error) {
      toast.error("Failed to update pricing ready status");
    }
  };

  useEffect(() => {
    if (vehicle && vehicle.vehicle_type === "inspection") {
      const currentlyInWorkshop = Array.isArray(vehicle.is_workshop)
        ? vehicle.is_workshop
            .filter((item: any) => item.in_workshop)
            .map((item: any) => item.stage_name)
        : [];
      setSelectedStages(currentlyInWorkshop);
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const isStageInWorkshop = (stageName: string) => {
    if (!Array.isArray(vehicle.is_workshop)) return false;
    const stageInfo = vehicle.is_workshop.find(
      (item: any) => item.stage_name === stageName
    );
    return stageInfo?.in_workshop || false;
  };

  const getStageProgress = (stageName: string) => {
    if (!Array.isArray(vehicle.workshop_progress)) return "not_processed_yet";
    const progressInfo = vehicle.workshop_progress.find(
      (item: any) => item.stage_name === stageName
    );
    return progressInfo?.progress || "not_processed_yet";
  };

  const canRemoveStage = (stageName: string) => {
    const progress = getStageProgress(stageName);
    return !(progress === "in_progress" || progress === "completed");
  };

  const handlePushToWorkshop = async () => {
    if (vehicle.vehicle_type === "inspection") {
      setStageSelectionOpen(true);
    } else {
      setPendingAction({ type: "tradein" });
      setConfirmationOpen(true);
    }
  };

const handleConfirmAction = async () => {
  try {
    if (!pendingAction) return;

    setIsUpdatingWorkshop(true);

    if (pendingAction.type === "tradein") {
      await vehicleServices.updateVehicleWorkshopStatus(
        vehicle._id,
        vehicleType,
        {
          is_workshop: true,
          workshop_progress: "in_progress",
        }
      );
      toast.success("Vehicle pushed to workshop successfully");

      // Update local state immediately for tradein vehicles
      if (vehicleType === "tradein") {
        vehicle.is_workshop = true;
        vehicle.workshop_progress = "in_progress";
      }

      // Immediately trigger update
      onUpdate();
    } else if (pendingAction.type === "inspection" && pendingAction.stages) {
      await vehicleServices.updateVehicleWorkshopStatus(
        vehicle._id,
        vehicleType,
        {
          stages: pendingAction.stages,
          workshop_action: pendingAction.action,
        }
      );

      const actionText =
        pendingAction.action === "push" ? "pushed to" : "removed from";
      toast.success(`Selected stages ${actionText} workshop successfully`);

      // Close modal
      setStageSelectionOpen(false);

      // Update local state immediately for inspection vehicles
      if (pendingAction.action === "push") {
        // Add the pushed stages to vehicle.is_workshop array
        const updatedWorkshopStages = [...(vehicle.is_workshop || [])];
        pendingAction.stages.forEach(stage => {
          const existingStageIndex = updatedWorkshopStages.findIndex(
            (item: any) => item.stage_name === stage
          );
          
          if (existingStageIndex >= 0) {
            // Update existing stage
            updatedWorkshopStages[existingStageIndex] = {
              ...updatedWorkshopStages[existingStageIndex],
              in_workshop: true
            };
          } else {
            // Add new stage
            updatedWorkshopStages.push({
              stage_name: stage,
              in_workshop: true
            });
          }
        });
        vehicle.is_workshop = updatedWorkshopStages;

        // Update workshop_progress array - change from "not_processed_yet" to "in_progress"
        const updatedWorkshopProgress = [...(vehicle.workshop_progress || [])];
        pendingAction.stages.forEach(stage => {
          const existingProgressIndex = updatedWorkshopProgress.findIndex(
            (item: any) => item.stage_name === stage
          );
          
          if (existingProgressIndex >= 0) {
            // Update existing progress
            updatedWorkshopProgress[existingProgressIndex] = {
              ...updatedWorkshopProgress[existingProgressIndex],
              progress: "in_progress"
            };
          } else {
            // Add new progress entry
            updatedWorkshopProgress.push({
              stage_name: stage,
              progress: "in_progress"
            });
          }
        });
        vehicle.workshop_progress = updatedWorkshopProgress;
        
        // Also update selectedStages state
        setSelectedStages((prev) => [...prev, ...pendingAction.stages!]);
      } else {
        // Remove stages from workshop
        const updatedWorkshopStages = (vehicle.is_workshop || []).map((item: any) => {
          if (pendingAction.stages!.includes(item.stage_name)) {
            return {
              ...item,
              in_workshop: false
            };
          }
          return item;
        });
        vehicle.is_workshop = updatedWorkshopStages;
        
        // Also update selectedStages state
        setSelectedStages((prev) =>
          prev.filter((stage) => !pendingAction.stages!.includes(stage))
        );
      }

      // Trigger parent update to refresh vehicle data
      onUpdate();
    }
  } catch (error) {
    const actionText =
      pendingAction.action === "push" ? "push to" : "remove from";
    toast.error(`Failed to ${actionText} workshop`);
  } finally {
    setConfirmationOpen(false);
    setPendingAction(null);
    setIsUpdatingWorkshop(false);
  }
};

// Also update the handleStageUpdate function for mixed actions
const handleStageUpdate = async () => {
  const currentlyInWorkshop = Array.isArray(vehicle.is_workshop)
    ? vehicle.is_workshop
        .filter((item: any) => item.in_workshop)
        .map((item: any) => item.stage_name)
    : [];

  const stagesToPush = selectedStages.filter(
    (stage) => !currentlyInWorkshop.includes(stage)
  );
  const stagesToRemove = currentlyInWorkshop.filter(
    (stage: any) => !selectedStages.includes(stage) && canRemoveStage(stage)
  );

  if (stagesToPush.length === 0 && stagesToRemove.length === 0) {
    toast.error("No changes to apply");
    return;
  }

  const attemptingToRemoveInProgress = currentlyInWorkshop.filter(
    (stage: any) => !selectedStages.includes(stage) && !canRemoveStage(stage)
  );

  if (attemptingToRemoveInProgress.length > 0) {
    toast.error(
      `Cannot remove stages that are in progress: ${attemptingToRemoveInProgress.join(
        ", "
      )}`
    );
    return;
  }

  // Handle mixed actions (both push and remove)
  if (stagesToPush.length > 0 && stagesToRemove.length > 0) {
    try {
      setIsUpdatingWorkshop(true);

      // Push stages first
      if (stagesToPush.length > 0) {
        await vehicleServices.updateVehicleWorkshopStatus(
          vehicle._id,
          vehicleType,
          {
            stages: stagesToPush,
            workshop_action: "push",
          }
        );
        
        // Update local state immediately for pushed stages
        const updatedWorkshopStages = [...(vehicle.is_workshop || [])];
        stagesToPush.forEach(stage => {
          const existingStageIndex = updatedWorkshopStages.findIndex(
            (item: any) => item.stage_name === stage
          );
          
          if (existingStageIndex >= 0) {
            updatedWorkshopStages[existingStageIndex] = {
              ...updatedWorkshopStages[existingStageIndex],
              in_workshop: true
            };
          } else {
            updatedWorkshopStages.push({
              stage_name: stage,
              in_workshop: true
            });
          }
        });
        vehicle.is_workshop = updatedWorkshopStages;

        // Update workshop_progress array for pushed stages
        const updatedWorkshopProgress = [...(vehicle.workshop_progress || [])];
        stagesToPush.forEach(stage => {
          const existingProgressIndex = updatedWorkshopProgress.findIndex(
            (item: any) => item.stage_name === stage
          );
          
          if (existingProgressIndex >= 0) {
            updatedWorkshopProgress[existingProgressIndex] = {
              ...updatedWorkshopProgress[existingProgressIndex],
              progress: "in_progress"
            };
          } else {
            updatedWorkshopProgress.push({
              stage_name: stage,
              progress: "in_progress"
            });
          }
        });
        vehicle.workshop_progress = updatedWorkshopProgress;
      }

      // Remove stages
      if (stagesToRemove.length > 0) {
        await vehicleServices.updateVehicleWorkshopStatus(
          vehicle._id,
          vehicleType,
          {
            stages: stagesToRemove,
            workshop_action: "remove",
          }
        );
        
        // Update local state immediately for removed stages
        const updatedWorkshopStages = (vehicle.is_workshop || []).map((item: any) => {
          if (stagesToRemove.includes(item.stage_name)) {
            return {
              ...item,
              in_workshop: false
            };
          }
          return item;
        });
        vehicle.is_workshop = updatedWorkshopStages;
      }

      toast.success("Workshop stages updated successfully");
      setStageSelectionOpen(false);

      // Update selectedStages state
      const updatedStages = [
        ...currentlyInWorkshop.filter(
          (stage) => !stagesToRemove.includes(stage)
        ),
        ...stagesToPush,
      ];
      setSelectedStages(updatedStages);

      // Trigger parent update to refresh vehicle data
      onUpdate();
    } catch (error) {
      toast.error("Failed to update workshop stages");
    } finally {
      setIsUpdatingWorkshop(false);
    }
    return;
  }

  // Handle single action (either push or remove)
  const action = stagesToPush.length > 0 ? "push" : "remove";
  const stages = stagesToPush.length > 0 ? stagesToPush : stagesToRemove;

  setPendingAction({
    type: "inspection",
    action,
    stages,
  });
  setConfirmationOpen(true);
};

  const getWorkshopStatusDisplay = () => {
    if (vehicle.vehicle_type !== "inspection") {
      return vehicle.is_workshop ? "In Workshop" : "Push to Workshop";
    }

    if (Array.isArray(vehicle.is_workshop)) {
      const inWorkshopStages = vehicle.is_workshop.filter(
        (item: any) => item.in_workshop
      );
      if (inWorkshopStages.length > 0) {
        return `${inWorkshopStages.length} Stage(s) in Workshop`;
      }
    }
    return "Manage Workshop Stages";
  };

  const getWorkshopTooltipContent = () => {
    if (vehicle.vehicle_type !== "inspection") {
      return vehicle.is_workshop ? "Vehicle is in workshop" : "Push vehicle to workshop";
    }

    if (Array.isArray(vehicle.is_workshop)) {
      const inWorkshopStages = vehicle.is_workshop.filter(
        (item: any) => item.in_workshop
      );
      if (inWorkshopStages.length > 0) {
        return `${inWorkshopStages.length} Stage(s) in Workshop: ${inWorkshopStages.map((item: any) => item.stage_name).join(', ')}`;
      }
    }
    return "Manage workshop stages";
  };

  const handleModeSelection = (mode: "view" | "edit") => {
    setSelectedMode(mode);
    setModePopoverOpen(false);
    setMasterInspectionOpen(true);
  };

  const handleWorkshopReport = () => {
    if (vehicle.vehicle_type === "inspection") {
      setWorkshopStageSelectionOpen(true);
    } else {
      setWorkshopReportModalOpen(true);
    }
  };

  const handleStageSelection = (stageName: string) => {
    setSelectedStage(stageName);
    setWorkshopStageSelectionOpen(false);
    setWorkshopReportModalOpen(true);
  };

  const getConfirmationMessage = () => {
    if (!pendingAction) return "";

    if (pendingAction.type === "tradein") {
      return "Are you sure you want to push this vehicle to the workshop?";
    }

    if (pendingAction.type === "inspection") {
      const actionText =
        pendingAction.action === "push" ? "push to" : "remove from";
      const stagesText = pendingAction.stages?.join(", ") || "";
      return `Are you sure you want to ${actionText} workshop the following stages: ${stagesText}?`;
    }

    return "";
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          onCloseClick={onClose}
          className="w-full sm:w-[600px] md:w-[800px] lg:w-[1000px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] overflow-y-auto"
        >
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Car className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-xl">
                    {vehicle.name || `${vehicle.make} ${vehicle.model}`}
                  </SheetTitle>
                  <SheetDescription>
                    Stock ID: {vehicle.vehicle_stock_id} • {vehicle.year} •{" "}
                    {vehicle.vehicle_type}
                  </SheetDescription>
                </div>
              </div>
            </div>

            {vehicleType !== "advertisement" && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={
                            vehicle.vehicle_type === "inspection"
                              ? Array.isArray(vehicle.is_workshop) &&
                                vehicle.is_workshop.some(
                                  (item: any) => item.in_workshop
                                )
                                ? "default"
                                : "outline"
                              : vehicle.is_workshop
                              ? "default"
                              : "outline"
                          }
                          size="icon"
                          onClick={handlePushToWorkshop}
                          disabled={
                            isUpdatingWorkshop ||
                            (vehicle.vehicle_type === "inspection"
                              ? false
                              : vehicle.workshop_progress === "completed")
                          }
                          className={
                            (
                              vehicle.vehicle_type === "inspection"
                                ? Array.isArray(vehicle.is_workshop) &&
                                  vehicle.is_workshop.some(
                                    (item: any) => item.in_workshop
                                  )
                                : vehicle.is_workshop
                            )
                              ? "bg-orange-500 hover:bg-orange-600 text-white"
                              : ""
                          }
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getWorkshopTooltipContent()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Popover
                    open={modePopoverOpen}
                    onOpenChange={setModePopoverOpen}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon">
                              {vehicle.vehicle_type === "inspection" ? (
                                <ClipboardList className="h-4 w-4" />
                              ) : (
                                <Calculator className="h-4 w-4" />
                              )}
                            </Button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {vehicle.vehicle_type === "inspection"
                              ? "Inspection"
                              : "Trade-in"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleModeSelection("view")}
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          View Mode
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleModeSelection("edit")}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Edit Mode
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {(() => {
                    if (vehicle.vehicle_type === "tradein") {
                      return (
                        vehicle.workshop_progress === "completed" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleWorkshopReport}
                                  disabled={vehicle.workshop_report_preparing}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Workshop Report</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      );
                    } else if (vehicle.vehicle_type === "inspection") {
                      const hasPreparingReports =
                        Array.isArray(vehicle.workshop_report_preparing) &&
                        vehicle.workshop_report_preparing.some(
                          (stage: any) => stage.preparing
                        );

                      const hasReadyReports =
                        Array.isArray(vehicle.workshop_report_ready) &&
                        vehicle.workshop_report_ready.length > 0;

                      const showButton = hasPreparingReports || hasReadyReports;

                      if (showButton) {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleWorkshopReport}
                                  disabled={hasPreparingReports && !hasReadyReports}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {hasPreparingReports && !hasReadyReports
                                    ? "Preparing Report..."
                                    : "Workshop Report"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Updated Dealership Manager Button as Icon */}
                  <DealershipManagerButton
                    vehicleData={{
                      vehicleType: vehicle.vehicle_type,
                      vehicleIds: [vehicle._id],
                      currentDealership: vehicle.dealership_id,
                      stockNumber: vehicle.vehicle_stock_id,
                    }}
                    variant="outline"
                    size="icon"
                    onSuccess={onUpdate}
                  />

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isPricingReady ? "default" : "outline"}
                          size="icon"
                          onClick={handleTogglePricingReady}
                          className={
                            isPricingReady
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : ""
                          }
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isPricingReady
                            ? "Pricing Ready"
                            : "Mark Pricing Ready"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </SheetHeader>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <VehicleOverviewSection vehicle={vehicle} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <VehicleGeneralInfoSection
                vehicle={vehicle}
                onUpdate={onUpdate}
              />
              <VehicleSourceSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleRegistrationSection
                vehicle={vehicle}
                onUpdate={onUpdate}
              />
              <VehicleImportSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleEngineSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleSpecificationsSection
                vehicle={vehicle}
                onUpdate={onUpdate}
              />
              <VehicleOdometerSection vehicle={vehicle} onUpdate={onUpdate} />
              <VehicleOwnershipSection vehicle={vehicle} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="attachments">
              <VehicleAttachmentsSection
                vehicle={vehicle}
                onUpdate={onUpdate}
                vehicleType={vehicleType}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <Dialog
        open={workshopStageSelectionOpen}
        onOpenChange={setWorkshopStageSelectionOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <SheetTitle>Select Inspection Stage</SheetTitle>
            <SheetDescription>
              Choose which inspection stage report you want to view
            </SheetDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Array.isArray(vehicle.workshop_report_ready) &&
              vehicle.workshop_report_ready.map((stage: any) => (
                <Button
                  key={stage.stage_name}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStageSelection(stage.stage_name)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {stage.stage_name}
                  <Badge
                    className="ml-auto"
                    variant={stage.ready ? "default" : "secondary"}
                  >
                    {stage.ready ? "Ready" : "Preparing"}
                  </Badge>
                </Button>
              ))}
            {(!vehicle.workshop_report_ready ||
              vehicle.workshop_report_ready.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                No inspection stage reports available yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stageSelectionOpen} onOpenChange={setStageSelectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <SheetTitle>Manage Workshop Stages</SheetTitle>
            <SheetDescription>
              Select stages to push to workshop or unselect to remove from
              workshop
            </SheetDescription>
          </DialogHeader>
          <div className="space-y-3">
            {availableStages.map((stageName) => {
              const inWorkshop = isStageInWorkshop(stageName);
              const progress = getStageProgress(stageName);
              const canEdit = canRemoveStage(stageName);
              const isSelected = selectedStages.includes(stageName);

              return (
                <div
                  key={stageName}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (!canEdit && inWorkshop && !e.target.checked) {
                          return;
                        }

                        if (e.target.checked) {
                          setSelectedStages((prev) => [...prev, stageName]);
                        } else {
                          setSelectedStages((prev) =>
                            prev.filter((s) => s !== stageName)
                          );
                        }
                      }}
                      disabled={!canEdit && inWorkshop}
                      className="rounded"
                    />
                    <span
                      className={`font-medium ${
                        !canEdit && inWorkshop ? "text-gray-500" : ""
                      }`}
                    >
                      {stageName}
                    </span>
                    {!canEdit && inWorkshop && (
                      <span className="text-xs text-gray-500">
                        (Cannot edit - In Progress)
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    {inWorkshop && (
                      <Badge variant="default" className="text-xs">
                        In Workshop
                      </Badge>
                    )}
                    <Badge
                      variant={
                        progress === "completed"
                          ? "default"
                          : progress === "in_progress"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {progress.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStageSelectionOpen(false);
                const currentlyInWorkshop = Array.isArray(vehicle.is_workshop)
                  ? vehicle.is_workshop
                      .filter((item: any) => item.in_workshop)
                      .map((item: any) => item.stage_name)
                  : [];
                setSelectedStages(currentlyInWorkshop);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleStageUpdate}>Apply Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmationOpen(false);
                setPendingAction(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MasterInspection
        isOpen={masterInspectionOpen}
        onClose={() => setMasterInspectionOpen(false)}
        companyId={vehicle.company_id}
        vehicleStockId={vehicle.vehicle_stock_id}
        vehicleType={vehicle.vehicle_type}
        mode={selectedMode}
      />

      <WorkshopReportModal
        isOpen={workshopReportModalOpen}
        onClose={() => {
          setWorkshopReportModalOpen(false);
          setSelectedStage("");
        }}
        vehicleId={vehicle._id}
        vehicleType={vehicle.vehicle_type}
        stageName={selectedStage}
      />
    </>
  );
};

export default VehicleInspectSideModal;