import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Edit,
  Trash2,
  Database,
  Settings,
  Plus,
  X,
  SlidersHorizontal,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { dealershipServices, dropdownServices } from "@/api/services";
import ValueManagementDialog from "../../components/dropdown/ValueManagementDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import { useAuth } from "@/auth/AuthContext";
import { formatApiNames } from "@/utils/GlobalUtils";

const DropdownMaster = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDropdown, setSelectedDropdown] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [editDropdown, setEditDropdown] = useState(null);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Get user info from auth context
  const { completeUser } = useAuth();
  const isPrimaryAdmin = completeUser?.is_primary_admin;
  const userDealerships = completeUser?.dealership_ids || [];

  const [formData, setFormData] = useState({
    dropdown_name: "",
    display_name: "",
    description: "",
    allow_multiple_selection: false,
    is_required: false,
    dealership_id: isPrimaryAdmin ? "" : userDealerships[0]?._id || "", // Set default dealership if not primary admin
  });

  // Function to fetch all dropdowns when pagination is disabled
  const fetchAllDropdowns = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params = {
          page: currentPage,
          limit: 100,
          search: searchTerm,
          status: statusFilter !== "all" ? statusFilter : undefined,
        };

        const response = await dropdownServices.getDropdowns(params);
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
    data: dropdownsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["dropdowns", page, searchTerm, statusFilter, rowsPerPage]
      : ["all-dropdowns", searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllDropdowns();
      }

      const response = await dropdownServices.getDropdowns({
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      return response.data;
    },
  });

  const dropdowns = dropdownsData?.data || [];

  // Sort dropdowns when not using pagination
  const sortedDropdowns = React.useMemo(() => {
    if (!sortField) return dropdowns;

    return [...dropdowns].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "values_count") {
        aValue = a.values?.length || 0;
        bValue = b.values?.length || 0;
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
  }, [dropdowns, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: any) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      // Only include dealership_id if user is not primary admin
      const submitData = isPrimaryAdmin
        ? formData
        : { ...formData, dealership_id: formData.dealership_id };

      await dropdownServices.createDropdown(submitData);
      toast.success("Dropdown created successfully");
      setIsDialogOpen(false);
      setFormData({
        dropdown_name: "",
        display_name: "",
        description: "",
        allow_multiple_selection: false,
        is_required: false,
        dealership_id: isPrimaryAdmin ? "" : userDealerships[0]?._id || "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create dropdown");
    }
  };

  const handleEditSubmit = async (e: any) => {
    e.preventDefault();
    try {
      // Only include dealership_id if user is not primary admin
      const submitData = isPrimaryAdmin
        ? editDropdown
        : { ...editDropdown, dealership_id: editDropdown.dealership_id };

      await dropdownServices.updateDropdown(editDropdown._id, submitData);
      toast.success("Dropdown updated successfully");
      setIsEditDialogOpen(false);
      setEditDropdown(null);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update dropdown");
    }
  };

  const handleToggleStatus = async (dropdownId, currentStatus) => {
    try {
      await dropdownServices.updateDropdown(dropdownId, {
        is_active: !currentStatus,
      });
      toast.success("Status updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const confirmDeleteDropdown = (dropdownId) => {
    setDeleteTargetId(dropdownId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDropdown = async () => {
    try {
      await dropdownServices.deleteDropdown(deleteTargetId);
      toast.success("Dropdown deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete dropdown");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleExport = () => {
    toast.success("Export started");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
    refetch();
  };

  // Calculate counts for chips
  const totalDropdowns = dropdownsData?.pagination?.total || 0;
  const activeCount = dropdowns.filter((d: any) => d.is_active).length;
  const inactiveCount = dropdowns.filter((d: any) => !d.is_active).length;
  const multiSelectCount = dropdowns.filter(
    (d: any) => d.allow_multiple_selection
  ).length;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalDropdowns,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Active",
      value: activeCount,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      variant: "secondary" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
    {
      label: "Multi-Select",
      value: multiSelectCount,
      variant: "default" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-100",
    },
  ];

  // Prepare action buttons
  const actionButtons = [
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      tooltip: "Search & Filters",
      onClick: () => setIsFilterDialogOpen(true),
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    },
    {
      icon: <Download className="h-4 w-4" />,
      tooltip: "Export Report",
      onClick: handleExport,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Database className="h-4 w-4" />,
      tooltip: "Create Dropdown",
      onClick: () => setIsDialogOpen(true),
      className:
        "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: "Import Dropdowns",
      onClick: () => toast.info("Import feature coming soon"),
      className:
        "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  const { data: dealerships } = useQuery({
    queryKey: ["dealerships-dropdown", completeUser?.is_primary_admin],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();

      if (!completeUser?.is_primary_admin && completeUser?.dealership_ids) {
        const userDealershipIds = completeUser.dealership_ids.map((d: any) =>
          typeof d === "object" ? d._id : d
        );
        return response.data.data.filter((dealership: any) =>
          userDealershipIds.includes(dealership._id)
        );
      }

      return response.data.data;
    },
    enabled: !!completeUser,
  });

  const getDealershipName = (dealershipId: string) => {
    const dealership = dealerships?.find(
      (dealer: any) => dealer._id === dealershipId
    );
    return dealership ? formatApiNames(dealership.dealership_name) : "Primary";
  };
  // Add dealership column to table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("dropdown_name")}
      >
        <div className="flex items-center">
          Name
          {getSortIcon("dropdown_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("display_name")}
      >
        <div className="flex items-center">
          Display Name
          {getSortIcon("display_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("values_count")}
      >
        <div className="flex items-center">
          Values
          {getSortIcon("values_count")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Dealership</TableHead>
      <TableHead className="bg-muted/50">Settings</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("is_active")}
      >
        <div className="flex items-center">
          Status
          {getSortIcon("is_active")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Update table body to show dealership info
  const renderTableBody = () => (
    <>
      {sortedDropdowns.map((dropdown: any, index: number) => (
        <TableRow key={dropdown._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{dropdown.dropdown_name}</p>
              <p className="text-sm text-muted-foreground">
                {dropdown.description}
              </p>
            </div>
          </TableCell>
          <TableCell>{dropdown.display_name}</TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {dropdown.values?.slice(0, 3).map((value, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {value.display_value || value.option_value}
                </Badge>
              ))}
              {dropdown.values?.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{dropdown.values.length - 3} more
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDropdown(dropdown);
                  setIsValueDialogOpen(true);
                }}
                className="h-6 px-2"
                title="Add Value"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
          <TableCell>
            <Badge className="bg-orange-500 text-white hover:bg-orange-600">
              {getDealershipName(dropdown.dealership_id)}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              {dropdown.allow_multiple_selection && (
                <Badge variant="outline" className="text-xs">
                  Multi
                </Badge>
              )}
              {dropdown.is_required && (
                <Badge variant="outline" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={dropdown.is_active}
                onCheckedChange={() =>
                  handleToggleStatus(dropdown._id, dropdown.is_active)
                }
              />
              <Badge
                variant={dropdown.is_active ? "default" : "secondary"}
                className={
                  dropdown.is_active
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                }
              >
                {dropdown.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
           <div className="flex items-center space-x-2">
  {/* Manage Values */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedDropdown(dropdown);
            setIsValueDialogOpen(true);
          }}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Manage Values</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Edit Dropdown */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditDropdown(dropdown);
            setIsEditDialogOpen(true);
          }}
          className="text-green-600 hover:text-green-800 hover:bg-green-100"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Edit Dropdown</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Delete Dropdown */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => confirmDeleteDropdown(dropdown._id)}
          className="text-red-600 hover:text-red-800 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete Dropdown</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>

          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="Dropdown Master"
        data={sortedDropdowns}
        isLoading={isLoading}
        totalCount={dropdownsData?.total || 0}
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
        cookieName="dropdownmaster_pagination_enabled" // Custom cookie name
        cookieMaxAge={60 * 60 * 24 * 30} // 30 days
      />

      {/* Search & Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search & Filter</DialogTitle>
            <DialogDescription>
              Search and filter dropdown configurations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search dropdowns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button onClick={() => setIsFilterDialogOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dropdown Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Dropdown</DialogTitle>
            <DialogDescription>
              Create a custom dropdown for use in inspection and trade-in forms
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show dealership dropdown for non-primary admins */}
            {!isPrimaryAdmin && userDealerships.length > 0 && (
              <div>
                <Label htmlFor="dealership_id">Dealership</Label>
                <Select
                  value={formData.dealership_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dealership_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dealership" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDealerships.map((dealership) => (
                      <SelectItem key={dealership._id} value={dealership._id}>
                        {dealership.dealership_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="dropdown_name">Dropdown Name</Label>
              <Input
                id="dropdown_name"
                value={formData.dropdown_name}
                disabled
                placeholder="vehicle_condition"
                required
              />
              <p className="text-sm text-muted-foreground">
                Auto-generated from Display Name (lowercase, spaces →
                underscores)
              </p>
            </div>
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => {
                  const displayName = e.target.value;
                  setFormData({
                    ...formData,
                    display_name: displayName,
                    dropdown_name: displayName
                      .toLowerCase()
                      .replace(/\s+/g, "_") // spaces → underscores
                      .replace(/[^a-z0-9_]/g, ""), // remove special chars (optional)
                  });
                }}
                placeholder="Vehicle Condition"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Condition options for vehicles"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_multiple"
                checked={formData.allow_multiple_selection}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    allow_multiple_selection: checked === true,
                  })
                }
              />
              <Label htmlFor="allow_multiple">Allow multiple selections</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_required: checked === true })
                }
              />
              <Label htmlFor="is_required">Required field</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Dropdown</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Value Management Dialog */}
      <ValueManagementDialog
        isOpen={isValueDialogOpen}
        onClose={() => setIsValueDialogOpen(false)}
        dropdown={selectedDropdown}
        onRefetch={refetch}
      />

      {/* Edit Dropdown Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dropdown</DialogTitle>
            <DialogDescription>
              Update details for this dropdown
            </DialogDescription>
          </DialogHeader>
          {editDropdown && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Show dealership dropdown for non-primary admins */}
              {!isPrimaryAdmin && userDealerships.length > 0 && (
                <div>
                  <Label htmlFor="edit_dealership_id">Dealership</Label>
                  <Select
                    value={editDropdown.dealership_id?._id || ""}
                    onValueChange={(value) =>
                      setEditDropdown({
                        ...editDropdown,
                        dealership_id: { _id: value }, // keep it consistent
                      })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dealership" />
                    </SelectTrigger>
                    <SelectContent>
                      {userDealerships.map((dealership) => (
                        <SelectItem key={dealership._id} value={dealership._id}>
                          {dealership.dealership_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="edit_dropdown_name">Dropdown Name</Label>
                <Input
                  id="edit_dropdown_name"
                  value={editDropdown.dropdown_name}
                  disabled
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_display_name">Display Name</Label>
                <Input
                  id="edit_display_name"
                  value={editDropdown.display_name}
                  onChange={(e) => {
                    const displayName = e.target.value;
                    setEditDropdown({
                      ...editDropdown,
                      display_name: displayName,
                      dropdown_name: displayName
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_]/g, ""),
                    });
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Input
                  id="edit_description"
                  value={editDropdown.description}
                  onChange={(e) =>
                    setEditDropdown({
                      ...editDropdown,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_allow_multiple"
                  checked={editDropdown.allow_multiple_selection}
                  onCheckedChange={(checked) =>
                    setEditDropdown({
                      ...editDropdown,
                      allow_multiple_selection: checked === true,
                    })
                  }
                />
                <Label htmlFor="edit_allow_multiple">
                  Allow multiple selections
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_is_required"
                  checked={editDropdown.is_required}
                  onCheckedChange={(checked) =>
                    setEditDropdown({
                      ...editDropdown,
                      is_required: checked === true,
                    })
                  }
                />
                <Label htmlFor="edit_is_required">Required field</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Dropdown</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Confirmation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dropdown? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDropdown}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DropdownMaster;
