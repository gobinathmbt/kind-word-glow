import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Package, Users, Calendar, Calculator, AlertTriangle, Loader2 } from "lucide-react";
import { StripePayment } from "./payments/StripePayment";
import { PayPalPayment } from "./payments/PayPalPayment";
import { RazorpayPayment } from "./payments/RazorpayPayment";
import apiClient from "@/api/axios";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseSubscription: () => void;
  subscriptionData: {
    number_of_days: number;
    number_of_users: number;
    selected_modules: string[];
  };
  pricing: {
    per_user_cost: number;
    user_cost: number;
    module_cost: number;
    daily_rate: number;
    total_amount: number;
    effective_days?: number;
    discount_amount?: number;
    module_details: Array<{
      display_value: string;
      module_name: string;
      cost: number;
    }>;
  };
  mode: "new" | "upgrade" | "renewal";
  onSuccess?: () => void;
  currentSubscription?: any;
  userProfile?: any;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onCloseSubscription,
  subscriptionData,
  pricing,
  mode,
  onSuccess,
  currentSubscription,
  userProfile,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"stripe" | "paypal" | "razorpay">("stripe");
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Fetch payment settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPaymentSettings();
    }
  }, [isOpen]);

  const fetchPaymentSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const response = await apiClient.get('/api/payment-settings/public');
      if (response.data.success) {
        setPaymentSettings(response.data.data);
        
        // Auto-select first available payment method
        if (!response.data.data.stripe_publishable_key && !response.data.data.paypal_client_id && response.data.data.razorpay_key_id) {
          setSelectedPaymentMethod('razorpay');
        } else if (!response.data.data.stripe_publishable_key && response.data.data.paypal_client_id) {
          setSelectedPaymentMethod('paypal');
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Check if a payment method is available
  const isPaymentMethodAvailable = (method: string) => {
    if (!paymentSettings) return false;
    
    switch (method) {
      case 'stripe':
        return !!paymentSettings.stripe_publishable_key;
      case 'paypal':
        return !!paymentSettings.paypal_client_id;
      case 'razorpay':
        return !!paymentSettings.razorpay_key_id;
      default:
        return false;
    }
  };

  // Handle payment method selection with validation
  const handlePaymentMethodSelect = (method: "stripe" | "paypal" | "razorpay") => {
    // Log the keys for the selected gateway
    console.log(`=== ${method.toUpperCase()} Payment Gateway Keys (from Database) ===`);
    switch (method) {
      case 'stripe':
        console.log('Stripe Publishable Key:', paymentSettings?.stripe_publishable_key || 'NOT CONFIGURED');
        break;
      case 'paypal':
        console.log('PayPal Client ID:', paymentSettings?.paypal_client_id || 'NOT CONFIGURED');
        break;
      case 'razorpay':
        console.log('Razorpay Key ID:', paymentSettings?.razorpay_key_id || 'NOT CONFIGURED');
        break;
    }
    console.log('===========================================');
    
    setSelectedPaymentMethod(method);
  };

  const renderPaymentComponent = () => {
    // Check if payment method is available
    if (!isPaymentMethodAvailable(selectedPaymentMethod)) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cannot proceed.</strong> Key details are not provided for this payment gateway.
            <br />
            <span className="text-sm">Please contact the administrator to configure {selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1)} payment gateway keys.</span>
          </AlertDescription>
        </Alert>
      );
    }

    const commonProps = {
      subscriptionData,
      pricing,
      mode,
      onSuccess,
      currentSubscription,
      userProfile,
      onClose,
      onCloseSubscription,
      paymentSettings,
    };

    switch (selectedPaymentMethod) {
      case "stripe":
        return <StripePayment {...commonProps} />;
      case "paypal":
        return <PayPalPayment {...commonProps} />;
      case "razorpay":
        return <RazorpayPayment {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">Checkout</DialogTitle>
                <p className="text-muted-foreground mt-1">
                  Complete your {mode === "upgrade" ? "upgrade" : mode === "renewal" ? "renewal" : "subscription"} purchase
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Side - Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Subscription Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="text-lg font-semibold">{pricing.effective_days || subscriptionData.number_of_days}</div>
                      <p className="text-sm text-muted-foreground">Days</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="text-lg font-semibold">{subscriptionData.number_of_users}</div>
                      <p className="text-sm text-muted-foreground">Users</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="text-lg font-semibold">{pricing.module_details.length}</div>
                      <p className="text-sm text-muted-foreground">Modules</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Selected Modules */}
                  <div>
                    <h4 className="font-semibold mb-3">Selected Modules</h4>
                    <div className="space-y-2">
                      {pricing.module_details.map((module, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{module.display_value}</span>
                          </div>
                          <Badge variant="outline">${module.cost}/day</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Pricing Breakdown
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Users ({subscriptionData.number_of_users} × ${pricing.per_user_cost}/day):</span>
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
                      {pricing.discount_amount && pricing.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Credit (Remaining Days):</span>
                          <span>-${pricing.discount_amount}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount:</span>
                        <span>${pricing.total_amount}</span>
                      </div>
                    </div>
                  </div>

                  {mode === "upgrade" && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Upgrade Notice:</strong> You'll only be charged for the remaining days on your current subscription period.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Payment Method */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingSettings ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading payment options...</span>
                    </div>
                  ) : (
                    <>
                      {/* Payment Method Selection */}
                      <div className="grid grid-cols-3 gap-3">
                        {["stripe", "paypal", "razorpay"].map((method) => {
                          const isAvailable = isPaymentMethodAvailable(method);
                          return (
                            <div key={method} className="relative">
                              <Button
                                variant={selectedPaymentMethod === method ? "default" : "outline"}
                                onClick={() => handlePaymentMethodSelect(method as any)}
                                className="capitalize w-full"
                                disabled={!isAvailable}
                              >
                                {method}
                              </Button>
                              {!isAvailable && (
                                <div className="absolute -top-1 -right-1">
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Show warning if no payment methods available */}
                      {!isPaymentMethodAvailable('stripe') && 
                       !isPaymentMethodAvailable('paypal') && 
                       !isPaymentMethodAvailable('razorpay') && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            No payment gateways are configured. Please contact the administrator to set up payment gateway keys.
                          </AlertDescription>
                        </Alert>
                      )}

                      <Separator />

                      {/* Payment Component */}
                      <div className="min-h-[300px]">
                        {renderPaymentComponent()}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;