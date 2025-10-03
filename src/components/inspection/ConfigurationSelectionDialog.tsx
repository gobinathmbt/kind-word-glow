// ConfigurationSelectionDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import { masterInspectionServices } from "@/api/services";

interface Configuration {
  _id: string;
  config_name: string;
  description: string;
  version: string;
  created_at: string;
}

interface ConfigurationSelectionDialogProps {
  isOpen: boolean;
  companyId: string;
  vehicleType: string;
  onConfigurationSelected: (configId: string) => void;
}

const ConfigurationSelectionDialog: React.FC<
  ConfigurationSelectionDialogProps
> = ({ isOpen, companyId, vehicleType, onConfigurationSelected }) => {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadConfigurations();
    }
  }, [isOpen, companyId, vehicleType]);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const response = await masterInspectionServices.getActiveConfigurations(
        companyId,
        vehicleType
      );
      setConfigurations(response.data.data || []);

      // Auto-select first configuration if only one exists
      if (response.data.data?.length === 1) {
        setSelectedConfigId(response.data.data[0]._id);
      }
    } catch (error: any) {
      console.error("Load configurations error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load configurations"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedConfigId) {
      toast.error("Please select a configuration");
      return;
    }
    onConfigurationSelected(selectedConfigId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent
        className="max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Settings className="h-6 w-6 text-primary" />
            <span>Select Configuration</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Choose a configuration to proceed with the {vehicleType} process.
            You must select one to continue.
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-96 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading configurations...
                </p>
              </div>
            </div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                No Configurations Found
              </h3>
              <p className="text-muted-foreground">
                No active configurations available for {vehicleType}. Please
                create one first.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {configurations.map((config) => (
                <Card
                  key={config._id}
                  className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                    selectedConfigId === config._id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedConfigId(config._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-base truncate">
                            {config.config_name}
                          </h4>
                          {selectedConfigId === config._id && (
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>

                        {config.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {config.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Created: {formatDate(config.created_at)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            v{config.version}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            onClick={handleConfirm}
            disabled={!selectedConfigId || loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Continue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigurationSelectionDialog;
