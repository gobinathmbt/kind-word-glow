import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { subscriptionServices } from "@/api/services";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
};

interface RazorpayPaymentProps {
  subscriptionData: any;
  pricing: any;
  mode: string;
  onSuccess?: () => void;
  currentSubscription?: any;
  userProfile?: any;
  onClose: () => void;
}

const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  subscriptionData,
  pricing,
  mode,
  onSuccess,
  currentSubscription,
  userProfile,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    email: userProfile?.email || "",
    name: userProfile?.name || "",
    phone: userProfile?.phone || "",
  });

  // Auto-close when payment screen opens
  const [paymentScreenOpened, setPaymentScreenOpened] = useState(false);

  useEffect(() => {
    if (paymentScreenOpened) {
      // Close the subscription/checkout screen when payment screen opens
      onClose();
    }
  }, [paymentScreenOpened, onClose]);

  const createSubscription = async (
    paymentMethod: string,
    orderId?: string
  ) => {
    try {
      const response = await subscriptionServices.createSubscription({
        ...subscriptionData,
        total_amount: pricing.total_amount,
        payment_method: paymentMethod,
        is_upgrade: mode === "upgrade",
        is_renewal: mode === "renewal",
        billing_info: billingInfo,
        razorpay_order_id: orderId,
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  };

  const handleRazorpayPayment = async () => {
    if (!billingInfo.email || !billingInfo.name || !billingInfo.phone) {
      toast.error("Please fill in all required fields", {
        position: "top-right",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Load Razorpay script
      const RazorpayInstance = await loadRazorpay();
      if (!RazorpayInstance) {
        toast.error("Failed to load Razorpay");
        return;
      }

      // Create subscription first to get order ID
      const subscription = await createSubscription("razorpay");

      // Convert amount properly - Razorpay expects amount in paise (smallest currency unit)
      // If pricing.total_amount is in INR, multiply by 100 to convert to paise
      const amountInPaise = Math.round(pricing.total_amount * 75);

      const options = {
        key: "rzp_test_z6CO9LKvjNQKsS", // Replace with your Razorpay key
        amount: amountInPaise, // Already converted to paise
        currency: "INR",
        name: "Subscription Service",
        description: `${
          mode === "upgrade"
            ? "Upgrade"
            : mode === "renewal"
            ? "Renewal"
            : "New"
        } Subscription`,
        order_id: subscription.razorpay_order_id,
        handler: async function (response: any) {
          try {
            setIsProcessing(true);

            // Verify payment and update subscription
            await subscriptionServices.updatePaymentStatus(subscription._id, {
              payment_status: "completed",
              payment_transaction_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success(
              "Payment successful! Your subscription is now active."
            );
            onSuccess?.();
            // No need to call onClose here as it's already closed when payment screen opened
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error(
              "Payment completed but verification failed. Please contact support."
            );
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: billingInfo.name,
          email: billingInfo.email,
          contact: billingInfo.phone,
        },
        notes: {
          subscription_id: subscription._id,
          mode: mode,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setPaymentScreenOpened(false);
            toast.info("Payment cancelled by user");
          },
        },
      };

      const razorpay = new (RazorpayInstance as any)(options);

      // Set flag that payment screen is opening
      setPaymentScreenOpened(true);

      // This will trigger the useEffect and close the parent modal
      razorpay.open();
    } catch (error) {
      console.error("Error with Razorpay payment:", error);
      toast.error("Failed to initialize payment. Please try again.");
      setIsProcessing(false);
      setPaymentScreenOpened(false);
    }
  };

  // Format amount for display (in INR)
  const displayAmount = pricing.total_amount.toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Secured by Razorpay</span>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Contact Information</CardTitle>
          <CardDescription>
            Enter your details to complete the payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={billingInfo.name}
                onChange={(e) =>
                  setBillingInfo({ ...billingInfo, name: e.target.value })
                }
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
                onChange={(e) =>
                  setBillingInfo({ ...billingInfo, email: e.target.value })
                }
                placeholder="john@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={billingInfo.phone}
                onChange={(e) =>
                  setBillingInfo({ ...billingInfo, phone: e.target.value })
                }
                placeholder="+91 9876543210"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold">₹{displayAmount}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Payment processed in Indian Rupees (INR)
        </p>
      </div>

      <Button
        onClick={handleRazorpayPayment}
        disabled={isProcessing}
        className="w-full bg-green-600 hover:bg-green-700"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          `Pay ₹${displayAmount} with Razorpay`
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secured by Razorpay. We support UPI, Cards, Net Banking,
        and Wallets.
      </p>
    </div>
  );
};

export { RazorpayPayment };
