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
  const [formData, setFormData] = useState({
    api_key: integration?.configuration?.api_key || "",
    api_secret: integration?.configuration?.api_secret || "",
    base_url: integration?.configuration?.base_url || "https://api.redbookdirect.com",
    client_id: integration?.configuration?.client_id || "",
    environment: integration?.configuration?.environment || "production",
    timeout: integration?.configuration?.timeout || "30000",
    enable_caching: integration?.configuration?.enable_caching ?? true,
    cache_duration: integration?.configuration?.cache_duration || "3600",
    webhook_url: integration?.configuration?.webhook_url || "",
    enable_valuations: integration?.configuration?.enable_valuations ?? true,
    enable_specifications: integration?.configuration?.enable_specifications ?? true,
    enable_images: integration?.configuration?.enable_images ?? false,
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
    if (!formData.api_key.trim()) {
      toast.error("API Key is required");
      return;
    }

    if (!formData.base_url.trim()) {
      toast.error("Base URL is required");
      return;
    }

    // Validate URL format
    try {
      new URL(formData.base_url);
    } catch {
      toast.error("Please enter a valid Base URL");
      return;
    }

    saveMutation.mutate({
      integration_type: "redbook_vehicle_pricing_integration",
      display_name: "RedBook Vehicle Pricing",
      configuration: {
        ...formData,
        timeout: parseInt(formData.timeout) || 30000,
        cache_duration: parseInt(formData.cache_duration) || 3600,
      },
      is_active: true,
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure RedBook Vehicle Pricing Integration</DialogTitle>
          <DialogDescription>
            Configure your RedBook API credentials and settings for vehicle pricing and valuation services
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Authentication Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Authentication
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="api_key">
                API Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Enter your RedBook API key"
                value={formData.api_key}
                onChange={(e) => handleInputChange("api_key", e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Your RedBook API authentication key
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_secret">API Secret (Optional)</Label>
              <Input
                id="api_secret"
                type="password"
                placeholder="Enter your RedBook API secret"
                value={formData.api_secret}
                onChange={(e) => handleInputChange("api_secret", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Additional secret key if required by your RedBook plan
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID (Optional)</Label>
              <Input
                id="client_id"
                type="text"
                placeholder="Enter your client ID"
                value={formData.client_id}
                onChange={(e) => handleInputChange("client_id", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Your RedBook client identifier if applicable
              </p>
            </div>
          </div>

          {/* Connection Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Connection Settings
            </h3>

            <div className="space-y-2">
              <Label htmlFor="base_url">
                Base URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="base_url"
                type="url"
                placeholder="https://api.redbookdirect.com"
                value={formData.base_url}
                onChange={(e) => handleInputChange("base_url", e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                RedBook API base endpoint URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={formData.environment}
                onValueChange={(value) => handleInputChange("environment", value)}
              >
                <SelectTrigger id="environment">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                API environment to use
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Request Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                placeholder="30000"
                value={formData.timeout}
                onChange={(e) => handleInputChange("timeout", e.target.value)}
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
                <Label htmlFor="enable_caching">Enable Response Caching</Label>
                <p className="text-xs text-gray-500">
                  Cache API responses to reduce costs and improve performance
                </p>
              </div>
              <Switch
                id="enable_caching"
                checked={formData.enable_caching}
                onCheckedChange={(checked) => handleInputChange("enable_caching", checked)}
              />
            </div>

            {formData.enable_caching && (
              <div className="space-y-2">
                <Label htmlFor="cache_duration">Cache Duration (seconds)</Label>
                <Input
                  id="cache_duration"
                  type="number"
                  placeholder="3600"
                  value={formData.cache_duration}
                  onChange={(e) => handleInputChange("cache_duration", e.target.value)}
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
                  <Label htmlFor="enable_valuations">Vehicle Valuations</Label>
                  <p className="text-xs text-gray-500">
                    Enable pricing and valuation lookups
                  </p>
                </div>
                <Switch
                  id="enable_valuations"
                  checked={formData.enable_valuations}
                  onCheckedChange={(checked) => handleInputChange("enable_valuations", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="enable_specifications">Vehicle Specifications</Label>
                  <p className="text-xs text-gray-500">
                    Enable vehicle specification data access
                  </p>
                </div>
                <Switch
                  id="enable_specifications"
                  checked={formData.enable_specifications}
                  onCheckedChange={(checked) => handleInputChange("enable_specifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="enable_images">Vehicle Images</Label>
                  <p className="text-xs text-gray-500">
                    Enable vehicle image retrieval (may incur additional costs)
                  </p>
                </div>
                <Switch
                  id="enable_images"
                  checked={formData.enable_images}
                  onCheckedChange={(checked) => handleInputChange("enable_images", checked)}
                />
              </div>
            </div>
          </div>

          {/* Webhook Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Webhooks (Optional)
            </h3>

            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                type="url"
                placeholder="https://yourapp.com/webhooks/redbook"
                value={formData.webhook_url}
                onChange={(e) => handleInputChange("webhook_url", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Receive notifications for pricing updates and changes
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">RedBook API Information</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Contact RedBook Commercial to obtain API credentials</li>
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