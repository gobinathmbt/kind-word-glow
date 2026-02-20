import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { subscriptionServices } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

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
  onClose: () => void;
  onCloseSubscription?: () => void;
  paymentSettings?: any;
}

const PayPalPayment: React.FC<PayPalPaymentProps> = ({
  subscriptionData,
  pricing,
  mode,
  onSuccess,
  currentSubscription,
  onClose,
  paymentSettings,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    email: user?.email || "",
    name: user?.username || "",
  });

  useEffect(() => {
    if (paymentSettings?.paypal_client_id) {
      loadPayPalScript();
    }
  }, [paymentSettings]);

  const loadPayPalScript = () => {
    if (!paymentSettings?.paypal_client_id) {
      toast.error("PayPal Client ID not configured");
      return;
    }
    
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement("script");
    // Use client ID from database
    script.src = `https://www.paypal.com/sdk/js?client-id=${paymentSettings.paypal_client_id}&currency=USD`;
    script.onload = () => {
      setPaypalLoaded(true);
      renderPayPalButton();
    };
    script.onerror = () => {
      toast.error("Failed to load PayPal");
    };
    document.body.appendChild(script);
  };

  const createSubscription = async (paymentMethod: string) => {
    try {
      const response = await subscriptionServices.createSubscription({
        ...subscriptionData,
        total_amount: pricing.total_amount,
        payment_method: paymentMethod,
        is_upgrade: mode === "upgrade",
        is_renewal: mode === "renewal",
        billing_info: billingInfo,
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
      createOrder: async (data: any, actions: any) => {
        try {
          // Create subscription in backend first to track the payment attempt
          const subscription = await createSubscription("paypal");
          
          // Store subscription ID for later use
          (window as any).__paypal_subscription_id = subscription._id;
          
          // Create PayPal order
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: pricing.total_amount.toString(),
                currency_code: 'USD'
              },
              description: `${mode === "upgrade" ? "Upgrade" : mode === "renewal" ? "Renewal" : "Subscription"} - ${subscriptionData.number_of_users} Users`,
              custom_id: subscription._id // Store subscription ID in PayPal order
            }]
          });
        } catch (error) {
          console.error("Error creating PayPal order:", error);
          toast.error("Failed to initialize PayPal payment");
          throw error;
        }
      },
      onApprove: async (data: any, actions: any) => {
        setIsProcessing(true);
        const subscriptionId = (window as any).__paypal_subscription_id;
        
        try {
          const order = await actions.order.capture();
          const transactionId = order.id;
          const payerId = order.payer?.payer_id || data.payerID;
          const payerEmail = order.payer?.email_address || "";

          // Update payment status with PayPal-specific details
          await subscriptionServices.updatePaymentStatus(subscriptionId, {
            payment_status: "completed",
            payment_transaction_id: transactionId,
            paypal_order_id: transactionId,
            paypal_payer_id: payerId,
            paypal_payer_email: payerEmail,
          });

          // Invalidate subscription history query to trigger automatic refresh
          queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
          queryClient.invalidateQueries({ queryKey: ["company-subscription-info"] });

          // Clean up stored subscription ID
          delete (window as any).__paypal_subscription_id;

          toast.success("Payment successful! Your subscription is now active.", { duration: 3000 });
          
          // Call success handler which will navigate to dashboard
          if (onSuccess) {
            onSuccess();
          } else {
            onClose();
          }
        } catch (error) {
          console.error("PayPal payment error:", error);
          
          // Mark payment as failed
          if (subscriptionId) {
            try {
              await subscriptionServices.updatePaymentStatus(subscriptionId, {
                payment_status: "failed",
              });
            } catch (updateError) {
              console.error("Error updating payment status:", updateError);
            }
          }
          
          toast.error("Payment completed but failed to update subscription. Please contact support.");
        } finally {
          setIsProcessing(false);
        }
      },
      onError: async (err: any) => {
        console.error("PayPal error:", err);
        const subscriptionId = (window as any).__paypal_subscription_id;
        
        // Mark payment as failed
        if (subscriptionId) {
          try {
            await subscriptionServices.updatePaymentStatus(subscriptionId, {
              payment_status: "failed",
            });
            delete (window as any).__paypal_subscription_id;
          } catch (error) {
            console.error("Error updating payment status:", error);
          }
        }
        
        toast.error("PayPal payment failed. Please try again.");
        setIsProcessing(false);
      },
      onCancel: async (data: any) => {
        const subscriptionId = (window as any).__paypal_subscription_id;
        
        // Mark payment as failed when cancelled
        if (subscriptionId) {
          try {
            await subscriptionServices.updatePaymentStatus(subscriptionId, {
              payment_status: "failed",
            });
            delete (window as any).__paypal_subscription_id;
          } catch (error) {
            console.error("Error updating payment status:", error);
          }
        }
        
        toast.error("Payment cancelled by user");
        setIsProcessing(false);
      }
    }).render('#paypal-button-container');
  };

  useEffect(() => {
    if (paypalLoaded) {
      renderPayPalButton();
    }
  }, [paypalLoaded, pricing]);

  // Check if PayPal is configured
  if (!paymentSettings?.paypal_client_id) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>PayPal payment gateway is not configured.</p>
        <p className="text-sm mt-2">Please contact the administrator.</p>
      </div>
    );
  }

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