import React, { useState } from "react";
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
  FileText,
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  History,
  MessageSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  Search,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { tenderService } from "@/api/services";
import DeleteConfirmationDialog from "@/components/dialogs/DeleteConfirmationDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import { useAuth } from "@/auth/AuthContext";
import { hasPermission } from "@/utils/permissionController";
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
import CreateTenderModal from "@/components/tender/CreateTenderModal";
import SendTenderModal from "@/components/tender/SendTenderModal";
import TenderRecipientsModal from "@/components/tender/TenderRecipientsModal";
import TenderHistoryModal from "@/components/tender/TenderHistoryModal";

const TenderModule = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isRecipientsDialogOpen, setIsRecipientsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editTender, setEditTender] = useState<any>(null);
  const [selectedTender, setSelectedTender] = useState<any>(null);

  const { completeUser } = useAuth();
  const canAdd = hasPermission(completeUser, "tender_create");
  const canEdit = hasPermission(completeUser, "tender_edit");
  const canDelete = hasPermission(completeUser, "tender_delete");
  const canFilter = hasPermission(completeUser, "tender_filter");
  const canSearch = hasPermission(completeUser, "tender_search");
  const canToggleStatus = hasPermission(completeUser, "tender_status_toggle");
  const canSend = hasPermission(completeUser, "tender_send");
  const canView = hasPermission(completeUser, "tender_view");
  const canViewHistory = hasPermission(completeUser, "tender_history");
  const canChat = hasPermission(completeUser, "tender_chat");

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

        const response = await tenderService.getTenders(params);

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
          pendingTenders: allData.filter((t: any) => t.tender_status === "Pending").length,
          sentTenders: allData.filter((t: any) => t.tender_status === "Sent").length,
          quoteReceivedTenders: allData.filter((t: any) => t.tender_status === "Quote Received").length,
          approvedTenders: allData.filter((t: any) => t.tender_status === "Approved").length,
          closedTenders: allData.filter((t: any) => t.tender_status === "Closed").length,
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
      ? ["tenders", page, searchTerm, statusFilter, rowsPerPage]
      : ["all-tenders", searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllTenders();
      }

      const response = await tenderService.getTenders({
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
      });
      return response.data;
    },
  });

  const tenders = tendersData?.data || [];
  const stats = tendersData?.stats || {};

  // Sort tenders when not using pagination
  const sortedTenders = React.useMemo(() => {
    if (!sortField) return tenders;

    return [...tenders].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "customer_name") {
        aValue = a.customer_info?.name || "";
        bValue = b.customer_info?.name || "";
      }

      if (sortField === "vehicle_info") {
        aValue = `${a.basic_vehicle_info?.make || ""} ${a.basic_vehicle_info?.model || ""}`.trim();
        bValue = `${b.basic_vehicle_info?.make || ""} ${b.basic_vehicle_info?.model || ""}`.trim();
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
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleToggleStatus = async (tenderId: string, currentStatus: boolean) => {
    try {
      await tenderService.toggleTenderStatus(tenderId, {
        isActive: !currentStatus,
      });
      toast.success("Tender status updated successfully");
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update tender status"
      );
    }
  };

  const confirmDeleteTender = (tenderId: string) => {
    setDeleteTargetId(tenderId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTender = async () => {
    if (!deleteTargetId) return;

    try {
      await tenderService.deleteTender(deleteTargetId);
      toast.success("Tender deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete tender");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
    refetch();
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleEditClick = (tender: any) => {
    setEditTender(tender);
    setIsEditDialogOpen(true);
  };

  const handleSendClick = (tender: any) => {
    setSelectedTender(tender);
    setIsSendDialogOpen(true);
  };

  const handleViewClick = (tender: any) => {
    setSelectedTender(tender);
    setIsRecipientsDialogOpen(true);
  };

  const handleHistoryClick = (tender: any) => {
    setSelectedTender(tender);
    setIsHistoryDialogOpen(true);
  };

  const handleChatClick = (tender: any) => {
    // TODO: Implement chat functionality in task 23
    toast.info("Chat functionality will be implemented in task 23");
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditTender(null);
    refetch();
  };

  const handleSendSuccess = () => {
    setIsSendDialogOpen(false);
    setSelectedTender(null);
    refetch();
  };

  // Calculate counts for chips
  const totalTenders = tendersData?.total || stats.totalTenders || 0;
  const pendingTenders = stats.pendingTenders || tenders.filter((t: any) => t.tender_status === "Pending").length;
  const sentTenders = stats.sentTenders || tenders.filter((t: any) => t.tender_status === "Sent").length;
  const quoteReceivedTenders = stats.quoteReceivedTenders || tenders.filter((t: any) => t.tender_status === "Quote Received").length;
  const approvedTenders = stats.approvedTenders || tenders.filter((t: any) => t.tender_status === "Approved").length;
  const closedTenders = stats.closedTenders || tenders.filter((t: any) => t.tender_status === "Closed").length;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalTenders,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Pending",
      value: pendingTenders,
      variant: "secondary" as const,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      hoverColor: "hover:bg-yellow-100",
    },
    {
      label: "Sent",
      value: sentTenders,
      variant: "default" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-100",
    },
    {
      label: "Quote Received",
      value: quoteReceivedTenders,
      variant: "default" as const,
      bgColor: "bg-purple-100",
      textColor: "text-purple-800",
      hoverColor: "hover:bg-purple-100",
    },
    {
      label: "Approved",
      value: approvedTenders,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Closed",
      value: closedTenders,
      variant: "secondary" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
  ];

  // Handle search submit
  const handleSearchSubmit = () => {
    setPage(1);
    refetch();
  };

  // Handle search clear
  const handleSearchClear = () => {
    setSearchTerm("");
    setPage(1);
    refetch();
  };

  // Prepare action buttons
  const actionButtons = [
    // Search Bar Component
    ...(canSearch
      ? [
          {
            icon: (
              <div className="relative hidden sm:block">
                <Input
                  type="text"
                  placeholder="Search tenders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchSubmit();
                    }
                  }}
                  className="h-9 w-48 lg:w-64 pr-20 text-sm"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSearchClear}
                      className="h-7 w-7 p-0 hover:bg-gray-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSearchSubmit}
                    className="h-7 w-7 p-0 hover:bg-blue-100"
                  >
                    <Search className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              </div>
            ),
            tooltip: "Search",
            onClick: () => {},
            className: "",
          },
        ]
      : []),
    ...(canFilter
      ? [
          {
            icon: <SlidersHorizontal className="h-4 w-4" />,
            tooltip: "Filters",
            onClick: () => setIsFilterDialogOpen(true),
            className:
              "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
          },
        ]
      : []),
    ...(canAdd
      ? [
          {
            icon: <Plus className="h-4 w-4" />,
            tooltip: "Create Tender",
            onClick: () => setIsCreateDialogOpen(true),
            className:
              "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
          },
        ]
      : []),
  ];

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Sent":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Quote Received":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Approved":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Render table header
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
          Customer Info
          {getSortIcon("customer_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("vehicle_info")}
      >
        <div className="flex items-center">
          Vehicle Info
          {getSortIcon("vehicle_info")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("tender_status")}
      >
        <div className="flex items-center">
          Status
          {getSortIcon("tender_status")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Response Count</TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedTenders.map((tender: any, index: number) => (
        <TableRow key={tender._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <span className="text-sm font-mono">{tender.tender_id}</span>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              <div className="font-medium">{tender.customer_info?.name}</div>
              {tender.customer_info?.email && (
                <div className="text-muted-foreground text-xs">
                  {tender.customer_info.email}
                </div>
              )}
              {tender.customer_info?.phone && (
                <div className="text-muted-foreground text-xs">
                  {tender.customer_info.phone}
                </div>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              <div className="font-medium">
                {tender.basic_vehicle_info?.make} {tender.basic_vehicle_info?.model}
              </div>
              <div className="text-muted-foreground text-xs">
                {[
                  tender.basic_vehicle_info?.year,
                  tender.basic_vehicle_info?.variant,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Badge
              variant="secondary"
              className={getStatusBadgeColor(tender.tender_status)}
            >
              {tender.tender_status}
            </Badge>
          </TableCell>
          <TableCell>
            <span className="text-sm font-medium">
              {tender.response_count || "0/0"}
            </span>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {canToggleStatus && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleStatus(tender._id, tender.isActive)
                        }
                        className="h-8 w-8 p-0"
                      >
                        {tender.isActive ? (
                          <PowerOff className="h-4 w-4 text-red-600" />
                        ) : (
                          <Power className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tender.isActive ? "Deactivate" : "Activate"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canEdit && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(tender)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canDelete && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteTender(tender._id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canSend && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendClick(tender)}
                        className="h-8 w-8 p-0"
                      >
                        <Send className="h-4 w-4 text-indigo-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canView && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewClick(tender)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4 text-teal-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Recipients</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canViewHistory && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleHistoryClick(tender)}
                        className="h-8 w-8 p-0"
                      >
                        <History className="h-4 w-4 text-orange-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>History</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canChat && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChatClick(tender)}
                        className="h-8 w-8 p-0"
                      >
                        <MessageSquare className="h-4 w-4 text-pink-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Chat</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="Tender Module"
        data={sortedTenders}
        isLoading={isLoading}
        totalCount={totalTenders}
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
        cookieName="tender_module_pagination_enabled"
      />

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Tenders</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down the tender list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Quote Received">Quote Received</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1"
              >
                Clear Filters
              </Button>
              <Button
                onClick={() => setIsFilterDialogOpen(false)}
                className="flex-1"
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Tender Modal */}
      <CreateTenderModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Tender Modal */}
      {editTender && (
        <CreateTenderModal
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleEditSuccess}
          tender={editTender}
        />
      )}

      {/* Send Tender Modal */}
      {selectedTender && (
        <SendTenderModal
          open={isSendDialogOpen}
          onOpenChange={setIsSendDialogOpen}
          onSuccess={handleSendSuccess}
          tender={selectedTender}
        />
      )}

      {/* Recipients Modal */}
      {selectedTender && (
        <TenderRecipientsModal
          open={isRecipientsDialogOpen}
          onOpenChange={setIsRecipientsDialogOpen}
          tender={selectedTender}
        />
      )}

      {/* History Modal */}
      {selectedTender && (
        <TenderHistoryModal
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          tender={selectedTender}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTender}
        title="Delete Tender"
        description="Are you sure you want to delete this tender? This action cannot be undone and will also delete all associated data."
      />
    </>
  );
};

export default TenderModule;
