import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { integrationServices } from "@/api/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";

interface AutoGrabConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: any;
}

const AutoGrabConfigDialog: React.FC<AutoGrabConfigDialogProps> = ({ 
  isOpen, 
  onClose, 
  integration 
}) => {
  const queryClient = useQueryClient();
  const [activeEnvironment, setActiveEnvironment] = useState(
    integration?.active_environment || "production"
  );

  const getEnvironmentConfig = (env: string) => {
    return integration?.environments?.[env] || {};
  };

  const [formData, setFormData] = useState({
    development: {
      api_key: getEnvironmentConfig("development")?.configuration?.api_key || "",
      vehicle_retrieval_url: getEnvironmentConfig("development")?.configuration?.vehicle_retrieval_url || "https://api.autograb.com.au/v2/vehicles/registrations",
      valuation_url: getEnvironmentConfig("development")?.configuration?.valuation_url || "https://api.autograb.com.au/v2/valuations/predict",
      is_active: getEnvironmentConfig("development")?.is_active || false,
    },
    testing: {
      api_key: getEnvironmentConfig("testing")?.configuration?.api_key || "",
      vehicle_retrieval_url: getEnvironmentConfig("testing")?.configuration?.vehicle_retrieval_url || "https://api.autograb.com.au/v2/vehicles/registrations",
      valuation_url: getEnvironmentConfig("testing")?.configuration?.valuation_url || "https://api.autograb.com.au/v2/valuations/predict",
      is_active: getEnvironmentConfig("testing")?.is_active || false,
    },
    production: {
      api_key: getEnvironmentConfig("production")?.configuration?.api_key || "",
      vehicle_retrieval_url: getEnvironmentConfig("production")?.configuration?.vehicle_retrieval_url || "https://api.autograb.com.au/v2/vehicles/registrations",
      valuation_url: getEnvironmentConfig("production")?.configuration?.valuation_url || "https://api.autograb.com.au/v2/valuations/predict",
      is_active: getEnvironmentConfig("production")?.is_active || false,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (integration) {
        return integrationServices.updateIntegration(integration._id, data);
      }
      return integrationServices.createIntegration(data);
    },
    onSuccess: () => {
      toast.success("AutoGrab configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save AutoGrab configuration");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const activeEnvData = formData[activeEnvironment];
    if (!activeEnvData.api_key.trim()) {
      toast.error(`API Key is required for ${activeEnvironment} environment`);
      return;
    }

    if (!activeEnvData.vehicle_retrieval_url.trim()) {
      toast.error(`Vehicle Retrieval URL is required for ${activeEnvironment} environment`);
      return;
    }

    if (!activeEnvData.valuation_url.trim()) {
      toast.error(`Valuation URL is required for ${activeEnvironment} environment`);
      return;
    }

    // Validate URL format
    try {
      new URL(activeEnvData.vehicle_retrieval_url);
      new URL(activeEnvData.valuation_url);
    } catch {
      toast.error("Please enter valid URLs");
      return;
    }

    const environments = {
      development: {
        configuration: {
          api_key: formData.development.api_key,
          vehicle_retrieval_url: formData.development.vehicle_retrieval_url,
          valuation_url: formData.development.valuation_url,
        },
        is_active: formData.development.is_active,
      },
      testing: {
        configuration: {
          api_key: formData.testing.api_key,
          vehicle_retrieval_url: formData.testing.vehicle_retrieval_url,
          valuation_url: formData.testing.valuation_url,
        },
        is_active: formData.testing.is_active,
      },
      production: {
        configuration: {
          api_key: formData.production.api_key,
          vehicle_retrieval_url: formData.production.vehicle_retrieval_url,
          valuation_url: formData.production.valuation_url,
        },
        is_active: formData.production.is_active,
      },
    };

    saveMutation.mutate({
      integration_type: "autograb_vehicle_pricing_integration",
      display_name: "AutoGrab Vehicle Pricing",
      environments,
      active_environment: activeEnvironment,
      is_active: true,
    });
  };

  const handleInputChange = (env: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        [field]: value,
      },
    }));
  };

  const renderEnvironmentForm = (env: string) => {
    const envData = formData[env];

    return (
      <div className="space-y-6 py-4">
        {/* Authentication Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            Authentication
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor={`${env}_api_key`}>
              API Key <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}_api_key`}
              type="password"
              placeholder="Enter your AutoGrab API key"
              value={envData.api_key}
              onChange={(e) => handleInputChange(env, "api_key", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your AutoGrab API authentication key
            </p>
          </div>
        </div>

        {/* API Endpoints Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            API Endpoints
          </h3>

          <div className="space-y-2">
            <Label htmlFor={`${env}_vehicle_retrieval_url`}>
              Vehicle Retrieval URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}_vehicle_retrieval_url`}
              type="url"
              placeholder="https://api.autograb.com.au/v2/vehicles/registrations"
              value={envData.vehicle_retrieval_url}
              onChange={(e) => handleInputChange(env, "vehicle_retrieval_url", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Base URL for vehicle registration lookups
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${env}_valuation_url`}>
              Valuation URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}_valuation_url`}
              type="url"
              placeholder="https://api.autograb.com.au/v2/valuations/predict"
              value={envData.valuation_url}
              onChange={(e) => handleInputChange(env, "valuation_url", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              URL for vehicle valuation predictions
            </p>
          </div>
        </div>

        {/* Environment Status */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            Environment Status
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor={`${env}_is_active`}>
                Activate {env.charAt(0).toUpperCase() + env.slice(1)} Environment
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable this environment for API calls
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor={`${env}_is_active`} className="text-sm">
                {envData.is_active ? "Active" : "Inactive"}
              </Label>
              <input
                id={`${env}_is_active`}
                type="checkbox"
                checked={envData.is_active}
                onChange={(e) => handleInputChange(env, "is_active", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure AutoGrab Vehicle Pricing Integration</DialogTitle>
          <DialogDescription>
            Configure your AutoGrab API credentials and endpoints for vehicle pricing and valuation services
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Active Environment Selection */}
          <div className="space-y-2">
            <Label htmlFor="active_environment">Active Environment</Label>
            <Select
              value={activeEnvironment}
              onValueChange={setActiveEnvironment}
            >
              <SelectTrigger id="active_environment">
                <SelectValue placeholder="Select active environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select which environment to use for API calls
            </p>
          </div>

          {/* Environment Tabs */}
          <Tabs value={activeEnvironment} onValueChange={setActiveEnvironment}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="development">Development</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>
            <TabsContent value="development">
              {renderEnvironmentForm("development")}
            </TabsContent>
            <TabsContent value="testing">
              {renderEnvironmentForm("testing")}
            </TabsContent>
            <TabsContent value="production">
              {renderEnvironmentForm("production")}
            </TabsContent>
          </Tabs>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">AutoGrab API Information</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Sign up at AutoGrab to obtain API credentials</li>
                <li>Each environment can have separate API keys</li>
                <li>API usage may incur costs based on your plan</li>
                <li>Visit <a href="https://devhub.autograb.com/" target="_blank" rel="noopener noreferrer" className="underline">AutoGrab DevHub</a> for documentation</li>
              </ul>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : integration ? "Update Configuration" : "Save Configuration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AutoGrabConfigDialog;