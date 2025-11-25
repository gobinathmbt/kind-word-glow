import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { integrationServices, dealershipServices } from "@/api/services";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { InfoIcon, Plus, Trash2, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DealerConfig {
  id: string;
  dealership_name: string;
  yard_id: string;
  isModified?: boolean;
}

interface OnlycarsPublishConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: any;
}

const OnlycarsPublishConfigDialog: React.FC<OnlycarsPublishConfigDialogProps> = ({ 
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
    queryKey: ["dealerships-for-onlycars"],
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
      api_key: getEnvironmentConfig("development")?.configuration?.api_key || "",
      base_url: getEnvironmentConfig("development")?.configuration?.base_url || "",
      dealers: getEnvironmentConfig("development")?.configuration?.dealers || [],
      is_active: getEnvironmentConfig("development")?.is_active || false,
    },
    testing: {
      api_key: getEnvironmentConfig("testing")?.configuration?.api_key || "",
      base_url: getEnvironmentConfig("testing")?.configuration?.base_url || "",
      dealers: getEnvironmentConfig("testing")?.configuration?.dealers || [],
      is_active: getEnvironmentConfig("testing")?.is_active || false,
    },
    production: {
      api_key: getEnvironmentConfig("production")?.configuration?.api_key || "",
      base_url: getEnvironmentConfig("production")?.configuration?.base_url || "",
      dealers: getEnvironmentConfig("production")?.configuration?.dealers || [],
      is_active: getEnvironmentConfig("production")?.is_active || false,
    },
  });

  // Removed: No longer auto-creating dealerships in Multi Dealership table
  // OnlyCars dealership configurations are now independent

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Save the integration configuration only (no dealership creation)
      if (integration) {
        return integrationServices.updateIntegration(integration._id, data);
      }
      return integrationServices.createIntegration(data);
    },
    onSuccess: () => {
      toast.success("OnlyCars Publish configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      // Removed: No longer invalidating dealerships query since we're not creating them
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save OnlyCars Publish configuration");
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

    if (activeEnvData.dealers.length === 0) {
      toast.error(`At least one dealer configuration is required for ${activeEnvironment} environment`);
      return;
    }

    // Validate dealer configurations
    for (const dealer of activeEnvData.dealers) {
      if (!dealer.dealership_name.trim() || !dealer.yard_id.trim()) {
        toast.error("All dealer entries must have both Dealership Name and Yard ID");
        return;
      }
    }

    const environments = {
      development: {
        configuration: {
          api_key: formData.development.api_key,
          base_url: formData.development.base_url,
          dealers: formData.development.dealers,
        },
        is_active: formData.development.is_active,
      },
      testing: {
        configuration: {
          api_key: formData.testing.api_key,
          base_url: formData.testing.base_url,
          dealers: formData.testing.dealers,
        },
        is_active: formData.testing.is_active,
      },
      production: {
        configuration: {
          api_key: formData.production.api_key,
          base_url: formData.production.base_url,
          dealers: formData.production.dealers,
        },
        is_active: formData.production.is_active,
      },
    };

    saveMutation.mutate({
      integration_type: "onlycars_publish_integration",
      display_name: "Onlycars Publish",
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
      yard_id: "",
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
        dealers: prev[env].dealers.filter((d: DealerConfig) => d.id !== dealerId),
      },
    }));
  };

  const updateDealer = (env: string, dealerId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        dealers: prev[env].dealers.map((d: DealerConfig) =>
          d.id === dealerId ? { ...d, [field]: value } : d
        ),
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
              placeholder="Enter your Onlycars Publish API key"
              value={envData.api_key}
              onChange={(e) => handleInputChange(env, "api_key", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your Onlycars Publish API authentication key (static token)
            </p>
          </div>
        </div>

        {/* API Endpoints Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">
            API Endpoints
          </h3>

          <div className="space-y-2">
            <Label htmlFor={`${env}_base_url`}>
              Base URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${env}_base_url`}
              type="url"
              placeholder="https://api.onlycars.com.au"
              value={envData.base_url || ""}
              onChange={(e) => handleInputChange(env, "base_url", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Base URL for Onlycars Publish API
            </p>
          </div>
        </div>

        {/* Dealership Credentials */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Dealership Credentials
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select dealerships from Multi Dealership and map them to OnlyCars Yard IDs for publishing.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addDealer(env)}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Dealer
            </Button>
          </div>

          {envData.dealers.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-3">
                No dealers configured yet
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addDealer(env)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Dealer
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className={envData.dealers.length > 3 ? "max-h-[240px] overflow-y-auto" : ""}>
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[45%] py-2 text-xs font-semibold">Dealership Name</TableHead>
                      <TableHead className="w-[40%] py-2 text-xs font-semibold">Yard ID</TableHead>
                      <TableHead className="w-[15%] text-center py-2 text-xs font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...envData.dealers].reverse().map((dealer: DealerConfig) => (
                      <TableRow key={dealer.id} className="hover:bg-muted/50">
                        <TableCell className="py-2 px-3">
                          <Select
                            value={dealer.dealership_name}
                            onValueChange={(value) => updateDealer(env, dealer.id, "dealership_name", value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {dealerships.length === 0 ? (
                                <SelectItem value="no-dealerships" disabled>
                                  No dealerships available
                                </SelectItem>
                              ) : (
                                dealerships.map((dealership: any) => (
                                  <SelectItem key={dealership._id} value={dealership.dealership_name}>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs">{dealership.dealership_name}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <Input
                            placeholder="Yard ID"
                            value={dealer.yard_id}
                            onChange={(e) => updateDealer(env, dealer.id, "yard_id", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="py-2 px-2">
                          <div className="flex items-center justify-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDealer(env, dealer.id)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete dealer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Onlycars Publish Integration</DialogTitle>
          <DialogDescription>
            Configure your Onlycars Publish API credentials and endpoints for vehicle pricing and valuation services
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
              <p className="font-medium mb-1">OnlyCars Publish API Information</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Sign up at OnlyCars Publish to obtain API credentials</li>
                <li>Each environment can have separate API keys and dealer configurations</li>
                <li>Select dealerships from Multi Dealership dropdown</li>
                <li>Map each dealership to its corresponding OnlyCars Yard ID</li>
                <li>Dealerships must be created in Multi Dealership page first</li>
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

export default OnlycarsPublishConfigDialog;
