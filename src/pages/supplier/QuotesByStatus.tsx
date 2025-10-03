import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supplierDashboardServices,
  supplierAuthServices,
} from "@/api/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Eye,
  Car,
  Building2,
  Calendar,
  DollarSign,
  XCircle,
  MessageSquare,
} from "lucide-react";
import CommentSheetModal from "@/components/workshop/CommentSheetModal";
import SupplierQuoteDetailsModal from "@/components/supplier/SupplierQuoteDetailsModal";
import ChatModal from "@/components/workshop/ChatModal";

const QuotesByStatus = () => {
  const { status } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [supplierUser, setSupplierUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [workMode, setWorkMode] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteDetailsOpen, setQuoteDetailsOpen] = useState(false);
  const [confirmNotInterestedOpen, setConfirmNotInterestedOpen] =
    useState(false);
  const [quoteToReject, setQuoteToReject] = useState<any>(null);
  const [messagingModalOpen, setMessagingModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("supplier_token");
    const user = sessionStorage.getItem("supplier_user");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    setSupplierUser(JSON.parse(user));
  }, [navigate]);

  const { data: quotesData, isLoading } = useQuery({
    queryKey: ["supplier-quotes", status, page, search],
    queryFn: async () => {
      const response = await supplierDashboardServices.getQuotesByStatus(
        status!,
        {
          page,
          limit: 20,
          search,
        }
      );
      return response.data;
    },
    enabled: !!status && !!supplierUser,
  });

  // Start work mutation
  const startWorkMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await supplierDashboardServices.startWork(quoteId);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Work started successfully");
      queryClient.invalidateQueries({ queryKey: ["supplier-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start work");
    },
  });

  // Submit work mutation
  const submitWorkMutation = useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: any }) => {
      const response = await supplierDashboardServices.submitWork(
        quoteId,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Work submitted for review");
      queryClient.invalidateQueries({ queryKey: ["supplier-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
      setCommentSheetOpen(false);
      setSelectedQuote(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit work");
    },
  });

  // Mark not interested mutation
  const notInterestedMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await supplierAuthServices.markNotInterested(quoteId);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Marked as not interested");
      queryClient.invalidateQueries({ queryKey: ["supplier-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
      setConfirmNotInterestedOpen(false);
      setQuoteToReject(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update status");
      setConfirmNotInterestedOpen(false);
      setQuoteToReject(null);
    },
  });

  const getStatusTitle = (status: string) => {
    const titles: Record<string, string> = {
      quote_request: "Quote Requests",
      quote_sent: "Quotes Sent",
      quote_approved: "Approved Quotes",
      work_in_progress: "Work in Progress",
      work_review: "Work Under Review",
      completed_jobs: "Completed Jobs",
      rework: "Rework Required",
    };
    return titles[status] || "Quotes";
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      quote_request: "secondary",
      quote_sent: "outline",
      quote_approved: "default",
      work_in_progress: "secondary",
      work_review: "outline",
      completed_jobs: "default",
      rework: "destructive",
    };
    return variants[status] || "outline";
  };

  const handleStartWork = (quote: any) => {
    startWorkMutation.mutate(quote._id);
  };

  const handleMessaging = (quote: any) => {
    setSelectedField({
      quote,
    });
    setMessagingModalOpen(true);
  };

  const handleWorkSubmission = (data: any) => {
    if (selectedQuote) {
      submitWorkMutation.mutate({
        quoteId: selectedQuote._id,
        data,
      });
    }
  };

  const handleNotInterested = (quote: any) => {
    setQuoteToReject(quote);
    setConfirmNotInterestedOpen(true);
  };

  const confirmNotInterested = () => {
    if (quoteToReject) {
      notInterestedMutation.mutate(quoteToReject._id);
    }
  };

  const handleViewDetails = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteDetailsOpen(true);
  };

  // Check if supplier has already responded to a quote
  const hasResponded = (quote: any) => {
    return quote.supplier_responses && quote.supplier_responses.length > 0;
  };

  // Check if supplier has marked as not interested
  const isNotInterested = (quote: any) => {
    return quote.supplier_responses.some(
      (response: any) => response.status === "not_interested"
    );
  };

  const renderActionButtons = (quote: any) => {
    const responded = hasResponded(quote);
    const notInterested = isNotInterested(quote);

    switch (status) {
      case "quote_request":
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleNotInterested(quote)}
              disabled={notInterestedMutation.isPending || responded}
              className={`${notInterested ? "bg-gray-100 text-gray-400" : ""} text-xs`}
            >
              <XCircle className="h-3 w-3 mr-1" />
              {notInterested ? "Not Interested" : "Not Interested"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(quote)}
              disabled={notInterested}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </div>
        );
      case "completed_jobs":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(quote)}
            disabled={notInterested}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>
        );
      default:
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(quote)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMessaging(quote)}
              className="text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Message
            </Button>
          </div>
        );
    }
  };

  // Mobile Card Component
  const QuoteCard = ({ quote }: { quote: any }) => {
    const responded = hasResponded(quote);
    const notInterested = isNotInterested(quote);

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Vehicle Info */}
            <div className="flex items-center gap-3">
              {quote.vehicle?.vehicle_hero_image && (
                <img
                  src={quote.vehicle.vehicle_hero_image}
                  alt="Vehicle"
                  className="w-16 h-12 object-cover rounded border flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {quote.vehicle?.name ||
                    `${quote.vehicle?.year} ${quote.vehicle?.make} ${quote.vehicle?.model}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  Stock: {quote.vehicle_stock_id}
                </div>
              </div>
            </div>

            {/* Field and Company */}
            <div className="grid grid-cols-1 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Field</div>
                <div className="font-medium text-sm">{quote.field_name}</div>
                <div className="text-xs text-muted-foreground">
                  ID: {quote.field_id}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Company</div>
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{quote.company_id?.company_name}</span>
                </div>
              </div>
            </div>

            {/* Amount and Date */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">${quote.quote_amount}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(quote.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <div>
                <Badge variant={getStatusBadgeVariant(quote.status)}>
                  {quote.status.replace("_", " ")}
                </Badge>
                {responded && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {notInterested ? "Not Interested" : "Response Submitted"}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t">
              {renderActionButtons(quote)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!supplierUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Badge variant={getStatusBadgeVariant(status!)}>
                {getStatusTitle(status!)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({quotesData?.total || 0} total)
              </span>
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : quotesData?.data?.length > 0 ? (
            <div className="h-full flex flex-col">
              {/* Desktop Table View */}
              <div className="hidden md:block flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotesData.data.map((quote: any) => (
                      <TableRow key={quote._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {quote.vehicle?.vehicle_hero_image && (
                              <img
                                src={quote.vehicle.vehicle_hero_image}
                                alt="Vehicle"
                                className="w-12 h-8 object-cover rounded border"
                              />
                            )}
                            <div>
                              <div className="font-medium">
                                {quote.vehicle?.name ||
                                  `${quote.vehicle?.year} ${quote.vehicle?.make} ${quote.vehicle?.model}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Stock: {quote.vehicle_stock_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">
                            {quote.field_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {quote.field_id}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{quote.company_id?.company_name}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>${quote.quote_amount}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(quote.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(quote.status)}
                          >
                            {quote.status.replace("_", " ")}
                          </Badge>
                          {hasResponded(quote) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {isNotInterested(quote)
                                ? "Not Interested"
                                : "Response Submitted"}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>{renderActionButtons(quote)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex-1 overflow-auto">
                {quotesData.data.map((quote: any) => (
                  <QuoteCard key={quote._id} quote={quote} />
                ))}
              </div>

              {/* Pagination */}
              {quotesData.pagination &&
                quotesData.pagination.total_pages > 1 && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {(page - 1) * 20 + 1} to{" "}
                      {Math.min(page * 20, quotesData.total)} of{" "}
                      {quotesData.total} quotes
                    </div>
                    <div className="flex gap-2 justify-center sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= quotesData.pagination.total_pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-16">
                <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  No {getStatusTitle(status!).toLowerCase()}
                </h3>
                <p className="text-muted-foreground">
                  {search
                    ? "No quotes match your search criteria"
                    : `You don't have any ${getStatusTitle(
                        status!
                      ).toLowerCase()} at the moment`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CommentSheetModal
        open={commentSheetOpen}
        onOpenChange={setCommentSheetOpen}
        quote={selectedQuote}
        mode="supplier_submit"
        onSubmit={handleWorkSubmission}
        workMode={workMode}
        loading={submitWorkMutation.isPending}
      />

      <ChatModal
        open={messagingModalOpen}
        onOpenChange={setMessagingModalOpen}
        quote={selectedField?.quote}
      />

      <SupplierQuoteDetailsModal
        open={quoteDetailsOpen}
        onOpenChange={setQuoteDetailsOpen}
        quote={selectedQuote}
        status={status!}
        onSubmitWork={() => {
          setQuoteDetailsOpen(false);
          setCommentSheetOpen(true);
          setWorkMode("submit");
        }}
        onStartWork={() => {
          setQuoteDetailsOpen(false);
          handleStartWork(selectedQuote);
        }}
        onEditWork={() => {
          setQuoteDetailsOpen(false);
          setCommentSheetOpen(true);
          setWorkMode("edit");
        }}
      />

      <Dialog
        open={confirmNotInterestedOpen}
        onOpenChange={setConfirmNotInterestedOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this quote as not interested? This
              action cannot be undone and you will lose access to this quote.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmNotInterestedOpen(false)}
              disabled={notInterestedMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmNotInterested}
              disabled={notInterestedMutation.isPending}
            >
              {notInterestedMutation.isPending
                ? "Processing..."
                : "Yes, Mark as Not Interested"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotesByStatus;  