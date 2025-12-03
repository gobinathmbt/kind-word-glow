import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Loader2, ChevronLeft, ChevronRight, Download, CheckCircle2, Mail } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { subscriptionServices } from "@/api/services";
import InvoiceViewModal from "@/components/subscription/InvoiceViewModal";
import { generateInvoicePDF } from "@/utils/invoicePdfGenerator";
import { generateGatewayInvoicePDF } from "@/utils/gatewayInvoicePdfGenerator";
import { toast } from "sonner";

const SubscriptionHistoryTable: React.FC = () => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const limit = 10;
  const queryClient = useQueryClient();

  // Load subscription history with pagination
  const {
    data: subscriptionResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription-history", currentPage],
    queryFn: async () => {
      try {
        const response = await subscriptionServices.getSubscriptionHistory(currentPage, limit);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch subscription history:", error);
        throw error;
      }
    },
    staleTime: 0, // Always refetch when component mounts or dialog opens
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid unnecessary calls
  });

  // Prefetch next and previous pages for smoother navigation
  useEffect(() => {
    const pagination = subscriptionResponse?.pagination;
    if (!pagination) return;

    // Prefetch next page
    if (pagination.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ["subscription-history", currentPage + 1],
        queryFn: async () => {
          const response = await subscriptionServices.getSubscriptionHistory(currentPage + 1, limit);
          return response.data;
        },
      });
    }

    // Prefetch previous page
    if (pagination.hasPrevPage && currentPage > 1) {
      queryClient.prefetchQuery({
        queryKey: ["subscription-history", currentPage - 1],
        queryFn: async () => {
          const response = await subscriptionServices.getSubscriptionHistory(currentPage - 1, limit);
          return response.data;
        },
      });
    }
  }, [currentPage, subscriptionResponse, queryClient, limit]);

  const subscriptionData = subscriptionResponse?.data || [];
  const pagination = subscriptionResponse?.pagination;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"; // Green for success
      case "pending":
        return "secondary"; // Yellow/gray for pending
      case "failed":
        return "destructive"; // Red for failed
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Success";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  const prepareInvoiceData = (subscription: any) => {
    return {
      _id: subscription._id,
      invoice_number:
        subscription.invoice_number ||
        `INV-${subscription._id?.slice(-8)?.toUpperCase()}`,
      invoice_date:
        subscription.created_at || subscription.subscription_start_date,
      due_date: subscription.due_date || subscription.subscription_end_date,
      payment_status: subscription.payment_status,
      payment_method: subscription.payment_method || "card",
      payment_date: subscription.payment_date,
      payment_transaction_id:
        subscription.payment_transaction_id || subscription.transaction_id || subscription.payment_id,

      // Razorpay specific fields
      razorpay_payment_id: subscription.razorpay_payment_id,
      razorpay_order_id: subscription.razorpay_order_id,
      razorpay_signature: subscription.razorpay_signature,

      // Stripe specific fields
      stripe_payment_intent_id: subscription.stripe_payment_intent_id,
      stripe_charge_id: subscription.stripe_charge_id,
      stripe_customer_id: subscription.stripe_customer_id,

      // PayPal specific fields
      paypal_order_id: subscription.paypal_order_id,
      paypal_payer_id: subscription.paypal_payer_id,
      paypal_payer_email: subscription.paypal_payer_email,

      // Billing info
      billing_info: {
        name:
          subscription.company_name ||
          subscription.billing_name ||
          "Company Name",
        email: subscription.company_email || subscription.billing_email || "",
        address: subscription.billing_address || "",
        city: subscription.billing_city || "",
        postal_code: subscription.billing_postal_code || "",
        country: subscription.billing_country || "",
        phone: subscription.billing_phone || "",
      },

      // Items
      items: [
        {
          description: `Subscription Plan - ${subscription.number_of_users} ${
            subscription.number_of_users === 1 ? "User" : "Users"
          } × ${subscription.number_of_days} Days`,
          quantity: 1,
          unit_price: subscription.total_amount,
          total_price: subscription.total_amount,
        },
        ...(subscription.selected_modules?.map((module: any) => ({
          description: `Module: ${module.module_name}`,
          quantity: 1,
          unit_price: module.cost || 0,
          total_price: module.cost || 0,
        })) || []),
      ],

      // Financial details
      subtotal: subscription.subtotal || subscription.total_amount,
      tax_amount: subscription.tax_amount || 0,
      tax_rate: subscription.tax_rate || 0,
      discount_amount: subscription.discount_amount || 0,
      total_amount: subscription.total_amount,

      // Additional info
      notes:
        subscription.notes ||
        `Subscription for ${subscription.number_of_days} days with ${
          subscription.number_of_users
        } user${subscription.number_of_users === 1 ? "" : "s"}.`,
      subscription_id: subscription._id,
    };
  };

  const handleViewInvoice = (subscription: any) => {
    const invoiceData = prepareInvoiceData(subscription);
    setSelectedInvoice(invoiceData);
    setShowInvoiceModal(true);
  };

  const handleDownloadPDF = async (subscription: any) => {
    // Only fetch from gateway if payment is completed and has transaction_id
    if (
      subscription.payment_status === "completed" &&
      subscription.payment_transaction_id &&
      subscription.payment_method
    ) {
      try {
        toast.loading("Fetching invoice from payment gateway...", { id: "invoice-download" });
        
        // Fetch invoice from payment gateway
        const response = await subscriptionServices.fetchInvoiceFromGateway(subscription._id);
        
        if (response.data.success) {
          // Prepare billing info
          const billingInfo = {
            name: subscription.company_name || subscription.billing_name || "Company Name",
            email: subscription.company_email || subscription.billing_email || "",
            phone: subscription.billing_phone || "",
          };
          
          // Generate PDF from gateway data
          generateGatewayInvoicePDF(response.data, billingInfo);
          
          toast.success(
            `Invoice downloaded from ${subscription.payment_method.toUpperCase()} gateway!`,
            { id: "invoice-download" }
          );
        } else {
          throw new Error("Failed to fetch invoice from gateway");
        }
      } catch (error: any) {
        console.error("Error fetching invoice from gateway:", error);
        toast.dismiss("invoice-download");
        
        // Fallback to local invoice generation
        toast.warning("Generating local invoice as fallback...");
        try {
          const invoiceData = prepareInvoiceData(subscription);
          generateInvoicePDF(invoiceData);
          toast.success(`Local invoice ${invoiceData.invoice_number} downloaded!`);
        } catch (fallbackError) {
          console.error("Error generating fallback PDF:", fallbackError);
          toast.error("Failed to generate invoice. Please try again.");
        }
      }
    } else {
      // For pending/failed payments or missing transaction_id, use local generation
      try {
        const invoiceData = prepareInvoiceData(subscription);
        generateInvoicePDF(invoiceData);
        toast.success(`Invoice ${invoiceData.invoice_number} downloaded successfully!`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast.error("Failed to generate PDF. Please try again.");
      }
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination?.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSendStripeReceipt = async (subscription: any) => {
    try {
      setSendingEmail(subscription._id);
      toast.loading("Sending Stripe receipt via email...", { id: "send-receipt" });
      
      const response = await subscriptionServices.sendStripeReceiptEmail(subscription._id);
      
      if (response.data.success) {
        
        toast.success(
          `Receipt sent successfully to ${response.data.email}`,
          { id: "send-receipt" }
        );
      } else {
        throw new Error(response.data.message || "Failed to send receipt");
      }
    } catch (error: any) {
      console.error("❌ Error sending Stripe receipt:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to send receipt email";
      toast.error(errorMessage, { id: "send-receipt" });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleSendPayPalReceipt = async (subscription: any) => {
    try {
      setSendingEmail(subscription._id);
      toast.loading("Sending PayPal receipt via email...", { id: "send-receipt" });
      
      const response = await subscriptionServices.sendPayPalReceiptEmail(subscription._id);
      
      if (response.data.success) {
        
        toast.success(
          `Receipt sent successfully to ${response.data.email}`,
          { id: "send-receipt" }
        );
      } else {
        throw new Error(response.data.message || "Failed to send receipt");
      }
    } catch (error: any) {
      console.error("❌ Error sending PayPal receipt:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to send receipt email";
      toast.error(errorMessage, { id: "send-receipt" });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleSendRazorpayReceipt = async (subscription: any) => {
    try {
      setSendingEmail(subscription._id);
      toast.loading("Sending Razorpay receipt via email...", { id: "send-receipt" });
      
      const response = await subscriptionServices.sendRazorpayReceiptEmail(subscription._id);
      
      if (response.data.success) {
        
        toast.success(
          `Receipt sent successfully to ${response.data.email}`,
          { id: "send-receipt" }
        );
      } else {
        throw new Error(response.data.message || "Failed to send receipt");
      }
    } catch (error: any) {
      console.error("❌ Error sending Razorpay receipt:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to send receipt email";
      toast.error(errorMessage, { id: "send-receipt" });
    } finally {
      setSendingEmail(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Failed to load subscription history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionData || subscriptionData.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No subscription history found
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Modules</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionData?.map((subscription: any, idx: number) => (
                    <TableRow key={subscription._id}>
                      <TableCell>
                        {(currentPage - 1) * limit + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {subscription.number_of_days} days
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subscription.subscription_start_date &&
                              format(
                                new Date(subscription.subscription_start_date),
                                "PP"
                              )}{" "}
                            -{" "}
                            {subscription.subscription_end_date &&
                              format(
                                new Date(subscription.subscription_end_date),
                                "PP"
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{subscription.number_of_users}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {subscription.selected_modules
                            ?.slice(0, 2)
                            .map((module: any, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {module.module_name}
                              </Badge>
                            ))}
                          {subscription.selected_modules?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{subscription.selected_modules.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${subscription.total_amount}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="capitalize">
                            {subscription.payment_method || "N/A"}
                          </Badge>
                          {subscription.payment_transaction_id && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={subscription.payment_transaction_id}>
                              {subscription.payment_transaction_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusColor(subscription.payment_status)}
                          className={subscription.payment_status === "completed" ? "bg-green-500 hover:bg-green-600" : subscription.payment_status === "failed" ? "bg-red-500 hover:bg-red-600" : ""}
                        >
                          {getStatusLabel(subscription.payment_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(subscription)}
                            className="h-8 w-8 p-0"
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(subscription)}
                            className="h-8 w-8 p-0 relative"
                            title={
                              subscription.payment_status === "completed" &&
                              subscription.payment_transaction_id
                                ? `Download from ${subscription.payment_method?.toUpperCase()} Gateway`
                                : "Download Invoice"
                            }
                          >
                            <Download className="h-4 w-4" />
                            {subscription.payment_status === "completed" &&
                              subscription.payment_transaction_id && (
                                <CheckCircle2 className="h-3 w-3 text-green-500 absolute -top-1 -right-1" />
                              )}
                          </Button>
                          {subscription.payment_method === "stripe" &&
                            subscription.payment_status === "completed" &&
                            subscription.payment_transaction_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendStripeReceipt(subscription)}
                                disabled={sendingEmail === subscription._id}
                                className="h-8 w-8 p-0"
                                title="Send Stripe Receipt via Email"
                              >
                                {sendingEmail === subscription._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          {subscription.payment_method === "paypal" &&
                            subscription.payment_status === "completed" &&
                            subscription.payment_transaction_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendPayPalReceipt(subscription)}
                                disabled={sendingEmail === subscription._id}
                                className="h-8 w-8 p-0"
                                title="Send PayPal Receipt via Email"
                              >
                                {sendingEmail === subscription._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          {subscription.payment_method === "razorpay" &&
                            subscription.payment_status === "completed" &&
                            subscription.payment_transaction_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendRazorpayReceipt(subscription)}
                                disabled={sendingEmail === subscription._id}
                                className="h-8 w-8 p-0"
                                title="Send Razorpay Receipt via Email"
                              >
                                {sendingEmail === subscription._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {pagination && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, pagination.totalItems)} of {pagination.totalItems} entries
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrevPage}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="text-sm">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <InvoiceViewModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoice={selectedInvoice}
      />
    </>
  );
};

export default SubscriptionHistoryTable;