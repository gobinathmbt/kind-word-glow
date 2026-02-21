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
  Building2,
  Plus,
  Edit,
  Trash2,
  Settings,
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
import { tenderDealershipService } from "@/services/tenderDealershipService";
import DeleteConfirmationDialog from "@/components/dialogs/DeleteConfirmationDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import { useAuth } from "@/auth/AuthContext";
import { hasPermission } from "@/utils/permissionController";
import CreateTenderDealershipModal from "@/components/tender/CreateTenderDealershipModal";
import TenderDealershipSettingsModal from "@/components/tender/TenderDealershipSettingsModal";
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

const TenderDealership = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
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
  const [editDealership, setEditDealership] = useState<any>(null);
  const [settingsDealership, setSettingsDealership] = useState<any>(null);

  const { completeUser } = useAuth();
  const canRefresh = hasPermission(completeUser, "tender_dealership_refresh");
  const canAdd = hasPermission(completeUser, "tender_dealership_create");
  const canEdit = hasPermission(completeUser, "tender_dealership_edit");
  const canDelete = hasPermission(completeUser, "tender_dealership_delete");
  const canFilter = hasPermission(completeUser, "tender_dealership_filter");
  const canSearch = hasPermission(completeUser, "tender_dealership_search");
  const canToggleStatus = hasPermission(
    completeUser,
    "tender_dealership_status_toggle"
  );
  const canManageSettings = hasPermission(
    completeUser,
    "tender_dealership_settings"
  );

  // Function to fetch all dealerships when pagination is disabled
  const fetchAllDealerships = async () => {
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

        const response = await tenderDealershipService.getTenderDealerships(
          params
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
        stats: {
          totalDealerships: allData.length,
          activeDealerships: allData.filter((d: any) => d.isActive).length,
          inactiveDealerships: allData.filter((d: any) => !d.isActive).length,
        },
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: dealershipsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["tender-dealerships", page, searchTerm, statusFilter, rowsPerPage]
      : ["all-tender-dealerships", searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllDealerships();
      }

      const response = await tenderDealershipService.getTenderDealerships({
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
      });
      return response.data;
    },
  });

  const dealerships = dealershipsData?.data || [];
  const stats = dealershipsData?.stats || {};

  // Sort dealerships when not using pagination
  const sortedDealerships = React.useMemo(() => {
    if (!sortField) return dealerships;

    return [...dealerships].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "address") {
        aValue = `${a.address?.street || ""} ${a.address?.suburb || ""} ${
          a.address?.state || ""
        }`.trim();
        bValue = `${b.address?.street || ""} ${b.address?.suburb || ""} ${
          b.address?.state || ""
        }`.trim();
      }

      if (sortField === "billing_address") {
        aValue = `${a.billing_address?.street || ""} ${
          a.billing_address?.suburb || ""
        } ${a.billing_address?.state || ""}`.trim();
        bValue = `${b.billing_address?.street || ""} ${
          b.billing_address?.suburb || ""
        } ${b.billing_address?.state || ""}`.trim();
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
  }, [dealerships, sortField, sortOrder]);

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

  const handleToggleStatus = async (dealershipId: string, currentStatus: boolean) => {
    try {
      await tenderDealershipService.toggleTenderDealershipStatus(
        dealershipId,
        {
          isActive: !currentStatus,
        }
      );
      toast.success("Dealership status updated successfully");
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update dealership status"
      );
    }
  };

  const confirmDeleteDealership = (dealershipId: string) => {
    setDeleteTargetId(dealershipId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDealership = async () => {
    if (!deleteTargetId) return;
    
    try {
      await tenderDealershipService.deleteTenderDealership(deleteTargetId);
      toast.success("Dealership deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to delete dealership"
      );
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

  const handleEditClick = (dealership: any) => {
    setEditDealership(dealership);
    setIsEditDialogOpen(true);
  };

  const handleSettingsClick = (dealership: any) => {
    setSettingsDealership(dealership);
    setIsSettingsDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditDealership(null);
    refetch();
  };

  // Calculate counts for chips
  const totalDealerships =
    dealershipsData?.total || stats.totalDealerships || 0;
  const activeDealerships =
    stats.activeDealerships ||
    dealerships.filter((d: any) => d.isActive).length;
  const inactiveDealerships =
    stats.inactiveDealerships ||
    dealerships.filter((d: any) => !d.isActive).length;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalDealerships,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Active",
      value: activeDealerships,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Inactive",
      value: inactiveDealerships,
      variant: "secondary" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
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

  // Prepare action buttons - conditionally based on permissions
  const actionButtons = [
    // Search Bar Component
    ...(canSearch
      ? [
          {
            icon: (
              <div className="relative hidden sm:block">
                <Input
                  type="text"
                  placeholder="Search dealerships..."
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
            tooltip: "Add Tender Dealership",
            onClick: () => setIsCreateDialogOpen(true),
            className:
              "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
          },
        ]
      : []),
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("tenderDealership_id")}
      >
        <div className="flex items-center">
          ID
          {getSortIcon("tenderDealership_id")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("hubRecID")}
      >
        <div className="flex items-center">
          HubRecID
          {getSortIcon("hubRecID")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("dealership_name")}
      >
        <div className="flex items-center">
          Name
          {getSortIcon("dealership_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("address")}
      >
        <div className="flex items-center">
          Address
          {getSortIcon("address")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("billing_address")}
      >
        <div className="flex items-center">
          Billing Address
          {getSortIcon("billing_address")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("abn")}
      >
        <div className="flex items-center">
          ABN
          {getSortIcon("abn")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("dp_name")}
      >
        <div className="flex items-center">
          DP Name
          {getSortIcon("dp_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("brand_or_make")}
      >
        <div className="flex items-center">
          Brand/Make
          {getSortIcon("brand_or_make")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("isActive")}
      >
        <div className="flex items-center">
          Status
          {getSortIcon("isActive")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedDealerships.map((dealership: any, index: number) => (
        <TableRow key={dealership._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <span className="text-sm font-mono">
              {dealership.tenderDealership_id}
            </span>
          </TableCell>
          <TableCell>
            <span className="text-sm">{dealership.hubRecID || "-"}</span>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Badge
                className="font-medium"
                style={{ backgroundColor: "#F97316", color: "white" }}
              >
                {dealership.dealership_name}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              {dealership.address?.street && (
                <div>{dealership.address.street}</div>
              )}
              {(dealership.address?.suburb || dealership.address?.state) && (
                <div className="text-muted-foreground">
                  {[dealership.address?.suburb, dealership.address?.state]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
              {!dealership.address?.street &&
                !dealership.address?.suburb &&
                !dealership.address?.state && <span>-</span>}
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              {dealership.billing_address?.street && (
                <div>{dealership.billing_address.street}</div>
              )}
              {(dealership.billing_address?.suburb ||
                dealership.billing_address?.state) && (
                <div className="text-muted-foreground">
                  {[
                    dealership.billing_address?.suburb,
                    dealership.billing_address?.state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
              {!dealership.billing_address?.street &&
                !dealership.billing_address?.suburb &&
                !dealership.billing_address?.state && <span>-</span>}
            </div>
          </TableCell>
          <TableCell>
            <span className="text-sm">{dealership.abn || "-"}</span>
          </TableCell>
          <TableCell>
            <span className="text-sm">{dealership.dp_name || "-"}</span>
          </TableCell>
          <TableCell>
            <span className="text-sm">{dealership.brand_or_make || "-"}</span>
          </TableCell>
          <TableCell>
            <Badge
              variant={dealership.isActive ? "default" : "secondary"}
              className={
                dealership.isActive
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-red-100 text-red-800 hover:bg-red-100"
              }
            >
              {dealership.isActive ? "Active" : "Inactive"}
            </Badge>
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
                          handleToggleStatus(dealership._id, dealership.isActive)
                        }
                        className="h-8 w-8 p-0"
                      >
                        {dealership.isActive ? (
                          <PowerOff className="h-4 w-4 text-red-600" />
                        ) : (
                          <Power className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {dealership.isActive ? "Deactivate" : "Activate"}
                      </p>
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
                        onClick={() => handleEditClick(dealership)}
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
                        onClick={() => confirmDeleteDealership(dealership._id)}
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
              {canManageSettings && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSettingsClick(dealership)}
                        className="h-8 w-8 p-0"
                      >
                        <Settings className="h-4 w-4 text-gray-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Settings</p>
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
        title="Tender Dealerships"
        data={sortedDealerships}
        isLoading={isLoading}
        totalCount={totalDealerships}
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
        cookieName="tender_dealership_pagination_enabled"
      />

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Dealerships</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down the dealership list
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
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

      {/* Create Dealership Modal */}
      <CreateTenderDealershipModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dealership Modal */}
      {editDealership && (
        <CreateTenderDealershipModal
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleEditSuccess}
          dealership={editDealership}
        />
      )}

      {/* Settings Modal */}
      {settingsDealership && (
        <TenderDealershipSettingsModal
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
          dealership={settingsDealership}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteDealership}
        title="Delete Tender Dealership"
        description="Are you sure you want to delete this tender dealership? This action cannot be undone and will also delete all associated users."
      />
    </>
  );
};

export default TenderDealership;
