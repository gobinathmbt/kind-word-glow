import React, { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { subscriptionServices } from "@/api/services";
import InvoiceViewModal from "./InvoiceViewModal";

const SubscriptionHistoryTable: React.FC = () => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Load subscription history with invoices
  const {
    data: subscriptionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["subscription-history"],
    queryFn: async () => {
      try {
        const response = await subscriptionServices.getSubscriptionHistory();
        return response.data.data || [];
      } catch (error) {
        console.error("Failed to fetch subscription history:", error);
        throw error;
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "completed":
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleViewInvoice = (subscription: any) => {
    // Prepare invoice data from subscription data
    const invoiceData = {
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
        subscription.transaction_id || subscription.payment_id,

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
          unit_price: module.price || 0,
          total_price: module.price || 0,
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

    setSelectedInvoice(invoiceData);
    setShowInvoiceModal(true);
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
              {" "}
              {/* 👈 Add this wrapper */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Modules</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionData?.map((subscription: any) => (
                    <TableRow key={subscription._id}>
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
                        <Badge
                          variant={getStatusColor(subscription.payment_status)}
                        >
                          {subscription.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInvoice(subscription)}
                          className="h-8 w-8 p-0"
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
