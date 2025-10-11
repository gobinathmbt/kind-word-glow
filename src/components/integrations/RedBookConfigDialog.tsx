import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { integrationServices } from "@/api/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";

interface RedBookConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: any;
}

const RedBookConfigDialog: React.FC<RedBookConfigDialogProps> = ({ 
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
      api_secret: getEnvironmentConfig("development")?.configuration?.api_secret || "",
      base_url: getEnvironmentConfig("development")?.configuration?.base_url || "https://sandbox.redbookdirect.com",
      client_id: getEnvironmentConfig("development")?.configuration?.client_id || "",
      timeout: getEnvironmentConfig("development")?.configuration?.timeout || "30000",
      enable_caching: getEnvironmentConfig("development")?.configuration?.enable_caching ?? true,
      cache_duration: getEnvironmentConfig("development")?.configuration?.cache_duration || "3600",
      webhook_url: getEnvironmentConfig("development")?.configuration?.webhook_url || "",
      enable_valuations: getEnvironmentConfig("development")?.configuration?.enable_valuations ?? true,
      enable_specifications: getEnvironmentConfig("development")?.configuration?.enable_specifications ?? true,
      enable_images: getEnvironmentConfig("development")?.configuration?.enable_images ?? false,
      is_active: getEnvironmentConfig("development")?.is_active || false,
    },
    testing: {
      api_key: getEnvironmentConfig("testing")?.configuration?.api_key || "",
      api_secret: getEnvironmentConfig("testing")?.configuration?.api_secret || "",
      base_url: getEnvironmentConfig("testing")?.configuration?.base_url || "https://test.redbookdirect.com",
      client_id: getEnvironmentConfig("testing")?.configuration?.client_id || "",
      timeout: getEnvironmentConfig("testing")?.configuration?.timeout || "30000",
      enable_caching: getEnvironmentConfig("testing")?.configuration?.enable_caching ?? true,
      cache_duration: getEnvironmentConfig("testing")?.configuration?.cache_duration || "3600",
      webhook_url: getEnvironmentConfig("testing")?.configuration?.webhook_url || "",
      enable_valuations: getEnvironmentConfig("testing")?.configuration?.enable_valuations ?? true,
      enable_specifications: getEnvironmentConfig("testing")?.configuration?.enable_specifications ?? true,
      enable_images: getEnvironmentConfig("testing")?.configuration?.enable_images ?? false,
      is_active: getEnvironmentConfig("testing")?.is_active || false,
    },
    production: {
      api_key: getEnvironmentConfig("production")?.configuration?.api_key || "",
      api_secret: getEnvironmentConfig("production")?.configuration?.api_secret || "",
      base_url: getEnvironmentConfig("production")?.configuration?.base_url || "https://api.redbookdirect.com",
      client_id: getEnvironmentConfig("production")?.configuration?.client_id || "",
      timeout: getEnvironmentConfig("production")?.configuration?.timeout || "30000",
      enable_caching: getEnvironmentConfig("production")?.configuration?.enable_caching ?? true,
      cache_duration: getEnvironmentConfig("production")?.configuration?.cache_duration || "3600",
      webhook_url: getEnvironmentConfig("production")?.configuration?.webhook_url || "",
      enable_valuations: getEnvironmentConfig("production")?.configuration?.enable_valuations ?? true,
      enable_specifications: getEnvironmentConfig("production")?.configuration?.enable_specifications ?? true,
      enable_images: getEnvironmentConfig("production")?.configuration?.enable_images ?? false,
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
      toast.success("RedBook configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save RedBook configuration");
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

    if (!activeEnvData.base_url.trim()) {
      toast.error(`Base URL is required for ${activeEnvironment} environment`);
      return;
    }

    // Validate URL format
    try {
      new URL(activeEnvData.base_url);
    } catch {
      toast.error("Please enter a valid Base URL");
      return;
    }

    const environments = {
      development: {
        configuration: {
          api_key: formData.development.api_key,
          api_secret: formData.development.api_secret,
          base_url: formData.development.base_url,
          client_id: formData.development.client_id,
          timeout: parseInt(formData.development.timeout) || 30000,
          enable_caching: formData.development.enable_caching,
          cache_duration: parseInt(formData.development.cache_duration) || 3600,
          webhook_url: formData.development.webhook_url,
          enable_valuations: formData.development.enable_valuations,
          enable_specifications: formData.development.enable_specifications,
          enable_images: formData.development.enable_images,
        },
        is_active: formData.development.is_active,
      },
      testing: {
        configuration: {
          api_key: formData.testing.api_key,
          api_secret: formData.testing.api_secret,
          base_url: formData.testing.base_url,
          client_id: formData.testing.client_id,
          timeout: parseInt(formData.testing.timeout) || 30000,
          enable_caching: formData.testing.enable_caching,
          cache_duration: parseInt(formData.testing.cache_duration) || 3600,
          webhook_url: formData.testing.webhook_url,
          enable_valuations: formData.testing.enable_valuations,
          enable_specifications: formData.testing.enable_specifications,
          enable_images: formData.testing.enable_images,
        },
        is_active: formData.testing.is_active,
      },
      production: {
        configuration: {
          api_key: formData.production.api_key,
          api_secret: formData.production.api_secret,
          base_url: formData.production.base_url,
          client_id: formData.production.client_id,
          timeout: parseInt(formData.production.timeout) || 30000,
          enable_caching: formData.production.enable_caching,
          cache_duration: parseInt(formData.production.cache_duration) || 3600,
          webhook_url: formData.production.webhook_url,
          enable_valuations: formData.production.enable_valuations,
          enable_specifications: formData.production.enable_specifications,
          enable_images: formData.production.enable_images,
        },
        is_active: formData.production.is_active,
      },
    };

    saveMutation.mutate({
      integration_type: "redbook_vehicle_pricing_integration",
      display_name: "RedBook Vehicle Pricing",
      environments,
      active_environment: activeEnvironment,
      configuration: environments[activeEnvironment].configuration, // Backward compatibility
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
              placeholder="Enter your RedBook API key"
              value={envData.api_key}
              onChange={(e) => handleInputChange(env, "api_key", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your RedBook API authentication key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${env}_api_secret`}>API Secret (Optional)</Label>
            <Input
              id={`${env}_api_secret`}
              type="password"
              placeholder="Enter your RedBook API secret"
              value={envData.api_secret}
              onChange={(e) => handleInputChange(env, "api_secret", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Additional secret key if required by your RedBook plan
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${env}_client_id`}>Client ID (Optional)</Label>
            <Input
              id={`${env}_client_id`}
              type="text"
              placeholder="Enter your client ID"
              value={envData.client_id}
              onChange={(e) => handleInputChange(env, "client_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your RedBook client identifier if applicable
            </p>
          </div>
        </div>

        {/* Connection Settings Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            Connection Settings
          </h3>

          <div className="space-y-2">
            <Label htmlFor={`${env}_base_url`}>
              Base URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}_base_url`}
              type="url"
              placeholder="https://api.redbookdirect.com"
              value={envData.base_url}
              onChange={(e) => handleInputChange(env, "base_url", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              RedBook API base endpoint URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${env}_timeout`}>Request Timeout (ms)</Label>
            <Input
              id={`${env}_timeout`}
              type="number"
              placeholder="30000"
              value={envData.timeout}
              onChange={(e) => handleInputChange(env, "timeout", e.target.value)}
              min="1000"
              max="120000"
            />
            <p className="text-xs text-muted-foreground">
              Maximum time to wait for API response (1000-120000 ms)
            </p>
          </div>
        </div>

        {/* Caching Settings Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            Caching & Performance
          </h3>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor={`${env}_enable_caching`}>Enable Response Caching</Label>
              <p className="text-xs text-muted-foreground">
                Cache API responses to reduce costs and improve performance
              </p>
            </div>
            <Switch
              id={`${env}_enable_caching`}
              checked={envData.enable_caching}
              onCheckedChange={(checked) => handleInputChange(env, "enable_caching", checked)}
            />
          </div>

          {envData.enable_caching && (
            <div className="space-y-2">
              <Label htmlFor={`${env}_cache_duration`}>Cache Duration (seconds)</Label>
              <Input
                id={`${env}_cache_duration`}
                type="number"
                placeholder="3600"
                value={envData.cache_duration}
                onChange={(e) => handleInputChange(env, "cache_duration", e.target.value)}
                min="60"
                max="86400"
              />
              <p className="text-xs text-muted-foreground">
                How long to cache pricing data (60-86400 seconds)
              </p>
            </div>
          )}
        </div>

        {/* Feature Flags Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            Enabled Features
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor={`${env}_enable_valuations`}>Vehicle Valuations</Label>
                <p className="text-xs text-muted-foreground">
                  Enable pricing and valuation lookups
                </p>
              </div>
              <Switch
                id={`${env}_enable_valuations`}
                checked={envData.enable_valuations}
                onCheckedChange={(checked) => handleInputChange(env, "enable_valuations", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor={`${env}_enable_specifications`}>Vehicle Specifications</Label>
                <p className="text-xs text-muted-foreground">
                  Enable vehicle specification data access
                </p>
              </div>
              <Switch
                id={`${env}_enable_specifications`}
                checked={envData.enable_specifications}
                onCheckedChange={(checked) => handleInputChange(env, "enable_specifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor={`${env}_enable_images`}>Vehicle Images</Label>
                <p className="text-xs text-muted-foreground">
                  Enable vehicle image retrieval (may incur additional costs)
                </p>
              </div>
              <Switch
                id={`${env}_enable_images`}
                checked={envData.enable_images}
                onCheckedChange={(checked) => handleInputChange(env, "enable_images", checked)}
              />
            </div>
          </div>
        </div>

        {/* Webhook Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            Webhooks (Optional)
          </h3>

          <div className="space-y-2">
            <Label htmlFor={`${env}_webhook_url`}>Webhook URL</Label>
            <Input
              id={`${env}_webhook_url`}
              type="url"
              placeholder="https://yourapp.com/webhooks/redbook"
              value={envData.webhook_url}
              onChange={(e) => handleInputChange(env, "webhook_url", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Receive notifications for pricing updates and changes
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
              <Label htmlFor={`${env}_is_active`}>Activate {env.charAt(0).toUpperCase() + env.slice(1)} Environment</Label>
              <p className="text-xs text-muted-foreground">
                Enable this environment for API calls
              </p>
            </div>
            <Switch
              id={`${env}_is_active`}
              checked={envData.is_active}
              onCheckedChange={(checked) => handleInputChange(env, "is_active", checked)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure RedBook Vehicle Pricing Integration</DialogTitle>
          <DialogDescription>
            Configure your RedBook API credentials and settings for vehicle pricing and valuation services across different environments
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
              <p className="font-medium mb-1">RedBook API Information</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Contact RedBook Commercial to obtain API credentials</li>
                <li>Each environment can have separate API keys</li>
                <li>Pricing data is subject to your subscription plan</li>
                <li>API usage may incur costs based on your agreement</li>
                <li>Ensure your IP is whitelisted with RedBook if required</li>
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

export default RedBookConfigDialog;
