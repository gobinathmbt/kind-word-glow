import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, ArrowLeft, FileText, Save, Loader2, Eye } from "lucide-react";

interface MasterInspectionHeaderProps {
  vehicle: any;
  vehicleType: string;
  mode: string;
  config: any;
  saving: boolean;
  reportPdfUrl: string;
  onBack: () => void;
  onGenerateReport: () => void;
  onSave: () => void;
  onViewPdf: () => void;
  hasCurrentPdf: boolean;
}

const MasterInspectionHeader: React.FC<MasterInspectionHeaderProps> = ({
  vehicle,
  vehicleType,
  mode,
  config,
  saving,
  reportPdfUrl,
  onBack,
  onGenerateReport,
  onSave,
  onViewPdf,
  hasCurrentPdf,
}) => {
  const isViewMode = mode === "view";

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="hover:bg-blue-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Back</span>
            </Button>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  {vehicle
                    ? `${vehicle.make} ${vehicle.model}`
                    : "Vehicle Inspection"}
                </h1>
                <div className="flex items-center flex-wrap gap-1 mt-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {vehicle
                      ? `Stock ID: ${vehicle.vehicle_stock_id} • ${vehicle.year}`
                      : config.config_name}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {vehicleType}
                  </Badge>
                  <Badge
                    variant={isViewMode ? "secondary" : "default"}
                    className="text-xs"
                  >
                    {isViewMode ? "View Mode" : "Edit Mode"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {!isViewMode && (
            <div className="flex space-x-2">
              <Button
                onClick={onGenerateReport}
                variant="outline"
                className="shadow-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Preview Report
              </Button>

              {hasCurrentPdf && (
                <Button
                  onClick={onViewPdf}
                  variant="outline"
                  className="shadow-sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View PDF
                </Button>
              )}

              <Button
                onClick={onSave}
                disabled={saving}
                size="lg"
                className="shadow-sm w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterInspectionHeader;