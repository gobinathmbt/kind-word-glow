import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { integrationServices, dealershipServices } from "@/api/services";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { InfoIcon, Plus, Trash2, Key } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DealerConfig {
  id: string;
  dealership_name: string;
  dealership_id?: string;
  api_key: string;
  api_secret: string;
  isModified?: boolean;
}

interface TrademePublishConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: any;
}

const TrademePublishConfigDialog: React.FC<TrademePublishConfigDialogProps> = ({ 
  isOpen, 
  onClose, 
  integration 
}) => {
  const queryClient = useQueryClient();
  const [activeEnvironment, setActiveEnvironment] = useState(
    integration?.active_environment || "production"
  );

  // Fetch dealerships from Multi Dealership table for dropdown
  const { data: dealershipsData } = useQuery({
    queryKey: ["dealerships-for-trademe"],
    queryFn: async () => {
      const response = await dealershipServices.getDealerships({
        page: 1,
        limit: 1000,
      });
      return response.data.data || [];
    },
    enabled: isOpen,
  });

  const dealerships = dealershipsData || [];

  const getEnvironmentConfig = (env: string) => {
    return integration?.environments?.[env] || {};
  };

  const [formData, setFormData] = useState({
    development: {
      consumer_key: getEnvironmentConfig("development")?.configuration?.consumer_key || "",
      consumer_secret: getEnvironmentConfig("development")?.configuration?.consumer_secret || "",
      access_token: getEnvironmentConfig("development")?.configuration?.access_token || "",
      token_secret: getEnvironmentConfig("development")?.configuration?.token_secret || "",
      base_url: getEnvironmentConfig("development")?.configuration?.base_url || "",
      photo_upload_url: getEnvironmentConfig("development")?.configuration?.photo_upload_url || "",
      dealers: getEnvironmentConfig("development")?.configuration?.dealers || [],
      is_active: getEnvironmentConfig("development")?.is_active || false,
    },
    testing: {
      consumer_key: getEnvironmentConfig("testing")?.configuration?.consumer_key || "",
      consumer_secret: getEnvironmentConfig("testing")?.configuration?.consumer_secret || "",
      access_token: getEnvironmentConfig("testing")?.configuration?.access_token || "",
      token_secret: getEnvironmentConfig("testing")?.configuration?.token_secret || "",
      base_url: getEnvironmentConfig("testing")?.configuration?.base_url || "",
      photo_upload_url: getEnvironmentConfig("testing")?.configuration?.photo_upload_url || "",
      dealers: getEnvironmentConfig("testing")?.configuration?.dealers || [],
      is_active: getEnvironmentConfig("testing")?.is_active || false,
    },
    production: {
      consumer_key: getEnvironmentConfig("production")?.configuration?.consumer_key || "",
      consumer_secret: getEnvironmentConfig("production")?.configuration?.consumer_secret || "",
      access_token: getEnvironmentConfig("production")?.configuration?.access_token || "",
      token_secret: getEnvironmentConfig("production")?.configuration?.token_secret || "",
      base_url: getEnvironmentConfig("production")?.configuration?.base_url || "",
      photo_upload_url: getEnvironmentConfig("production")?.configuration?.photo_upload_url || "",
      dealers: getEnvironmentConfig("production")?.configuration?.dealers || [],
      is_active: getEnvironmentConfig("production")?.is_active || false,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (integration) {
        return integrationServices.updateIntegration(integration._id, data);
      }
      return integrationServices.createIntegration(data);
    },
    onSuccess: () => {
      toast.success("Trade Me Publish configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save Trade Me Publish configuration");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const activeEnvData = formData[activeEnvironment];
    
    // Validate OAuth credentials
    if (!activeEnvData.consumer_key.trim()) {
      toast.error(`Consumer Key is required for ${activeEnvironment} environment`);
      return;
    }

    if (!activeEnvData.consumer_secret.trim()) {
      toast.error(`Consumer Secret is required for ${activeEnvironment} environment`);
      return;
    }

    if (!activeEnvData.access_token.trim()) {
      toast.error(`Access Token is required for ${activeEnvironment} environment`);
      return;
    }

    if (!activeEnvData.token_secret.trim()) {
      toast.error(`Token Secret is required for ${activeEnvironment} environment`);
      return;
    }

    if (!activeEnvData.base_url.trim()) {
      toast.error(`Base URL is required for ${activeEnvironment} environment`);
      return;
    }

    try {
      new URL(activeEnvData.base_url);
    } catch {
      toast.error("Please enter a valid Base URL");
      return;
    }

    if (!activeEnvData.photo_upload_url.trim()) {
      toast.error(`Photo Upload URL is required for ${activeEnvironment} environment`);
      return;
    }

    try {
      new URL(activeEnvData.photo_upload_url);
    } catch {
      toast.error("Please enter a valid Photo Upload URL");
      return;
    }

    if (activeEnvData.dealers.length === 0) {
      toast.error(`At least one dealer configuration is required for ${activeEnvironment} environment`);
      return;
    }

    for (const dealer of activeEnvData.dealers) {
      if (!dealer.dealership_name.trim()) {
        toast.error("All dealer entries must have a Dealership Name");
        return;
      }
      if (!dealer.api_key.trim()) {
        toast.error("All dealer entries must have an API Key");
        return;
      }
      if (!dealer.api_secret.trim()) {
        toast.error("All dealer entries must have an API Secret");
        return;
      }
    }

    const environments = {
      development: {
        configuration: {
          consumer_key: formData.development.consumer_key,
          consumer_secret: formData.development.consumer_secret,
          access_token: formData.development.access_token,
          token_secret: formData.development.token_secret,
          base_url: formData.development.base_url,
          photo_upload_url: formData.development.photo_upload_url,
          dealers: formData.development.dealers,
        },
        is_active: formData.development.is_active,
      },
      testing: {
        configuration: {
          consumer_key: formData.testing.consumer_key,
          consumer_secret: formData.testing.consumer_secret,
          access_token: formData.testing.access_token,
          token_secret: formData.testing.token_secret,
          base_url: formData.testing.base_url,
          photo_upload_url: formData.testing.photo_upload_url,
          dealers: formData.testing.dealers,
        },
        is_active: formData.testing.is_active,
      },
      production: {
        configuration: {
          consumer_key: formData.production.consumer_key,
          consumer_secret: formData.production.consumer_secret,
          access_token: formData.production.access_token,
          token_secret: formData.production.token_secret,
          base_url: formData.production.base_url,
          photo_upload_url: formData.production.photo_upload_url,
          dealers: formData.production.dealers,
        },
        is_active: formData.production.is_active,
      },
    };

    saveMutation.mutate({
      integration_type: "trademe_publish_integration",
      display_name: "Trade Me Publish",
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

  const addDealer = (env: string) => {
    const newDealer: DealerConfig = {
      id: Date.now().toString(),
      dealership_name: "",
      api_key: "",
      api_secret: "",
    };
    
    setFormData(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        dealers: [...prev[env].dealers, newDealer],
      },
    }));
  };

  const removeDealer = (env: string, dealerId: string) => {
    setFormData(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        dealers: prev[env].dealers.filter(d => d.id !== dealerId),
      },
    }));
  };

  const updateDealer = (env: string, dealerId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        dealers: prev[env].dealers.map(d =>
          d.id === dealerId ? { ...d, [field]: value, isModified: true } : d
        ),
      },
    }));
  };

  const renderEnvironmentTab = (env: "development" | "testing" | "production") => {
    const envData = formData[env];
    const envLabel = env.charAt(0).toUpperCase() + env.slice(1);

    return (
      <div className="space-y-6">
        {/* OAuth Credentials Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">OAuth 1.0a Credentials</h3>
          </div>
          
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Trade Me uses OAuth 1.0a authentication. You need all 4 credentials from your Trade Me Developer account.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${env}-consumer-key`}>
                Consumer Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`${env}-consumer-key`}
                type="text"
                placeholder="Enter Consumer Key"
                value={envData.consumer_key}
                onChange={(e) => handleInputChange(env, "consumer_key", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${env}-consumer-secret`}>
                Consumer Secret <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`${env}-consumer-secret`}
                type="password"
                placeholder="Enter Consumer Secret"
                value={envData.consumer_secret}
                onChange={(e) => handleInputChange(env, "consumer_secret", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${env}-access-token`}>
                Access Token <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`${env}-access-token`}
                type="text"
                placeholder="Enter Access Token"
                value={envData.access_token}
                onChange={(e) => handleInputChange(env, "access_token", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${env}-token-secret`}>
                Token Secret <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`${env}-token-secret`}
                type="password"
                placeholder="Enter Token Secret"
                value={envData.token_secret}
                onChange={(e) => handleInputChange(env, "token_secret", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">API Configuration</h3>
          
          <div className="space-y-2">
            <Label htmlFor={`${env}-base-url`}>
              Base URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}-base-url`}
              type="url"
              value={envData.base_url}
              onChange={(e) => handleInputChange(env, "base_url", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {env === "development" 
                ? "Development: https://api.trademe.co.nz/v1/dev" 
                : env === "testing"
                ? "Testing: https://api.trademe.co.nz/v1/test"
                : "Production: https://api.trademe.co.nz/v1"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${env}-photo-upload-url`}>
              Photo Upload URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}-photo-upload-url`}
              type="url"
              placeholder="https://api.trademe.co.nz/v1/Photos.json"
              value={envData.photo_upload_url}
              onChange={(e) => handleInputChange(env, "photo_upload_url", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Trade Me Photos API endpoint for uploading images before listing creation
            </p>
          </div>
        </div>

        {/* Dealer Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Dealer Configuration</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addDealer(env)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Dealer
            </Button>
          </div>

          {envData.dealers.length === 0 ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                No dealers configured. Click "Add Dealer" to add your first dealer configuration.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealership Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>API Secret</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envData.dealers.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={dealer.dealership_name}
                          onChange={(e) => {
                            const selectedDealership = dealerships.find((d: any) => d.dealership_name === e.target.value);
                            updateDealer(env, dealer.id, "dealership_name", e.target.value);
                            // Auto-populate dealership_id if dealership has an ID
                            if (selectedDealership && selectedDealership._id) {
                              updateDealer(env, dealer.id, "dealership_id", selectedDealership._id);
                            }
                          }}
                        >
                          <option value="">Select Dealership</option>
                          {dealerships.map((d: any) => (
                            <option key={d._id} value={d.dealership_name}>
                              {d.dealership_name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="Enter API Key"
                          value={dealer.api_key}
                          onChange={(e) => updateDealer(env, dealer.id, "api_key", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="password"
                          placeholder="Enter API Secret"
                          value={dealer.api_secret}
                          onChange={(e) => updateDealer(env, dealer.id, "api_secret", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDealer(env, dealer.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Environment Status */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${env}-active`}
            checked={envData.is_active}
            onChange={(e) => handleInputChange(env, "is_active", e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor={`${env}-active`}>
            Enable {envLabel} Environment
          </Label>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Trade Me Publish Integration</DialogTitle>
          <DialogDescription>
            Configure your Trade Me OAuth credentials and dealer settings for vehicle publishing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeEnvironment} onValueChange={setActiveEnvironment}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="development">Development</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>

            <TabsContent value="development" className="space-y-4 mt-4">
              {renderEnvironmentTab("development")}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4 mt-4">
              {renderEnvironmentTab("testing")}
            </TabsContent>

            <TabsContent value="production" className="space-y-4 mt-4">
              {renderEnvironmentTab("production")}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending 
                ? (integration ? "Updating..." : "Saving...") 
                : (integration ? "Update Configuration" : "Save Configuration")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TrademePublishConfigDialog;
