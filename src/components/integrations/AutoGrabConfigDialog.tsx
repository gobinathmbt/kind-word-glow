import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { integrationServices } from "@/api/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>(
    integration?.environment || "production"
  );
  
  const getEnvConfig = (env: string) => {
    return integration?.configuration?.[env] || {};
  };

  const [environmentConfigs, setEnvironmentConfigs] = useState({
    development: {
      api_key: getEnvConfig("development").api_key || "",
      api_secret: getEnvConfig("development").api_secret || "",
      base_url: getEnvConfig("development").base_url || "https://api-dev.autograb.com.au",
      timeout: getEnvConfig("development").timeout || "30000",
      enable_caching: getEnvConfig("development").enable_caching ?? true,
      cache_duration: getEnvConfig("development").cache_duration || "3600",
      enable_vin_lookup: getEnvConfig("development").enable_vin_lookup ?? true,
      enable_rego_lookup: getEnvConfig("development").enable_rego_lookup ?? true,
      enable_valuations: getEnvConfig("development").enable_valuations ?? true,
    },
    testing: {
      api_key: getEnvConfig("testing").api_key || "",
      api_secret: getEnvConfig("testing").api_secret || "",
      base_url: getEnvConfig("testing").base_url || "https://api-test.autograb.com.au",
      timeout: getEnvConfig("testing").timeout || "30000",
      enable_caching: getEnvConfig("testing").enable_caching ?? true,
      cache_duration: getEnvConfig("testing").cache_duration || "3600",
      enable_vin_lookup: getEnvConfig("testing").enable_vin_lookup ?? true,
      enable_rego_lookup: getEnvConfig("testing").enable_rego_lookup ?? true,
      enable_valuations: getEnvConfig("testing").enable_valuations ?? true,
    },
    production: {
      api_key: getEnvConfig("production").api_key || "",
      api_secret: getEnvConfig("production").api_secret || "",
      base_url: getEnvConfig("production").base_url || "https://api.autograb.com.au",
      timeout: getEnvConfig("production").timeout || "30000",
      enable_caching: getEnvConfig("production").enable_caching ?? true,
      cache_duration: getEnvConfig("production").cache_duration || "3600",
      enable_vin_lookup: getEnvConfig("production").enable_vin_lookup ?? true,
      enable_rego_lookup: getEnvConfig("production").enable_rego_lookup ?? true,
      enable_valuations: getEnvConfig("production").enable_valuations ?? true,
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
    
    // Validation - at least one environment must have API key
    const hasValidConfig = Object.values(environmentConfigs).some((config: any) => config.api_key.trim());
    
    if (!hasValidConfig) {
      toast.error("At least one environment must have an API Key configured");
      return;
    }

    // Validate URLs for all configured environments
    Object.entries(environmentConfigs).forEach(([env, config]: [string, any]) => {
      if (config.api_key.trim() && config.base_url.trim()) {
        try {
          new URL(config.base_url);
        } catch {
          toast.error(`Please enter a valid Base URL for ${env} environment`);
          throw new Error("Invalid URL");
        }
      }
    });

    saveMutation.mutate({
      integration_type: "autograb_vehicle_pricing_integration",
      display_name: "AutoGrab Vehicle Pricing",
      environment: selectedEnvironment,
      configuration: environmentConfigs,
      is_active: true,
    });
  };

  const handleInputChange = (env: string, field: string, value: any) => {
    setEnvironmentConfigs(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        [field]: value,
      },
    }));
  };

  const renderEnvironmentForm = (env: string) => {
    const formData = environmentConfigs[env];
    
    return (
      <div className="space-y-6">
        {/* Authentication Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
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
              value={formData.api_key}
              onChange={(e) => handleInputChange(env, "api_key", e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Your AutoGrab API authentication key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${env}_api_secret`}>API Secret (Optional)</Label>
            <Input
              id={`${env}_api_secret`}
              type="password"
              placeholder="Enter your AutoGrab API secret"
              value={formData.api_secret}
              onChange={(e) => handleInputChange(env, "api_secret", e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Additional secret key if required by your AutoGrab plan
            </p>
          </div>
        </div>

        {/* Connection Settings Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Connection Settings
          </h3>

          <div className="space-y-2">
            <Label htmlFor={`${env}_base_url`}>
              Base URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}_base_url`}
              type="url"
              placeholder="https://api.autograb.com.au"
              value={formData.base_url}
              onChange={(e) => handleInputChange(env, "base_url", e.target.value)}
            />
            <p className="text-xs text-gray-500">
              AutoGrab API base endpoint URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${env}_timeout`}>Request Timeout (ms)</Label>
            <Input
              id={`${env}_timeout`}
              type="number"
              placeholder="30000"
              value={formData.timeout}
              onChange={(e) => handleInputChange(env, "timeout", e.target.value)}
              min="1000"
              max="120000"
            />
            <p className="text-xs text-gray-500">
              Maximum time to wait for API response (1000-120000 ms)
            </p>
          </div>
        </div>

        {/* Caching Settings Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Caching & Performance
          </h3>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor={`${env}_enable_caching`}>Enable Response Caching</Label>
              <p className="text-xs text-gray-500">
                Cache API responses to reduce costs and improve performance
              </p>
            </div>
            <Switch
              id={`${env}_enable_caching`}
              checked={formData.enable_caching}
              onCheckedChange={(checked) => handleInputChange(env, "enable_caching", checked)}
            />
          </div>

          {formData.enable_caching && (
            <div className="space-y-2">
              <Label htmlFor={`${env}_cache_duration`}>Cache Duration (seconds)</Label>
              <Input
                id={`${env}_cache_duration`}
                type="number"
                placeholder="3600"
                value={formData.cache_duration}
                onChange={(e) => handleInputChange(env, "cache_duration", e.target.value)}
                min="60"
                max="86400"
              />
              <p className="text-xs text-gray-500">
                How long to cache pricing data (60-86400 seconds)
              </p>
            </div>
          )}
        </div>

        {/* Feature Flags Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Enabled Features
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor={`${env}_enable_vin_lookup`}>VIN Lookups</Label>
                <p className="text-xs text-gray-500">
                  Enable vehicle lookup by VIN number
                </p>
              </div>
              <Switch
                id={`${env}_enable_vin_lookup`}
                checked={formData.enable_vin_lookup}
                onCheckedChange={(checked) => handleInputChange(env, "enable_vin_lookup", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor={`${env}_enable_rego_lookup`}>Rego Lookups</Label>
                <p className="text-xs text-gray-500">
                  Enable vehicle lookup by registration number
                </p>
              </div>
              <Switch
                id={`${env}_enable_rego_lookup`}
                checked={formData.enable_rego_lookup}
                onCheckedChange={(checked) => handleInputChange(env, "enable_rego_lookup", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor={`${env}_enable_valuations`}>Vehicle Valuations</Label>
                <p className="text-xs text-gray-500">
                  Enable vehicle valuation and pricing data
                </p>
              </div>
              <Switch
                id={`${env}_enable_valuations`}
                checked={formData.enable_valuations}
                onCheckedChange={(checked) => handleInputChange(env, "enable_valuations", checked)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure AutoGrab Vehicle Pricing Integration</DialogTitle>
          <DialogDescription>
            Configure your AutoGrab API credentials and settings for different environments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Active Environment Selection */}
          <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
            <Label htmlFor="active_environment">Active Environment</Label>
            <Select
              value={selectedEnvironment}
              onValueChange={setSelectedEnvironment}
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
            <p className="text-xs text-gray-600">
              Select which environment configuration to use for API calls
            </p>
          </div>

          {/* Environment Tabs */}
          <Tabs defaultValue="production" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="development">Development</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>
            
            <TabsContent value="development" className="mt-6">
              {renderEnvironmentForm("development")}
            </TabsContent>
            
            <TabsContent value="testing" className="mt-6">
              {renderEnvironmentForm("testing")}
            </TabsContent>
            
            <TabsContent value="production" className="mt-6">
              {renderEnvironmentForm("production")}
            </TabsContent>
          </Tabs>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">AutoGrab API Information</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Visit <a href="https://devhub.autograb.com/" target="_blank" rel="noopener noreferrer" className="underline">devhub.autograb.com</a> for API documentation</li>
                <li>Contact AutoGrab to obtain API credentials for each environment</li>
                <li>Configure separate credentials for development, testing, and production</li>
                <li>API usage may incur costs based on your agreement</li>
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
