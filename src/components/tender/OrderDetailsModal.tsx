import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Car,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  Package,
  Truck,
  CheckCircle,
} from "lucide-react";

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  open,
  onOpenChange,
  order,
  onClose,
}) => {
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Order - Approved":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Accepted":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Delivered":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Aborted":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details - {order?.tender_id}
          </DialogTitle>
          <DialogDescription>
            View complete order information including customer details, vehicle specifications,
            and order status
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Order Status */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Order Status
              </Label>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={getStatusBadgeColor(order?.quote_status)}>
                  {order?.quote_status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Order ID: {order?.tender_id}
                </span>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{order?.customer_info?.name || "N/A"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{order?.customer_info?.email || "N/A"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{order?.customer_info?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{order?.customer_info?.address || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Vehicle Details */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Details
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Make</Label>
                  <p className="font-medium">{order?.basic_vehicle_info?.make || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="font-medium">{order?.basic_vehicle_info?.model || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <p className="font-medium">{order?.basic_vehicle_info?.year || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Variant</Label>
                  <p className="font-medium">{order?.basic_vehicle_info?.variant || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Body Style</Label>
                  <p className="font-medium">{order?.basic_vehicle_info?.body_style || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <p className="font-medium">{order?.basic_vehicle_info?.color || "N/A"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Amount */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Order Amount
              </Label>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quote Price</span>
                  <span className="text-2xl font-bold text-primary">
                    ${order?.quote_price?.toLocaleString() || "0"}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Timeline */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Order Timeline
              </Label>
              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Order Created</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {order?.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : "N/A"}
                  </span>
                </div>

                {order?.submitted_at && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Quote Submitted</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(order.submitted_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {order?.quote_status === "Order - Approved" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Order Approved</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {order?.updated_at
                        ? new Date(order.updated_at).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                )}

                {order?.quote_status === "Accepted" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Order Accepted</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {order?.updated_at
                        ? new Date(order.updated_at).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                )}

                {order?.quote_status === "Delivered" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Order Delivered</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {order?.updated_at
                        ? new Date(order.updated_at).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quote Notes */}
            {order?.quote_notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </Label>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{order.quote_notes}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
