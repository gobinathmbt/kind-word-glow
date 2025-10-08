import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supplierDashboardServices,
  supplierAuthServices,
} from "@/api/services";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
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
  Eye,
  Car,
  Building2,
  Calendar,
  DollarSign,
  XCircle,
  MessageSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import CommentSheetModal from "@/components/workshop/CommentSheetModal";
import SupplierQuoteDetailsModal from "@/components/supplier/SupplierQuoteDetailsModal";
import ChatModal from "@/components/workshop/ChatModal";
import DataTableLayout from "@/components/common/DataTableLayout";

const QuotesByStatus = () => {
  const { status } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [supplierUser, setSupplierUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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

  // Fetch all quotes when pagination is disabled
  const fetchAllQuotes = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await supplierDashboardServices.getQuotesByStatus(
          status!,
          {
            page: currentPage,
            limit: 100,
            search,
          }
        );

        allData = [...allData, ...response.data.data];

        if (response.data.data.length < 100) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      return {
        data: allData,
        total: allData.length,
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: quotesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["supplier-quotes", status, page, search, rowsPerPage]
      : ["supplier-quotes-all", status, search],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllQuotes();
      }

      const response = await supplierDashboardServices.getQuotesByStatus(
        status!,
        {
          page,
          limit: rowsPerPage,
          search,
        }
      );
      return response.data;
    },
    enabled: !!status && !!supplierUser,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const quotes = quotesData?.data || [];

  // Sort quotes when not using pagination
  const sortedQuotes = React.useMemo(() => {
    if (!sortField) return quotes;

    return [...quotes].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "vehicle_name") {
        aValue = `${a.vehicle?.year} ${a.vehicle?.make} ${a.vehicle?.model}`;
        bValue = `${b.vehicle?.year} ${b.vehicle?.make} ${b.vehicle?.model}`;
      } else if (sortField === "company_name") {
        aValue = a.company_id?.company_name || "";
        bValue = b.company_id?.company_name || "";
      } else if (sortField === "created_at") {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [quotes, sortField, sortOrder]);

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
    onSuccess: (data) => {
      toast.success(data?.message || "Work submitted for review");
      queryClient.invalidateQueries({ queryKey: ["supplier-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-stats"] });
      if (data.draft_status === false) {
        setCommentSheetOpen(false);
        setSelectedQuote(null);
      }
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleStartWork = (quote: any) => {
    startWorkMutation.mutate(quote._id);
  };

  const handleMessaging = (quote: any) => {
    setSelectedField({ quote });
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

  const hasResponded = (quote: any) => {
    return quote.supplier_responses && quote.supplier_responses.length > 0;
  };

  const isNotInterested = (quote: any) => {
    return quote.supplier_responses.some(
      (response: any) => response.status === "not_interested"
    );
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
    setTimeout(() => {
      refetch();
    }, 100);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  // Calculate stats
  const totalQuotes = quotesData?.total || 0;
  const quoteRequestCount = quotes.filter(
    (q: any) => q.status === "quote_request"
  ).length;
  const quoteSentCount = quotes.filter(
    (q: any) => q.status === "quote_sent"
  ).length;
  const approvedCount = quotes.filter(
    (q: any) => q.status === "quote_approved"
  ).length;

  const statChips = [
    {
      label: "Total",
      value: totalQuotes,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Requests",
      value: quoteRequestCount,
      variant: "secondary" as const,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      hoverColor: "hover:bg-yellow-100",
    },
    {
      label: "Sent",
      value: quoteSentCount,
      variant: "outline" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-100",
    },
    {
      label: "Approved",
      value: approvedCount,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
  ];

  const actionButtons = [
    {
      icon: <Search className="h-4 w-4" />,
      tooltip: "Search Quotes",
      onClick: () => {},
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    },
  ];

  const renderActionButtons = (quote: any) => {
    const responded = hasResponded(quote);
    const notInterested = isNotInterested(quote);

    switch (status) {
      case "quote_request":
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleNotInterested(quote)}
              disabled={notInterestedMutation.isPending || responded}
              className={`${
                notInterested ? "bg-gray-100 text-gray-400" : ""
              } text-xs`}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Not Interested
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(quote)}
              disabled={notInterested}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </div>
        );
      case "completed_jobs":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(quote)}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        );
      default:
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(quote)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
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

  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("vehicle_name")}
      >
        <div className="flex items-center">
          Vehicle
          {getSortIcon("vehicle_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("field_name")}
      >
        <div className="flex items-center">
          Field
          {getSortIcon("field_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("company_name")}
      >
        <div className="flex items-center">
          Company
          {getSortIcon("company_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("quote_amount")}
      >
        <div className="flex items-center">
          Amount
          {getSortIcon("quote_amount")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("created_at")}
      >
        <div className="flex items-center">
          Date
          {getSortIcon("created_at")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Status</TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  const renderTableBody = () => (
    <>
      {sortedQuotes.map((quote: any, index: number) => (
        <TableRow key={quote._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {quote.vehicle?.vehicle_hero_image ? (
                  <img
                    src={quote.vehicle.vehicle_hero_image}
                    alt="Vehicle"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Car className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {quote.vehicle?.name ||
                    `${quote.vehicle?.year} ${quote.vehicle?.make} ${quote.vehicle?.model}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Stock: {quote.vehicle_stock_id}
                </p>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{quote.field_name}</p>
              <p className="text-sm text-muted-foreground">
                ID: {quote.field_id}
              </p>
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
            <Badge variant={getStatusBadgeVariant(quote.status)}>
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
    </>
  );

  if (!supplierUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <DataTableLayout
        title={getStatusTitle(status!)}
        data={sortedQuotes}
        isLoading={isLoading}
        totalCount={quotesData?.total || 0}
        statChips={statChips}
        actionButtons={actionButtons}
        page={page}
        rowsPerPage={rowsPerPage}
        paginationEnabled={paginationEnabled}
        onPageChange={setPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        onPaginationToggle={handlePaginationToggle}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        getSortIcon={getSortIcon}
        renderTableHeader={renderTableHeader}
        renderTableBody={renderTableBody}
        onRefresh={handleRefresh}
        cookieName={`supplier_quotes_${status}_pagination`}
        cookieMaxAge={60 * 60 * 24 * 30}
        disableDashboardLayout={true}
      />

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
    </>
  );
};

export default QuotesByStatus;
