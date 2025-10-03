import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workshopServices } from "@/api/services";
import {
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  FileText,
  Users,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReceivedQuotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  onSuccess: () => void;
}

const ReceivedQuotesModal: React.FC<ReceivedQuotesModalProps> = ({
  open,
  onOpenChange,
  field,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("received");

  // Fetch quotes for the field
  const { data: quotesData, isLoading } = useQuery({
    queryKey: [
      "field-quotes",
      field?.vehicle_type,
      field?.vehicle_stock_id,
      field?.field_id,
    ],
    queryFn: async () => {
      if (!field) return null;
      const response = await workshopServices.getQuotesForField(
        field.vehicle_type,
        field.vehicle_stock_id,
        field.field_id
      );
      return response.data;
    },
    enabled: open && !!field,
  });

  // Approve quote mutation
  const approveQuoteMutation = useMutation({
    mutationFn: async ({
      quoteId,
      supplierId,
    }: {
      quoteId: string;
      supplierId: string;
    }) => {
      const response = await workshopServices.approveSupplierQuote(
        quoteId,
        supplierId
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Quote approved successfully");
      queryClient.invalidateQueries({ queryKey: ["field-quotes"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve quote");
    },
  });

  const handleApproveQuote = (quoteId: string, supplierId: string) => {
    approveQuoteMutation.mutate({ quoteId, supplierId });
  };

  const quote = quotesData?.data;

  // Filter responses by status
  const getFilteredResponses = (status: string) => {
    if (!quote) return [];

    switch (status) {
      case "approved":
        return (
          quote.supplier_responses?.filter(
            (response: any) => response.status === "approved"
          ) || []
        );

      case "received":
        return (
          quote.supplier_responses?.filter(
            (response: any) =>
              response.status === "pending" ||
              response.status === "approved" ||
              response.status === "rejected"
          ) || []
        );

      case "pending":
        // Get suppliers who haven't responded yet
        const respondedSupplierIds =
          quote.supplier_responses?.map(
            (response: any) => response.supplier_id._id || response.supplier_id
          ) || [];

        return (
          quote.selected_suppliers?.filter((supplier: any) => {
            const supplierId = supplier._id || supplier;
            return !respondedSupplierIds.includes(supplierId);
          }) || []
        );

      case "not_interested":
        return (
          quote.supplier_responses?.filter(
            (response: any) => response.status === "not_interested"
          ) || []
        );

      default:
        return [];
    }
  };

  const renderResponseCard = (response: any) => (
    <Card
      key={response._id}
      className={`${
        response.status === "approved"
          ? "border-green-500 bg-green-50"
          : response.status === "rejected"
          ? "border-red-500 bg-red-50"
          : response.status === "not_interested"
          ? "border-gray-500 bg-gray-50"
          : "border-blue-500"
      }`}
    >
      <CardHeader>
        <CardTitle className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium">
              {response.supplier_id?.name || "Unknown Supplier"}
            </span>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              |
            </span>
            <span className="text-sm">
              {response.supplier_id?.email || "Unknown Email"}
            </span>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              |
            </span>
            <span className="text-sm">
              {response.supplier_id?.supplier_shop_name || "Unknown Shop"}
            </span>
            <div className="flex items-center gap-2">
              {response.status === "approved" && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {response.status === "rejected" && (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
          </div>
          <Badge
            variant={
              response.status === "approved"
                ? "default"
                : response.status === "rejected"
                ? "destructive"
                : response.status === "not_interested"
                ? "secondary"
                : "secondary"
            }
          >
            {response.status === "not_interested"
              ? "Not Interested"
              : response.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {response.status !== "not_interested" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Estimated Cost
                  </p>
                  <p className="font-medium">${response.estimated_cost}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Estimated Time
                  </p>
                  <p className="font-medium">
                    {response.estimated_time
                      ? format(new Date(response.estimated_time), "PPP p")
                      : "-"}
                  </p>{" "}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Response Date</p>
                  <p className="font-medium text-xs">
                    {new Date(response.responded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {response.comments && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Comments:</p>
                <p className="text-sm bg-muted/50 p-2 rounded">
                  {response.comments}
                </p>
              </div>
            )}

            {response.quote_pdf_url && (
              <div className="mb-4">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={response.quote_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Quote PDF
                  </a>
                </Button>
              </div>
            )}

            {response.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    handleApproveQuote(quote._id, response.supplier_id._id)
                  }
                  disabled={approveQuoteMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {approveQuoteMutation.isPending
                    ? "Approving..."
                    : "Approve Quote"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Supplier is not interested in this quote
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Responded on{" "}
              {new Date(response.responded_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPendingSupplier = (supplier: any) => {
    return (
      <Card
        key={supplier._id || supplier}
        className="border-yellow-500 bg-yellow-50"
      >
        <CardContent className="py-6">
          <div className="text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">{supplier.name || "Supplier"}</p>
            <p className="text-sm text-muted-foreground mb-2">
              {supplier.email || "Email not available"}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              {supplier.supplier_shop_name || "Shop name not available"}
            </p>
            <p className="text-sm text-muted-foreground">No response yet</p>
            <Badge variant="outline" className="mt-2">
              Pending Response
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full mx-auto h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Quote Responses for {field?.field_name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : quote ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Quote Details */}
              <Card className="flex-shrink-0 mb-4">
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>Company Quote Request</span>
                    <Badge variant="outline">${quote.quote_amount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {quote.quote_description || "No description provided"}
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Created: {new Date(quote.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>

              {/* Tabbed Content */}
              <div className="flex-1 min-h-0 flex flex-col">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex-1 min-h-0 flex flex-col"
                >
                  {/* Responsive TabsList */}
                  <div className="flex-shrink-0">
                    {/* Desktop and Large Tablet Layout */}
                    <TabsList className="hidden lg:grid lg:grid-cols-4 w-full">
                      <TabsTrigger
                        value="approved"
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden xl:inline">Approved Quote</span>
                        <span className="xl:hidden">Approved</span>
                        <span className="text-xs">
                          ({getFilteredResponses("approved").length})
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="received"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden xl:inline">
                          Received Quotes
                        </span>
                        <span className="xl:hidden">Received</span>
                        <span className="text-xs">
                          ({getFilteredResponses("received").length})
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="pending"
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        <span className="hidden xl:inline">Yet to Receive</span>
                        <span className="xl:hidden">Pending</span>
                        <span className="text-xs">
                          ({getFilteredResponses("pending").length})
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="not_interested"
                        className="flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="hidden xl:inline">Not Interested</span>
                        <span className="xl:hidden">Not Int.</span>
                        <span className="text-xs">
                          ({getFilteredResponses("not_interested").length})
                        </span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Mobile and Small Tablet Layout - Stacked */}
                    <div className="lg:hidden">
                      <TabsList className="grid grid-cols-2 w-full mb-2">
                        <TabsTrigger
                          value="approved"
                          className="flex items-center gap-1 text-xs"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Approved</span>
                          <span>
                            ({getFilteredResponses("approved").length})
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="received"
                          className="flex items-center gap-1 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Received</span>
                          <span>
                            ({getFilteredResponses("received").length})
                          </span>
                        </TabsTrigger>
                      </TabsList>
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger
                          value="pending"
                          className="flex items-center gap-1 text-xs"
                        >
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                          <span>
                            ({getFilteredResponses("pending").length})
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="not_interested"
                          className="flex items-center gap-1 text-xs"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Not Int.</span>
                          <span>
                            ({getFilteredResponses("not_interested").length})
                          </span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent
                      value="received"
                      className="h-full overflow-y-auto mt-4 pr-2"
                    >
                      {getFilteredResponses("received").length > 0 ? (
                        <div className="space-y-4">
                          <h3 className="font-semibold sticky top-0 bg-background py-2">
                            Supplier Responses
                          </h3>
                          <div className="space-y-4 pb-4">
                            {getFilteredResponses("received").map(
                              renderResponseCard
                            )}
                          </div>
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-16">
                            <div className="text-center">
                              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                No responses received yet
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Suppliers will be notified and their responses
                                will appear here
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="pending"
                      className="h-full overflow-y-auto mt-4 pr-2"
                    >
                      {getFilteredResponses("pending").length > 0 ? (
                        <div className="space-y-4">
                          <h3 className="font-semibold sticky top-0 bg-background py-2">
                            Pending Responses
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                            {getFilteredResponses("pending").map(
                              renderPendingSupplier
                            )}
                          </div>
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-16">
                            <div className="text-center">
                              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                              <p className="text-muted-foreground">
                                All suppliers have responded
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Check the other tabs for received responses
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="not_interested"
                      className="h-full overflow-y-auto mt-4 pr-2"
                    >
                      {getFilteredResponses("not_interested").length > 0 ? (
                        <div className="space-y-4">
                          <h3 className="font-semibold sticky top-0 bg-background py-2">
                            Not Interested Responses
                          </h3>
                          <div className="space-y-4 pb-4">
                            {getFilteredResponses("not_interested").map(
                              renderResponseCard
                            )}
                          </div>
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-16">
                            <div className="text-center">
                              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                No suppliers marked as not interested
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Suppliers who decline will appear here
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="approved"
                      className="h-full overflow-y-auto mt-4 pr-2"
                    >
                      {getFilteredResponses("approved").length > 0 ? (
                        <div className="space-y-4">
                          <h3 className="font-semibold sticky top-0 bg-background py-2">
                            Approved Quote
                          </h3>
                          <div className="space-y-4 pb-4">
                            {getFilteredResponses("approved").map(
                              renderResponseCard
                            )}
                          </div>
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-16">
                            <div className="text-center">
                              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                              <p className="text-muted-foreground">
                                No approved quote yet
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          ) : (
            <Card className="flex-1">
              <CardContent className="py-16">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No quotes found for this field
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer - Always visible */}
        <div className="flex justify-end pt-4 border-t bg-background flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceivedQuotesModal;
