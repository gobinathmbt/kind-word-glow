import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Users,
  Package,
  Calculator,
  Loader2,
  X,
  AlertTriangle,
  Settings,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { subscriptionServices, companyServices ,customModuleServices } from "@/api/services";
import CheckoutModal from "./CheckoutModal";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  refetchSubscription?: () => void;
  mode: "new" | "upgrade" | "renewal";
  canClose?: boolean;
  currentSubscription?: any;
  fullScreen?: boolean;
  onSuccess?: () => void;
  userProfile?: any;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  refetchSubscription,
  mode,
  onSuccess,
  canClose = true,
  currentSubscription,
  fullScreen = false,
}) => {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState({
    number_of_days: 30,
    number_of_users: 1,
    selected_modules: [],
  });
  const [pricing, setPricing] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [pricingConfig, setPricingConfig] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [moduleCategories, setModuleCategories] = useState({
    superadmin: [],
    integration: [],
    custom: [],
  });
  const [companyCustomModules, setCompanyCustomModules] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("superadmin");

  // Clean up any timers when component unmounts
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Load pricing config using subscriptionServices from code 1
  const { isLoading: isLoadingPricing } = useQuery({
    queryKey: ["pricing-config"],
    queryFn: async () => {
      const response = await subscriptionServices.getPricingConfig();
      setPricingConfig(response.data.data);
      return response.data.data;
    },
    enabled: isOpen,
  });

  // Load dropdown configurations for module categorization
  const { data: dropdownData, isLoading: isLoadingDropdowns } = useQuery({
    queryKey: ["module-dropdowns"],
    queryFn: async () => {
      const response = await companyServices.getMasterdropdownvalues({
        dropdown_name: ["company_superadmin_modules", "company_integration_modules", "custom_user_modules"],
      });
      return response.data;
    },
    enabled: isOpen,
  });


    const { data: companyCustomModuleConfig } = useQuery({
      queryKey: ["company-custom-modules", user?.company_id?._id],
      queryFn: async () => {
        if (!user?.company_id?._id) return null;
        const response = await customModuleServices.getCustomModuleConfigByCompanyFromCompanyRoute(
          user.company_id._id
        );
        return response.data.data;
      },
      enabled: isOpen && !!user?.company_id?._id,
    });

  // Categorize modules based on dropdown configurations and company custom modules
  useEffect(() => {
    if (pricingConfig?.modules && dropdownData?.data) {
      console.log("Categorizing modules...");
      console.log("Pricing config modules:", pricingConfig.modules);
      console.log("Dropdown data:", dropdownData.data);
      console.log("Company custom module config:", companyCustomModuleConfig);

      const superadminDropdown = dropdownData.data.find(
        (item: any) => item.dropdown_name === "company_superadmin_modules"
      );
      const integrationDropdown = dropdownData.data.find(
        (item: any) => item.dropdown_name === "company_integration_modules"
      );
      const customDropdown = dropdownData.data.find(
        (item: any) => item.dropdown_name === "custom_user_modules"
      );

      const superadminModuleNames = superadminDropdown?.values?.map(
        (v: any) => v.option_value
      ) || [];
      const integrationModuleNames = integrationDropdown?.values?.map(
        (v: any) => v.option_value
      ) || [];
      const customModuleNames = customDropdown?.values?.map(
        (v: any) => v.option_value
      ) || [];

      console.log("Custom module names from dropdown:", customModuleNames);

      // Get company's assigned custom modules with their display names
      const assignedCustomModules = companyCustomModuleConfig?.custom_modules || [];
      const assignedCustomModuleNames = assignedCustomModules.map((m: any) => m.module_name);
      setCompanyCustomModules(assignedCustomModuleNames);

      console.log("Assigned custom modules:", assignedCustomModules);
      console.log("Assigned custom module names:", assignedCustomModuleNames);

      // Map custom modules from pricing config and merge with custom module display names
      const customModulesFromPricing = pricingConfig.modules.filter((module: any) =>
        customModuleNames.includes(module.module_name) &&
        assignedCustomModuleNames.includes(module.module_name)
      );

      console.log("Custom modules from pricing (filtered):", customModulesFromPricing);

      // Enhance custom modules with display names from companyCustomModuleConfig if available
      const enhancedCustomModules = customModulesFromPricing.map((module: any) => {
        const customModuleConfig = assignedCustomModules.find(
          (cm: any) => cm.module_name === module.module_name
        );
        
        const enhanced = {
          ...module,
          // Use custom display name if available, otherwise use pricing config display
          display_value: customModuleConfig?.module_display || module.display_value,
          is_active: customModuleConfig?.is_active !== false, // Default to true if not specified
        };

        console.log(`Enhanced module ${module.module_name}:`, enhanced);
        return enhanced;
      });

      console.log("All enhanced custom modules:", enhancedCustomModules);

      // If custom modules are available, show only custom modules
      // Otherwise, show superadmin and integration modules
      const hasCustomModules = enhancedCustomModules.length > 0;

      console.log("Has custom modules:", hasCustomModules);

      const categorizedModules = {
        superadmin: hasCustomModules ? [] : pricingConfig.modules.filter((module: any) =>
          superadminModuleNames.includes(module.module_name)
        ),
        integration: hasCustomModules ? [] : pricingConfig.modules.filter((module: any) =>
          integrationModuleNames.includes(module.module_name)
        ),
        custom: enhancedCustomModules,
      };

      console.log("Final categorized modules:", categorizedModules);

      setModuleCategories(categorizedModules);

      // Auto-switch to custom tab if custom modules are available
      if (hasCustomModules) {
        setActiveTab("custom");
      }
    }
  }, [pricingConfig, dropdownData, companyCustomModuleConfig]);

  // Pre-populate data for renewal/upgrade
  useEffect(() => {
    if (currentSubscription && (mode === "renewal" || mode === "upgrade")) {
      setSubscriptionData({
        number_of_days:
          mode === "renewal"
            ? currentSubscription.number_of_days || 30
            : currentSubscription.number_of_days,
        number_of_users: currentSubscription.number_of_users || 1,
        selected_modules: currentSubscription.module_access || [],
      });
    }
  }, [currentSubscription, mode]);

  useEffect(() => {
  if (pricingConfig?.modules) {
    const freeModules = pricingConfig.modules
      .filter((module) => module.cost_per_module === 0)
      .map((module) => module.module_name);
    
    if (freeModules.length > 0) {
      setSubscriptionData((prev) => {
        // Only add free modules that aren't already selected
        const newModules = freeModules.filter(
          (mod) => !prev.selected_modules.includes(mod)
        );
        if (newModules.length > 0) {
          return {
            ...prev,
            selected_modules: [...prev.selected_modules, ...newModules],
          };
        }
        return prev;
      });
    }
  }
}, [pricingConfig]);

  // Calculate pricing using subscriptionServices from code 1
  const calculatePricing = async () => {
    setIsCalculating(true);
    try {
      const response = await subscriptionServices.calculatePrice({
        ...subscriptionData,
        is_upgrade: mode === "upgrade",
        is_renewal: mode === "renewal",
      });
      setPricing(response.data.data);
    } catch (error) {
      console.error("Pricing calculation error:", error);
      toast.error("Failed to calculate pricing");
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate pricing when inputs change
  useEffect(() => {
    if (
      pricingConfig &&
      subscriptionData.number_of_days > 0 &&
      subscriptionData.number_of_users > 0
    ) {
      calculatePricing();
    }
  }, [subscriptionData, pricingConfig, mode]);

  const handleModuleToggle = (moduleValue: any, checked: boolean) => {
    if (
      mode === "upgrade" &&
      currentSubscription?.module_access?.includes(moduleValue) &&
      !checked
    ) {
      return;
    }

    setSubscriptionData((prev) => ({
      ...prev,
      selected_modules: checked
        ? [...prev.selected_modules, moduleValue]
        : prev.selected_modules.filter((m) => m !== moduleValue),
    }));
  };

  const getModalTitle = () => {
    switch (mode) {
      case "upgrade":
        return "Upgrade Subscription";
      case "renewal":
        return "Renew Subscription";
      default:
        return "Set Up Your Subscription";
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case "upgrade":
        return "Add more users or modules to your current subscription";
      case "renewal":
        return "Renew your subscription to continue accessing all features";
      default:
        return "Configure your subscription plan and payment";
    }
  };

  // Check if user has made changes (for upgrade mode)
  const hasChanges = () => {
    if (mode === "new" || mode === "renewal") {
      // For new subscriptions or renewals, always allow if modules selected and amount > 0
      return subscriptionData.selected_modules.length > 0 && pricing?.total_amount > 0;
    }
    
    if (mode === "upgrade" && currentSubscription) {
      // Check if user count increased
      const userCountIncreased = subscriptionData.number_of_users > currentSubscription.number_of_users;
      
      // Check if new modules selected (modules not in current subscription)
      const currentModules = currentSubscription.module_access || [];
      const hasNewModules = subscriptionData.selected_modules.some(
        (module) => !currentModules.includes(module)
      );
      
      // Must have changes AND amount > 0
      return (userCountIncreased || hasNewModules) && pricing?.total_amount > 0;
    }
    
    return false;
  };

  const handleProceedToCheckout = () => {
    setShowCheckout(true);
    // Don't close the subscription modal - just hide it so state is preserved
    // The modal will be hidden by the condition: open={isOpen && !showCheckout}
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
    // Subscription modal will automatically show again since showCheckout is false
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    // Call onSuccess which will handle navigation and modal closing
    if (onSuccess) {
      onSuccess();
    } else if (refetchSubscription) {
      refetchSubscription();
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showCheckout} onOpenChange={canClose ? onClose : undefined}>
        <DialogContent
          className={
            fullScreen
              ? "max-w-none w-screen h-screen max-h-screen rounded-none p-0 flex flex-col"
              : "max-w-6xl max-h-[95vh] p-0 flex flex-col"
          }
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b">
            {!canClose && (
              <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                Complete subscription to continue
              </div>
            )}
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl sm:text-2xl">
                    {getModalTitle()}
                  </DialogTitle>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    {getModalDescription()}
                  </p>
                </div>
                {canClose && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </DialogHeader>

            {/* Alert for grace period */}
            {mode === "renewal" &&
              currentSubscription?.subscription_status === "grace_period" && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription has expired. You have{" "}
                    {currentSubscription.days_remaining || 0} days remaining in
                    the grace period.
                  </AlertDescription>
                </Alert>
              )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
              {/* Configuration and Pricing Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Configuration Panel */}
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="text-lg sm:text-xl">
                      Subscription Configuration
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Configure your subscription requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-6 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-shrink-0">
                      <div className="space-y-2">
                        <Label htmlFor="days" className="text-sm font-medium">
                          Number of Days
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="days"
                            type="number"
                            min="1"
                            max="365"
                            value={subscriptionData.number_of_days}
                            onChange={(e) =>
                              setSubscriptionData((prev) => ({
                                ...prev,
                                number_of_days: parseInt(e.target.value) || 1,
                              }))
                            }
                            className="pl-10"
                            disabled={mode === "upgrade"}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="users" className="text-sm font-medium">
                          Number of Users
                        </Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="users"
                            type="number"
                            min={
                              mode === "upgrade"
                                ? currentSubscription?.number_of_users || 1
                                : 1
                            }
                            max="1000"
                            value={subscriptionData.number_of_users}
                            onChange={(e) =>
                              setSubscriptionData((prev) => ({
                                ...prev,
                                number_of_users: parseInt(e.target.value) || 1,
                              }))
                            }
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                      <Label className="text-sm font-medium flex-shrink-0">
                        Select Modules
                      </Label>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className={`grid w-full ${moduleCategories.custom.length > 0 ? 'grid-cols-1' : 'grid-cols-3'} flex-shrink-0`}>
                          {moduleCategories.custom.length === 0 && (
                            <>
                              <TabsTrigger value="superadmin" className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Super Admin ({moduleCategories.superadmin.length})
                              </TabsTrigger>
                              <TabsTrigger value="integration" className="flex items-center gap-2">
                                <Cpu className="h-4 w-4" />
                                Integration ({moduleCategories.integration.length})
                              </TabsTrigger>
                            </>
                          )}
                          <TabsTrigger value="custom" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {moduleCategories.custom.length > 0 ? 'Available Modules' : 'Custom'} ({moduleCategories.custom.length})
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="superadmin" className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4">
                          {moduleCategories.superadmin.length > 0 ? (
                            moduleCategories.superadmin.map((module) => {
                              const isSelected =
                                subscriptionData.selected_modules.includes(
                                  module.module_name
                                );
                              const isCurrentlyActive =
                                currentSubscription?.module_access?.includes(
                                  module.module_name
                                );
                              const isFreeModule = module.cost_per_module === 0;
                              const isDisabled =
                                (mode === "upgrade" && isCurrentlyActive) || isFreeModule;

                              return (
                                <div
                                  key={module.module_name}
                                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                    isDisabled
                                      ? "bg-muted/50 opacity-60"
                                      : "hover:bg-muted/20"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <Label className="font-medium text-sm truncate block">
                                        {module.display_value}
                                      </Label>
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {isCurrentlyActive && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            Current
                                          </Badge>
                                        )}
                                        {isFreeModule && (
                                          <Badge
                                            variant="default"
                                            className="text-xs bg-green-500 hover:bg-green-600"
                                          >
                                            FREE
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <Badge variant="outline" className="text-xs">
                                      ${module.cost_per_module}/day
                                    </Badge>
                                    <Switch
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleModuleToggle(
                                          module.module_name,
                                          checked
                                        )
                                      }
                                      disabled={isDisabled}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No Super Admin modules available</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="integration" className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4">
                          {moduleCategories.integration.length > 0 ? (
                            moduleCategories.integration.map((module) => {
                              const isSelected =
                                subscriptionData.selected_modules.includes(
                                  module.module_name
                                );
                              const isCurrentlyActive =
                                currentSubscription?.module_access?.includes(
                                  module.module_name
                                );
                              const isFreeModule = module.cost_per_module === 0;
                              const isDisabled =
                                (mode === "upgrade" && isCurrentlyActive) || isFreeModule;

                              return (
                                <div
                                  key={module.module_name}
                                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                    isDisabled
                                      ? "bg-muted/50 opacity-60"
                                      : "hover:bg-muted/20"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Cpu className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <Label className="font-medium text-sm truncate block">
                                        {module.display_value}
                                      </Label>
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {isCurrentlyActive && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            Current
                                          </Badge>
                                        )}
                                        {isFreeModule && (
                                          <Badge
                                            variant="default"
                                            className="text-xs bg-green-500 hover:bg-green-600"
                                          >
                                            FREE
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <Badge variant="outline" className="text-xs">
                                      ${module.cost_per_module}/day
                                    </Badge>
                                    <Switch
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleModuleToggle(
                                          module.module_name,
                                          checked
                                        )
                                      }
                                      disabled={isDisabled}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No Integration modules available</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="custom" className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4">
                          {moduleCategories.custom.length > 0 ? (
                            moduleCategories.custom.map((module) => {
                              const isSelected =
                                subscriptionData.selected_modules.includes(
                                  module.module_name
                                );
                              const isCurrentlyActive =
                                currentSubscription?.module_access?.includes(
                                  module.module_name
                                );
                              const isFreeModule = module.cost_per_module === 0;
                              // For custom modules, don't auto-disable free modules
                              const hasCustomModules = companyCustomModules.length > 0;
                              const isDisabled = hasCustomModules 
                                ? false 
                                : ((mode === "upgrade" && isCurrentlyActive) || isFreeModule);

                              return (
                                <div
                                  key={module.module_name}
                                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                    isDisabled
                                      ? "bg-muted/50 opacity-60"
                                      : "hover:bg-muted/20"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <Label className="font-medium text-sm truncate block">
                                        {module.display_value}
                                      </Label>
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {isCurrentlyActive && !hasCustomModules && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            Current
                                          </Badge>
                                        )}
                                        {isFreeModule && !hasCustomModules && (
                                          <Badge
                                            variant="default"
                                            className="text-xs bg-green-500 hover:bg-green-600"
                                          >
                                            FREE
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <Badge variant="outline" className="text-xs">
                                      ${module.cost_per_module}/day
                                    </Badge>
                                    <Switch
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleModuleToggle(
                                          module.module_name,
                                          checked
                                        )
                                      }
                                      disabled={isDisabled}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No Custom modules available</p>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Panel */}
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Calculator className="h-5 w-5" />
                      Pricing Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col overflow-hidden">
                    {isCalculating ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : pricing ? (
                      <div className="flex-1 overflow-y-auto pr-2">
                        <div className="space-y-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Per User Cost:</span>
                              <span>${pricing.per_user_cost}/day</span>
                            </div>
                            <div className="flex justify-between">
                              <span>
                                Users ({subscriptionData.number_of_users}):
                              </span>
                              <span>${pricing.user_cost}/day</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Modules:</span>
                              <span>${pricing.module_cost}/day</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Daily Rate:</span>
                              <span>${pricing.daily_rate}</span>
                            </div>
                            {pricing.discount_amount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Credit (Remaining Days):</span>
                                <span>-${pricing.discount_amount}</span>
                              </div>
                            )}
                            <div className="border-t pt-2">
                              <div className="flex justify-between text-lg font-bold">
                                <span>
                                  Total (
                                  {pricing.effective_days ||
                                    subscriptionData.number_of_days}{" "}
                                  days):
                                </span>
                                <span>${pricing.total_amount}</span>
                              </div>
                            </div>
                          </div>

                          {pricing.module_details &&
                            pricing.module_details.length > 0 && (
                              <div className="bg-muted p-4 rounded-lg">
                                <h4 className="font-semibold mb-2 text-sm">
                                  Selected Modules:
                                </h4>
                                <div className="space-y-1">
                                  {pricing.module_details.map((module, index) => (
                                    <div
                                      key={index}
                                      className="flex justify-between text-sm"
                                    >
                                      <span className="truncate mr-2">
                                        {module.display_value}
                                      </span>
                                      <span className="flex-shrink-0">
                                        ${module.cost}/day
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8 text-sm">
                        Configure your subscription to see pricing
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {pricing && (
                <div className="space-y-3">
                  {mode === "upgrade" && !hasChanges() && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {pricing.total_amount <= 0 
                          ? "No changes detected. Please increase users or select new modules to upgrade."
                          : subscriptionData.number_of_users <= (currentSubscription?.number_of_users || 0) && subscriptionData.selected_modules.every((m) => (currentSubscription?.module_access || []).includes(m))
                          ? "Please increase the number of users or select new modules to proceed with the upgrade."
                          : "Please make changes to proceed with the upgrade."}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-center">
                    <Button
                      onClick={handleProceedToCheckout}
                      disabled={!pricing || !hasChanges()}
                      size="lg"
                      className="w-full max-w-md"
                    >
                      Proceed to Checkout - ${pricing.total_amount}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal - Rendered independently */}
      {showCheckout && pricing && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={handleCheckoutClose}
          onCloseSubscription={onClose}  
          subscriptionData={subscriptionData}
          pricing={pricing}
          mode={mode}
          onSuccess={handleCheckoutSuccess}
          currentSubscription={currentSubscription}
        />
      )}
    </>
  );
};

export default SubscriptionModal;