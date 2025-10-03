import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Settings2,
  CheckCircle,
  Plus,
  Car,
} from "lucide-react";

interface WorkshopHeaderProps {
  vehicleType: string;
  onInsertField?: () => void;
  onVehicleDetailsClick: () => void;
  onRearrange: () => void;
  onColorPalette: () => void;
  onBack: () => void;
  onCompleteWorkshop: () => void;
  canCompleteWorkshop: boolean;
  isCompletingWorkshop: boolean;
  isInspection: boolean;
}

const WorkshopHeader: React.FC<WorkshopHeaderProps> = ({
  vehicleType,
  onInsertField,
  onVehicleDetailsClick,
  onRearrange,
  onColorPalette,
  onBack,
  onCompleteWorkshop,
  canCompleteWorkshop,
  isCompletingWorkshop,
  isInspection,
}) => {
  return (
    <div className="sticky top-0 z-10 bg-background py-4 border-b">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {vehicleType
            ? vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)
            : ""}{" "}
          Results
        </h3>

        <div className="flex gap-2">
          {vehicleType === "tradein" && onInsertField && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    onClick={onInsertField}
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
                    onClick={onVehicleDetailsClick}
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={onRearrange}
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
                  onClick={onColorPalette}
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
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back to List</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  onClick={onCompleteWorkshop}
                  disabled={
                    isInspection
                      ? false
                      : !canCompleteWorkshop || isCompletingWorkshop
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCompletingWorkshop ? (
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
  );
};

export default WorkshopHeader;
