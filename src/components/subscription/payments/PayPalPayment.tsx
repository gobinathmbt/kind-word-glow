import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { subscriptionServices } from "@/api/services";

declare global {
  interface Window {
    paypal: any;
  }
}

interface PayPalPaymentProps {
  subscriptionData: any;
  pricing: any;
  mode: string;
  onSuccess?: () => void;
  currentSubscription?: any;
  userProfile?: any;
  onClose: () => void;
}

const PayPalPayment: React.FC<PayPalPaymentProps> = ({
  subscriptionData,
  pricing,
  mode,
  onSuccess,
  currentSubscription,
  userProfile,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    email: userProfile?.email || "",
    name: userProfile?.name || "",
  });

  useEffect(() => {
    loadPayPalScript();
  }, []);

  const loadPayPalScript = () => {
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&currency=USD";
    script.onload = () => {
      setPaypalLoaded(true);
      renderPayPalButton();
    };
    script.onerror = () => {
      toast.error("Failed to load PayPal");
    };
    document.body.appendChild(script);
  };

  const createSubscription = async (paymentMethod: string, transactionId: string) => {
    try {
      const response = await subscriptionServices.createSubscription({
        ...subscriptionData,
        total_amount: pricing.total_amount,
        payment_method: paymentMethod,
        is_upgrade: mode === "upgrade",
        is_renewal: mode === "renewal",
        billing_info: billingInfo,
        payment_transaction_id: transactionId,
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  };

  const renderPayPalButton = () => {
    if (!window.paypal || !paypalLoaded) return;

    const paypalButtonContainer = document.getElementById("paypal-button-container");
    if (!paypalButtonContainer) return;

    // Clear existing buttons
    paypalButtonContainer.innerHTML = "";

    window.paypal.Buttons({
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: pricing.total_amount.toString(),
              currency_code: 'USD'
            },
            description: `${mode === "upgrade" ? "Upgrade" : mode === "renewal" ? "Renewal" : "Subscription"} - ${subscriptionData.number_of_users} Users`
          }]
        });
      },
      onApprove: async (data: any, actions: any) => {
        setIsProcessing(true);
        try {
          const order = await actions.order.capture();
          const transactionId = order.id;

          // Create subscription in backend
          const subscription = await createSubscription("paypal", transactionId);

          // Update payment status
          await subscriptionServices.updatePaymentStatus(subscription._id, {
            payment_status: "completed",
            payment_transaction_id: transactionId,
          });

          toast.success("Payment successful! Your subscription is now active.");
          onSuccess?.();
          onClose();
        } catch (error) {
          console.error("PayPal payment error:", error);
          toast.error("Payment completed but failed to update subscription. Please contact support.");
        } finally {
          setIsProcessing(false);
        }
      },
      onError: (err: any) => {
        console.error("PayPal error:", err);
        toast.error("PayPal payment failed. Please try again.");
        setIsProcessing(false);
      },
      onCancel: (data: any) => {
        toast.info("Payment cancelled by user");
        setIsProcessing(false);
      }
    }).render('#paypal-button-container');
  };

  useEffect(() => {
    if (paypalLoaded) {
      renderPayPalButton();
    }
  }, [paypalLoaded, pricing]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Secured by PayPal</span>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Contact Information</CardTitle>
          <CardDescription>
            Enter your contact details for the receipt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={billingInfo.name}
                onChange={(e) => setBillingInfo({ ...billingInfo, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={billingInfo.email}
                onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold">${pricing.total_amount}</span>
        </div>
      </div>

      {/* PayPal Button Container */}
      <div id="paypal-button-container" className="min-h-[50px]">
        {!paypalLoaded && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading PayPal...</span>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Processing your payment...</p>
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secured by PayPal. You'll be redirected to PayPal to complete the payment.
      </p>
    </div>
  );
};

export { PayPalPayment };