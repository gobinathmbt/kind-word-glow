import React, { useState } from "react";
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
import { X, Package, Users, Calendar, Calculator } from "lucide-react";
import { StripePayment } from "./payments/StripePayment";
import { PayPalPayment } from "./payments/PayPalPayment";
import { RazorpayPayment } from "./payments/RazorpayPayment";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  subscriptionData,
  pricing,
  mode,
  onSuccess,
  currentSubscription,
  userProfile,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"stripe" | "paypal" | "razorpay">("stripe");

  const renderPaymentComponent = () => {
    const commonProps = {
      subscriptionData,
      pricing,
      mode,
      onSuccess,
      currentSubscription,
      userProfile,
      onClose,
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
                  {/* Payment Method Selection */}
                  <div className="grid grid-cols-3 gap-3">
                    {["stripe", "paypal", "razorpay"].map((method) => (
                      <Button
                        key={method}
                        variant={selectedPaymentMethod === method ? "default" : "outline"}
                        onClick={() => setSelectedPaymentMethod(method as any)}
                        className="capitalize"
                      >
                        {method}
                      </Button>
                    ))}
                  </div>

                  <Separator />

                  {/* Payment Component */}
                  <div className="min-h-[300px]">
                    {renderPaymentComponent()}
                  </div>
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