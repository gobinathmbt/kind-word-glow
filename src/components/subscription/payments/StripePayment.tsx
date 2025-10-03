import React, { useState, useEffect } from "react";
import {
  CardElement,
  useStripe,
  useElements,
  Elements,
  AddressElement
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Shield } from "lucide-react";
import { toast } from "sonner";
import { subscriptionServices } from "@/api/services";

// Initialize Stripe with your publishable key
const stripePromise = loadStripe("pk_test_51Pbd1iRx349WEEQWwzaRaHaqvRNiPzAJBPDyjxQhPKF8dgH2GDW4aSV0Ne9wI8ycKVfl5LT3E4GD1tWAdQLGQgkO00Msfk1ujR");

interface StripePaymentProps {
  subscriptionData: any;
  pricing: any;
  mode: string;
  onSuccess?: () => void;
  currentSubscription?: any;
  userProfile?: any;
  onClose: () => void;
}

// Inner component that uses Stripe hooks (must be wrapped in Elements provider)
const StripePaymentForm: React.FC<StripePaymentProps> = ({
  subscriptionData,
  pricing,
  mode,
  onSuccess,
  currentSubscription,
  userProfile,
  onClose,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [billingDetails, setBillingDetails] = useState({
    name: userProfile?.name || "",
    email: userProfile?.email || "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "US",
    },
  });

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsProcessing(true);
        // Create subscription and get client secret from your backend
        const response = await subscriptionServices.createSubscription({
          ...subscriptionData,
          total_amount: pricing.total_amount,
          payment_method: "stripe",
          is_upgrade: mode === "upgrade",
          is_renewal: mode === "renewal",
        });
        
        setClientSecret(response.data.clientSecret);
      } catch (error: any) {
        console.error("Error creating payment intent:", error);
        toast.error(error.response?.data?.message || "Failed to initialize payment");
      } finally {
        setIsProcessing(false);
      }
    };

    createPaymentIntent();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    // Get the CardElement
    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      setPaymentError("Card element not found");
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm card payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
      });

      if (stripeError) {
        setPaymentError(stripeError.message || "An error occurred with your payment");
        toast.error(stripeError.message || "Payment failed");
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // Update payment status in your backend
        await subscriptionServices.updatePaymentStatus(subscriptionData._id, {
          payment_status: "completed",
          payment_transaction_id: paymentIntent.id,
        });

        toast.success("Payment successful! Your subscription is now active.");
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentError(error.message || "An unexpected error occurred");
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddressChange = (event: any) => {
    if (event.complete) {
      const address = event.value.address;
      setBillingDetails(prev => ({
        ...prev,
        address: {
          line1: address.line1 || "",
          line2: address.line2 || "",
          city: address.city || "",
          state: address.state || "",
          postal_code: address.postal_code || "",
          country: address.country || "US",
        }
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Secured by Stripe</span>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing Information
            </CardTitle>
            <CardDescription>
              Enter your billing details to complete the payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <input
                  id="name"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingDetails.name}
                  onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <input
                  id="email"
                  type="email"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingDetails.email}
                  onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Billing Address</Label>
              <AddressElement 
                options={{
                  mode: 'billing',
                  defaultValues: {
                    name: billingDetails.name,
                    address: {
                      country: 'US'
                    }
                  },
                  fields: {
                    phone: 'never'
                  },
                }}
                onChange={handleAddressChange}
              />
            </div>

            <div>
              <Label htmlFor="card-element">Credit or Debit Card *</Label>
              <div className="border rounded-md p-3 mt-1">
                <CardElement
                  id="card-element"
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
              </div>
              {paymentError && (
                <div className="text-destructive text-sm mt-2">{paymentError}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted p-4 rounded-lg my-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-2xl font-bold">${pricing.total_amount}</span>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </>
          ) : (
            `Pay $${pricing.total_amount}`
          )}
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secured by Stripe. We don't store your card details.
      </p>
    </div>
  );
};

// Outer wrapper component that provides the Elements context
const StripePayment: React.FC<StripePaymentProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm {...props} />
    </Elements>
  );
};

export { StripePayment };