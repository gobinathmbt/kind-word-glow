import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar, Users, CreditCard, Package, Calculator, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { companyServices } from '@/api/services';
import apiClient from '@/api/axios';

const Subscription = () => {
  const [subscriptionData, setSubscriptionData] = useState({
    number_of_days: 30,
    number_of_users: 1,
    selected_modules: [] // 👈 removed default 5
  });
  const [pricing, setPricing] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  // Load pricing config from master plans
  const { data: pricingConfig } = useQuery({
    queryKey: ['pricing-config'],
    queryFn: async () => {
      const response = await apiClient.get('/api/subscription/pricing-config');
      return response.data.data;
    }
  });

  // Load current subscription
  useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const response = await apiClient.get('/api/subscription/current');
      setCurrentSubscription(response.data.data);
      return response.data.data;
    },
    retry: false
  });

  // Calculate pricing when inputs change
  useEffect(() => {
    if (pricingConfig && subscriptionData.number_of_days > 0 && subscriptionData.number_of_users > 0) {
      calculatePricing();
    }
  }, [subscriptionData, pricingConfig]);

  const calculatePricing = async () => {
    setIsCalculating(true);
    try {
      const response = await apiClient.post('/api/subscription/calculate-price', subscriptionData);
      setPricing(response.data.data);
    } catch (error) {
      console.error('Pricing calculation error:', error);
      toast.error('Failed to calculate pricing');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleModuleToggle = (moduleValue, checked, display_value) => {
    setSubscriptionData(prev => ({
      ...prev,
      selected_modules: checked
        ? [...prev.selected_modules, moduleValue, display_value]
        : prev.selected_modules.filter(m => m !== moduleValue)
    }));
  };


  const createSubscription = async (paymentMethod) => {
    try {
      const response = await apiClient.post('/api/subscription/create', {
        ...subscriptionData,
        total_amount: pricing.total_amount,
        payment_method: paymentMethod
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  };

  const handleStripePayment = async () => {
    setIsProcessing(true);
    try {
      const subscription = await createSubscription('stripe');

      setTimeout(async () => {
        try {
          await apiClient.patch(`/api/subscription/${subscription._id}/payment-status`, {
            payment_status: 'completed',
            payment_transaction_id: 'stripe_' + Date.now()
          });
          toast.success('Payment successful! Your subscription is now active.');
          window.location.reload();
        } catch (error) {
          toast.error('Payment verification failed');
        }
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to process payment');
      setIsProcessing(false);
    }
  };

  const handlePayPalPayment = async () => {
    setIsProcessing(true);
    try {
      const subscription = await createSubscription('paypal');

      setTimeout(async () => {
        try {
          await apiClient.patch(`/api/subscription/${subscription._id}/payment-status`, {
            payment_status: 'completed',
            payment_transaction_id: 'paypal_' + Date.now()
          });
          toast.success('Payment successful! Your subscription is now active.');
          window.location.reload();
        } catch (error) {
          toast.error('Payment verification failed');
        }
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to process payment');
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      const subscription = await createSubscription('razorpay');

      setTimeout(async () => {
        try {
          await apiClient.patch(`/api/subscription/${subscription._id}/payment-status`, {
            payment_status: 'completed',
            payment_transaction_id: 'razorpay_' + Date.now()
          });
          toast.success('Payment successful! Your subscription is now active.');
          window.location.reload();
        } catch (error) {
          toast.error('Payment verification failed');
        }
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to process payment');
      setIsProcessing(false);
    }
  };

  if (currentSubscription) {
    return (
      <DashboardLayout title="Subscription">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Subscription Management</h2>
            <p className="text-muted-foreground">Manage your active subscription</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Subscription
                <Badge variant={currentSubscription.subscription_status === 'active' ? 'default' : 'secondary'}>
                  {currentSubscription.subscription_status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Users</Label>
                  <p className="text-2xl font-bold">{currentSubscription.number_of_users}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Days Remaining</Label>
                  <p className="text-2xl font-bold">{currentSubscription.days_remaining || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-2xl font-bold">${currentSubscription.total_amount}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Active Modules</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentSubscription.selected_modules?.map((module, index) => (
                    <Badge key={index} variant="outline">{module.module_name}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Subscription">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Set Up Your Subscription</h2>
          <p className="text-muted-foreground">Configure your subscription plan and payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Configuration</CardTitle>
              <CardDescription>Configure your subscription requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="days">Number of Days</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      max="365"
                      value={subscriptionData.number_of_days}
                      onChange={(e) => setSubscriptionData(prev => ({
                        ...prev,
                        number_of_days: parseInt(e.target.value) || 1
                      }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="users">Number of Users</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="users"
                      type="number"
                      min="1"
                      max="1000"
                      value={subscriptionData.number_of_users}
                      onChange={(e) => setSubscriptionData(prev => ({
                        ...prev,
                        number_of_users: parseInt(e.target.value) || 1
                      }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Select Modules</Label>
                <div className="space-y-3">
                  {/* All modules dynamically */}
                  {pricingConfig?.modules?.map((module) => {
                    const isSelected = subscriptionData.selected_modules.includes(module.module_name);

                    return (
                      <div key={module.module_name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="font-medium">{module.display_value}</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">${module.cost_per_module}/day</Badge>
                          <Switch
                            checked={isSelected}
                            onCheckedChange={(checked) => handleModuleToggle(module.module_name, checked, module.display_value)}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Pricing Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCalculating ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : pricing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Per User Cost:</span>
                      <span>${pricing.per_user_cost}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Users ({subscriptionData.number_of_users}):</span>
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
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total ({subscriptionData.number_of_days} days):</span>
                        <span>${pricing.total_amount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Selected Modules:</h4>
                    <div className="space-y-1">
                      {pricing.module_details?.map((module, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{module.display_value}</span>
                          <span>${module.cost}/day</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Configure your subscription to see pricing
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Section */}
        {pricing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="stripe">Stripe</TabsTrigger>
                  <TabsTrigger value="paypal">PayPal</TabsTrigger>
                  <TabsTrigger value="razorpay">Razorpay</TabsTrigger>
                </TabsList>

                <TabsContent value="stripe" className="space-y-4">
                  <div className="text-center space-y-4">
                    <Button
                      onClick={handleStripePayment}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Pay $${pricing.total_amount} with Stripe`
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="paypal" className="space-y-4">
                  <div className="text-center space-y-4">
                    <Button
                      onClick={handlePayPalPayment}
                      disabled={isProcessing}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Pay $${pricing.total_amount} with PayPal`
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="razorpay" className="space-y-4">
                  <div className="text-center space-y-4">
                    <Button
                      onClick={handleRazorpayPayment}
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Pay $${pricing.total_amount} with Razorpay`
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Subscription;