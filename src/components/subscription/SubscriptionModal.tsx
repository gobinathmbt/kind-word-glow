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
import {
  Calendar,
  Users,
  Package,
  Calculator,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { subscriptionServices } from "@/api/services";
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
  userProfile,
}) => {
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

  const handleProceedToCheckout = () => {
    setShowCheckout(true);
    // Close the subscription modal when checkout opens
    if (onClose) {
      onClose();
    }
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    onSuccess?.();
    // Modal is already closed, no need to call onClose again
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
                      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {pricingConfig?.modules?.map((module) => {
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
                                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                        })}
                      </div>
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
                <div className="flex justify-center">
                  <Button
                    onClick={handleProceedToCheckout}
                    disabled={!pricing}
                    size="lg"
                    className="w-full max-w-md"
                  >
                    Proceed to Checkout - ${pricing.total_amount}
                  </Button>
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
          subscriptionData={subscriptionData}
          pricing={pricing}
          mode={mode}
          onSuccess={handleCheckoutSuccess}
          currentSubscription={currentSubscription}
          userProfile={userProfile}
        />
      )}
    </>
  );
};

export default SubscriptionModal;