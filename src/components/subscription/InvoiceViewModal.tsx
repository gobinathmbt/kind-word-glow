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
import { X, Download, FileText, Calendar, CreditCard } from "lucide-react";
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleDownloadPDF = () => {
    // Here you would implement PDF generation
    // For now, we'll just show a toast
    console.log("Download PDF for invoice:", invoice.invoice_number);
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
                <Badge variant={getPaymentStatusColor(invoice.payment_status)}>
                  {invoice.payment_status}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
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
                        <td className="text-right py-3">${item.unit_price}</td>
                        <td className="text-right py-3 font-medium">
                          ${item.total_price}
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
                  <span>${invoice.subtotal}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({invoice.tax_rate}%):</span>
                    <span>${invoice.tax_amount}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-${invoice.discount_amount}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${invoice.total_amount}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Transaction ID:</span>
                    <p className="font-medium font-mono text-sm">
                      {invoice.payment_transaction_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Payment Status:</span>
                    <div className="mt-1">
                      <Badge variant={getPaymentStatusColor(invoice.payment_status)}>
                        {invoice.payment_status}
                      </Badge>
                    </div>
                  </div>
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