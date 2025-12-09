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
import { Loader2, Settings, Calendar, Check, FileEdit } from "lucide-react";
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
  onTemplateFreeMode?: () => void;
}

const ConfigurationSelectionDialog: React.FC<
  ConfigurationSelectionDialogProps
> = ({ isOpen, companyId, vehicleType, onConfigurationSelected, onTemplateFreeMode }) => {
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

  const handleTemplateFreeMode = () => {
    if (onTemplateFreeMode) {
      onTemplateFreeMode();
    }
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
            <span>Select Configuration Mode</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Choose a pre-configured template or start with a blank template-free mode.
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-96 py-4">
          {/* Template Free Mode Option */}
          {onTemplateFreeMode && (
            <div className="mb-4">
              <Card
                className="cursor-pointer transition-all hover:shadow-md border-2 border-dashed border-blue-300 bg-blue-50/50 hover:border-blue-500"
                onClick={handleTemplateFreeMode}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <FileEdit className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base text-blue-900 mb-1">
                        Template Free Mode
                      </h4>
                      <p className="text-sm text-blue-700">
                        Start with a blank form and add fields on the spot as you fill details
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Divider */}
          {onTemplateFreeMode && configurations.length > 0 && (
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>
          )}

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
                No Pre-configured Templates Found
              </h3>
              <p className="text-muted-foreground mb-4">
                No active configurations available for {vehicleType}.
              </p>
              {onTemplateFreeMode && (
                <p className="text-sm text-blue-600">
                  You can use Template Free Mode above to proceed without a template.
                </p>
              )}
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
          {configurations.length > 0 && (
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
                  Continue with Template
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigurationSelectionDialog;
