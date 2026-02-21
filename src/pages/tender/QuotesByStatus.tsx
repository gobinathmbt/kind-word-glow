import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenderDealershipAuthService } from "@/api/services";
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
  User,
  Calendar,
  DollarSign,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ClipboardList,
} from "lucide-react";
import DataTableLayout from "@/components/common/DataTableLayout";
import TenderDealershipLayout from "@/components/layout/TenderDealershipLayout";
import TenderQuoteSideModal from "@/components/tender/TenderQuoteSideModal";

const QuotesByStatus = () => {
  const { status } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dealershipUser, setDealershipUser] = useState<any>(null);
  const [dealershipInfo, setDealershipInfo] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteDetailsOpen, setQuoteDetailsOpen] = useState(false);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const [quoteToWithdraw, setQuoteToWithdraw] = useState<any>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("tender_dealership_token");
    const user = sessionStorage.getItem("tender_dealership_user");
    const info = sessionStorage.getItem("tender_dealership_info");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    setDealershipUser(JSON.parse(user));
    setDealershipInfo(JSON.parse(info || "{}"));
  }, [navigate]);

  // Fetch all quotes when pagination is disabled
  const fetchAllQuotes = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await tenderDealershipAuthService.getQuotesByStatus({
          status: status,
          page: currentPage,
          limit: 100,
          search,
        });

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
      ? ["dealership-quotes", status, page, search, rowsPerPage]
      : ["dealership-quotes-all", status, search],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllQuotes();
      }

      const response = await tenderDealershipAuthService.getQuotesByStatus({
        status: status,
        page,
        limit: rowsPerPage,
        search,
      });
      return response.data;
    },
    enabled: !!status && !!dealershipUser,
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
      if (sortField === "customer_name") {
        aValue = a.customer_info?.name || "";
        bValue = b.customer_info?.name || "";
      } else if (sortField === "vehicle") {
        aValue = `${a.basic_vehicle_info?.make} ${a.basic_vehicle_info?.model}`;
        bValue = `${b.basic_vehicle_info?.make} ${b.basic_vehicle_info?.model}`;
      } else if (sortField === "created_at") {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      } else if (sortField === "quote_price") {
        aValue = a.quote_price || 0;
        bValue = b.quote_price || 0;
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

  // Withdraw quote mutation
  const withdrawQuoteMutation = useMutation({
    mutationFn: async (tenderId: string) => {
      const response = await tenderDealershipAuthService.withdrawQuote(tenderId);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Quote withdrawn successfully");
      queryClient.invalidateQueries({ queryKey: ["dealership-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["dealership-tender-requests"] });
      setConfirmWithdrawOpen(false);
      setQuoteToWithdraw(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to withdraw quote");
      setConfirmWithdrawOpen(false);
      setQuoteToWithdraw(null);
    },
  });

  const getStatusTitle = (status: string) => {
    const titles: Record<string, string> = {
      Open: "Open Quotes",
      "In Progress": "In Progress Quotes",
      Submitted: "Submitted Quotes",
      Withdrawn: "Withdrawn Quotes",
      Closed: "Closed Quotes",
    };
    return titles[status] || "Quotes";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "In Progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Submitted":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Withdrawn":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      case "Closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
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

  const handleWithdraw = (quote: any) => {
    setQuoteToWithdraw(quote);
    setConfirmWithdrawOpen(true);
  };

  const confirmWithdraw = () => {
    if (quoteToWithdraw) {
      withdrawQuoteMutation.mutate(quoteToWithdraw._id);
    }
  };

  const handleViewDetails = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteDetailsOpen(true);
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
  const openCount = quotes.filter((q: any) => q.quote_status === "Open").length;
  const inProgressCount = quotes.filter(
    (q: any) => q.quote_status === "In Progress"
  ).length;
  const submittedCount = quotes.filter(
    (q: any) => q.quote_status === "Submitted"
  ).length;
  const withdrawnCount = quotes.filter(
    (q: any) => q.quote_status === "Withdrawn"
  ).length;
  const closedCount = quotes.filter((q: any) => q.quote_status === "Closed").length;

  const statChips = [
    {
      label: "Total",
      value: totalQuotes,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Open",
      value: openCount,
      variant: "secondary" as const,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      hoverColor: "hover:bg-yellow-100",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      variant: "outline" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-100",
    },
    {
      label: "Submitted",
      value: submittedCount,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Withdrawn",
      value: withdrawnCount,
      variant: "outline" as const,
      bgColor: "bg-orange-100",
      textColor: "text-orange-800",
      hoverColor: "hover:bg-orange-100",
    },
    {
      label: "Closed",
      value: closedCount,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
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
    const isReadOnly = status === "Submitted" || status === "Withdrawn" || status === "Closed";

    return (
      <div className="flex gap-2">
        {status === "Submitted" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleWithdraw(quote)}
            disabled={withdrawQuoteMutation.isPending}
            className="text-xs"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Withdraw
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleViewDetails(quote)}
          className="text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    );
  };

  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("tender_id")}
      >
        <div className="flex items-center">
          Tender ID
          {getSortIcon("tender_id")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("customer_name")}
      >
        <div className="flex items-center">
          Customer
          {getSortIcon("customer_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("vehicle")}
      >
        <div className="flex items-center">
          Vehicle
          {getSortIcon("vehicle")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("quote_price")}
      >
        <div className="flex items-center">
          Quote Price
          {getSortIcon("quote_price")}
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

  const renderTableBody = () => {
    if (sortedQuotes.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-8">
            <div className="flex flex-col items-center gap-2">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No quotes found</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return sortedQuotes.map((quote: any, index: number) => (
      <TableRow key={quote._id}>
        <TableCell>
          {paginationEnabled ? (page - 1) * rowsPerPage + index + 1 : index + 1}
        </TableCell>
        <TableCell className="font-medium">{quote.tender_id}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{quote.customer_info?.name}</p>
              <p className="text-sm text-muted-foreground">
                {quote.customer_info?.email}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {quote.basic_vehicle_info?.make} {quote.basic_vehicle_info?.model}
              </p>
              <p className="text-sm text-muted-foreground">
                {quote.basic_vehicle_info?.year} - {quote.basic_vehicle_info?.variant}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {quote.quote_price ? (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${quote.quote_price.toLocaleString()}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(quote.created_at).toLocaleDateString()}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={getStatusBadgeVariant(quote.quote_status)}>
            {quote.quote_status}
          </Badge>
        </TableCell>
        <TableCell>{renderActionButtons(quote)}</TableCell>
      </TableRow>
    ));
  };

  if (!dealershipUser || !dealershipInfo) {
    return (
      <TenderDealershipLayout title={getStatusTitle(status!)}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenderDealershipLayout>
    );
  }

  return (
    <TenderDealershipLayout title={getStatusTitle(status!)}>
      <DataTableLayout
        disableDashboardLayout={true}
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
        cookieName={`dealership_quotes_${status}_pagination`}
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {/* Modals */}
      {selectedQuote && (
        <TenderQuoteSideModal
          open={quoteDetailsOpen}
          onOpenChange={setQuoteDetailsOpen}
          tender={selectedQuote}
          onClose={() => {
            setQuoteDetailsOpen(false);
            setSelectedQuote(null);
            refetch();
          }}
          readOnly={status === "Submitted" || status === "Withdrawn" || status === "Closed"}
        />
      )}

      <Dialog open={confirmWithdrawOpen} onOpenChange={setConfirmWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw this quote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmWithdrawOpen(false)}
              disabled={withdrawQuoteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmWithdraw}
              disabled={withdrawQuoteMutation.isPending}
            >
              {withdrawQuoteMutation.isPending ? "Withdrawing..." : "Yes, Withdraw Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TenderDealershipLayout>
  );
};

export default QuotesByStatus;
