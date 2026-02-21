import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ClipboardList,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  Calendar,
  User,
  Car,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { tenderDealershipAuthService } from "@/api/services";
import DataTableLayout from "@/components/common/DataTableLayout";
import TenderDealershipLayout from "@/components/layout/TenderDealershipLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import TenderQuoteSideModal from "@/components/tender/TenderQuoteSideModal";

const TenderRequests = () => {
  const navigate = useNavigate();
  const [dealershipUser, setDealershipUser] = useState<any>(null);
  const [dealershipInfo, setDealershipInfo] = useState<any>(null);

  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  // Function to fetch all tenders when pagination is disabled
  const fetchAllTenders = async () => {
    try {
      let allData: any[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          page: currentPage.toString(),
          limit: "100",
        };

        if (searchTerm) params.search = searchTerm;
        if (statusFilter !== "all") params.status = statusFilter;

        const response = await tenderDealershipAuthService.getTenders(params);

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
        stats: {
          totalTenders: allData.length,
          openTenders: allData.filter((t: any) => t.quote_status === "Open").length,
          inProgressTenders: allData.filter((t: any) => t.quote_status === "In Progress").length,
          submittedTenders: allData.filter((t: any) => t.quote_status === "Submitted").length,
        },
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: tendersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? [
          "dealership-tender-requests",
          page,
          searchTerm,
          statusFilter,
          rowsPerPage,
        ]
      : [
          "all-dealership-tender-requests",
          searchTerm,
          statusFilter,
        ],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllTenders();
      }

      const response = await tenderDealershipAuthService.getTenders({
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      return response.data;
    },
    enabled: !!dealershipUser,
  });

  const tenders = tendersData?.data || [];
  const stats = tendersData?.stats || {};

  // Sort tenders when not using pagination
  const sortedTenders = React.useMemo(() => {
    if (!sortField) return tenders;

    return [...tenders].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested fields
      if (sortField === "customer_name") {
        aValue = a.customer_info?.name || "";
        bValue = b.customer_info?.name || "";
      } else if (sortField === "vehicle") {
        aValue = `${a.basic_vehicle_info?.make} ${a.basic_vehicle_info?.model}`;
        bValue = `${b.basic_vehicle_info?.make} ${b.basic_vehicle_info?.model}`;
      } else if (sortField === "expiry") {
        aValue = new Date(a.tender_expiry_time).getTime();
        bValue = new Date(b.tender_expiry_time).getTime();
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
  }, [tenders, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const handleViewTender = (tender: any) => {
    setSelectedTender(tender);
    setIsQuoteModalOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (rows: string) => {
    setRowsPerPage(parseInt(rows));
    setPage(1);
  };

  const handlePaginationToggle = (enabled: boolean) => {
    setPaginationEnabled(enabled);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
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

  const isExpired = (expiryTime: string) => {
    return new Date(expiryTime) < new Date();
  };

  const statChips = [
    {
      label: "Total Tenders",
      value: stats.totalTenders || 0,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-200",
    },
    {
      label: "Open",
      value: stats.openTenders || 0,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      hoverColor: "hover:bg-yellow-200",
      onClick: () => setStatusFilter("Open"),
    },
    {
      label: "In Progress",
      value: stats.inProgressTenders || 0,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-200",
      onClick: () => setStatusFilter("In Progress"),
    },
    {
      label: "Submitted",
      value: stats.submittedTenders || 0,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-200",
      onClick: () => setStatusFilter("Submitted"),
    },
  ];

  const actionButtons = [
    {
      icon: (
        <div className="relative">
          <Input
            type="text"
            placeholder="Search tenders..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="h-9 w-[200px] pr-8"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
      tooltip: "Search",
      onClick: () => {},
      className: "",
    },
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      tooltip: "Filters",
      onClick: () => setIsFilterDialogOpen(true),
      variant: "outline" as const,
      className: "bg-muted hover:bg-muted/80",
    },
  ];

  const renderTableHeader = () => (
    <TableRow>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("tender_id")}
      >
        <div className="flex items-center gap-2">
          Tender ID {getSortIcon("tender_id")}
        </div>
      </TableHead>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("customer_name")}
      >
        <div className="flex items-center gap-2">
          Customer {getSortIcon("customer_name")}
        </div>
      </TableHead>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("vehicle")}
      >
        <div className="flex items-center gap-2">
          Vehicle {getSortIcon("vehicle")}
        </div>
      </TableHead>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("expiry")}
      >
        <div className="flex items-center gap-2">
          Expiry {getSortIcon("expiry")}
        </div>
      </TableHead>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("quote_status")}
      >
        <div className="flex items-center gap-2">
          Status {getSortIcon("quote_status")}
        </div>
      </TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  );

  const renderTableBody = () => {
    if (sortedTenders.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8">
            <div className="flex flex-col items-center gap-2">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No tender requests found</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return sortedTenders.map((tender: any) => {
      const expired = isExpired(tender.tender_expiry_time);

      return (
        <TableRow key={tender._id} className="hover:bg-muted/50">
          <TableCell className="font-medium">{tender.tender_id}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{tender.customer_info?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {tender.customer_info?.email}
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {tender.basic_vehicle_info?.make} {tender.basic_vehicle_info?.model}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tender.basic_vehicle_info?.year} - {tender.basic_vehicle_info?.variant}
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className={expired ? "text-red-600 font-medium" : ""}>
                  {new Date(tender.tender_expiry_time).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(tender.tender_expiry_time).toLocaleTimeString()}
                </div>
                {expired && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    Expired
                  </Badge>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={getStatusBadgeVariant(tender.quote_status)}
            >
              {tender.quote_status}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewTender(tender)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View & Quote</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  if (!dealershipUser || !dealershipInfo) {
    return (
      <TenderDealershipLayout title="Tender Requests">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenderDealershipLayout>
    );
  }

  return (
    <TenderDealershipLayout title="Tender Requests">
      <DataTableLayout
        disableDashboardLayout={true}
        title="Tender Requests"
        data={sortedTenders}
        isLoading={isLoading}
        totalCount={tendersData?.total || 0}
        statChips={statChips}
        actionButtons={actionButtons}
        page={page}
        rowsPerPage={rowsPerPage}
        paginationEnabled={paginationEnabled}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onPaginationToggle={handlePaginationToggle}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        getSortIcon={getSortIcon}
        renderTableHeader={renderTableHeader}
        renderTableBody={renderTableBody}
        onRefresh={handleRefresh}
        cookieName="tender_requests_pagination"
      />

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Tenders</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down the tender list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button onClick={() => setIsFilterDialogOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tender Quote Side Modal */}
      {selectedTender && (
        <TenderQuoteSideModal
          open={isQuoteModalOpen}
          onOpenChange={setIsQuoteModalOpen}
          tender={selectedTender}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setSelectedTender(null);
            refetch();
          }}
        />
      )}
    </TenderDealershipLayout>
  );
};

export default TenderRequests;
