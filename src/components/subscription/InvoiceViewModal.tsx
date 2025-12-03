import React from "react";
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
import { X, FileText, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  if (!invoice) return null;

  // Determine currency symbol based on payment method
  const currencySymbol = invoice.payment_method === 'razorpay' ? 'Rs.' : '$';

  const getPaymentStatusColor = (status: string) => {
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

  const getPaymentStatusLabel = (status: string) => {
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



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                <div>
                  <DialogTitle className="text-2xl">
                    Invoice {invoice.invoice_number}
                  </DialogTitle>
                  <p className="text-muted-foreground mt-1">
                    Generated on {format(new Date(invoice.invoice_date), "PPP")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getPaymentStatusColor(invoice.payment_status)}
                  className={invoice.payment_status === "completed" ? "bg-green-500 hover:bg-green-600" : invoice.payment_status === "failed" ? "bg-red-500 hover:bg-red-600" : ""}
                >
                  {getPaymentStatusLabel(invoice.payment_status)}
                </Badge>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bill To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold">{invoice.billing_info?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.billing_info?.email}
                </p>
                {invoice.billing_info?.address && (
                  <div className="text-sm text-muted-foreground">
                    <p>{invoice.billing_info.address}</p>
                    <p>
                      {invoice.billing_info.city}{" "}
                      {invoice.billing_info.postal_code}
                    </p>
                    <p>{invoice.billing_info.country}</p>
                  </div>
                )}
                {invoice.billing_info?.phone && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.billing_info.phone}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Invoice Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Invoice Date:</span>
                  <span className="font-medium">
                    {format(new Date(invoice.invoice_date), "PP")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Due Date:</span>
                  <span className="font-medium">
                    {format(new Date(invoice.due_date), "PP")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Method:</span>
                  <span className="font-medium capitalize">{invoice.payment_method}</span>
                </div>
                {invoice.payment_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paid On:</span>
                    <span className="font-medium text-green-600">
                      {format(new Date(invoice.payment_date), "PP")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Description</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Unit Price</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{item.description}</p>
                          </div>
                        </td>
                        <td className="text-right py-3">{item.quantity}</td>
                        <td className="text-right py-3">{currencySymbol}{item.unit_price}</td>
                        <td className="text-right py-3 font-medium">
                          {currencySymbol}{item.total_price}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currencySymbol}{invoice.subtotal}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({invoice.tax_rate}%):</span>
                    <span>{currencySymbol}{invoice.tax_amount}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{currencySymbol}{invoice.discount_amount}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{currencySymbol}{invoice.total_amount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          {invoice.payment_transaction_id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Payment Method:</span>
                      <p className="font-medium capitalize">
                        {invoice.payment_method || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Payment Status:</span>
                      <div className="mt-1">
                        <Badge 
                          variant={getPaymentStatusColor(invoice.payment_status)}
                          className={invoice.payment_status === "completed" ? "bg-green-500 hover:bg-green-600" : invoice.payment_status === "failed" ? "bg-red-500 hover:bg-red-600" : ""}
                        >
                          {getPaymentStatusLabel(invoice.payment_status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Gateway-Specific Details */}
                  {invoice.payment_method === "razorpay" && (
                    <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm">Razorpay Payment Details</h4>
                      {invoice.razorpay_payment_id && (
                        <div>
                          <span className="text-xs text-muted-foreground">Payment ID:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.razorpay_payment_id}
                          </p>
                        </div>
                      )}
                      {invoice.razorpay_order_id && (
                        <div>
                          <span className="text-xs text-muted-foreground">Order ID:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.razorpay_order_id}
                          </p>
                        </div>
                      )}
                      {invoice.razorpay_signature && (
                        <div>
                          <span className="text-xs text-muted-foreground">Signature:</span>
                          <p className="font-mono text-xs break-all text-muted-foreground">
                            {invoice.razorpay_signature}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {invoice.payment_method === "stripe" && (
                    <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm">Stripe Payment Details</h4>
                      {invoice.stripe_payment_intent_id && (
                        <div>
                          <span className="text-xs text-muted-foreground">Payment Intent ID:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.stripe_payment_intent_id}
                          </p>
                        </div>
                      )}
                      {invoice.stripe_charge_id && (
                        <div>
                          <span className="text-xs text-muted-foreground">Charge ID:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.stripe_charge_id}
                          </p>
                        </div>
                      )}
                      {invoice.stripe_customer_id && (
                        <div>
                          <span className="text-xs text-muted-foreground">Customer ID:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.stripe_customer_id}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {invoice.payment_method === "paypal" && (
                    <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm">PayPal Payment Details</h4>
                      {invoice.paypal_order_id && (
                        <div>
                          <span className="text-xs text-muted-foreground">Order ID:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.paypal_order_id}
                          </p>
                        </div>
                      )}
                      {invoice.paypal_payer_id && (
                        <div>
                          <span className="text-xs text-muted-foreground">Payer ID:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.paypal_payer_id}
                          </p>
                        </div>
                      )}
                      {invoice.paypal_payer_email && (
                        <div>
                          <span className="text-xs text-muted-foreground">Payer Email:</span>
                          <p className="font-mono text-sm break-all">
                            {invoice.paypal_payer_email}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generic Transaction ID (fallback) */}
                  {!["razorpay", "stripe", "paypal"].includes(invoice.payment_method) && (
                    <div>
                      <span className="text-sm text-muted-foreground">Transaction ID:</span>
                      <p className="font-medium font-mono text-sm break-all">
                        {invoice.payment_transaction_id}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceViewModal;