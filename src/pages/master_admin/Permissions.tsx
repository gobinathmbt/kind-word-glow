import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
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
import {
  Plus,
  Shield,
  Trash2,
  Edit,
  Eye,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axios";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import DataTableLayout from "@/components/common/DataTableLayout";

interface Permission {
  _id: string;
  module_name: string;
  internal_name: string;
  description: string;
  is_active: boolean;
  created_by?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface MasterDropdown {
  _id: string;
  option_value: string;
  display_value: string;
  is_active: boolean;
}

const MasterPermissions = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    permissionId: "",
    permissionName: "",
  });

  const [selectedPermission, setSelectedPermission] =
    useState<Permission | null>(null);
  const [editPermission, setEditPermission] = useState<Permission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    module_name: "",
    internal_name: "",
    description: "",
    is_active: true,
  });

  // Fetch master dropdowns for module selection
  const { data: dropdownsData } = useQuery({
    queryKey: ["master-modules-for-permissions"],
    queryFn: async () => {
      const response = await apiClient.get("/api/master/dropdowns", {
        params: { dropdown_name: "company_superadmin_modules" },
      });
      return response.data;
    },
  });

  // Function to fetch all permissions when pagination is disabled
  const fetchAllPermissions = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "100",
        });

        if (searchTerm) params.append("search", searchTerm);
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (moduleFilter !== "all") params.append("module", moduleFilter);

        const response = await apiClient.get(
          `/api/master/permissions?${params}`
        );
        const responseData = response.data;

        allData = [...allData, ...responseData.data];

        if (responseData.data.length < 100) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      return {
        data: allData,
        total: allData.length,
        stats: {
          totalPermissions: allData.length,
          activePermissions: allData.filter((p: Permission) => p.is_active)
            .length,
          inactivePermissions: allData.filter((p: Permission) => !p.is_active)
            .length,
        },
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: permissionsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? [
          "permissions",
          page,
          searchTerm,
          statusFilter,
          moduleFilter,
          rowsPerPage,
        ]
      : ["all-permissions", searchTerm, statusFilter, moduleFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllPermissions();
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (moduleFilter !== "all") params.append("module", moduleFilter);

      const response = await apiClient.get(`/api/master/permissions?${params}`);
      return {
        data: response.data.data,
        total:
          response.data.pagination?.total_records || response.data.data.length,
        stats: {
          totalPermissions: response.data.data.length,
          activePermissions: response.data.data.filter(
            (p: Permission) => p.is_active
          ).length,
          inactivePermissions: response.data.data.filter(
            (p: Permission) => !p.is_active
          ).length,
        },
      };
    },
  });

  const permissions = permissionsResponse?.data || [];
  const stats = permissionsResponse?.stats || {};

  // Create permission mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post("/api/master/permissions", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Permission created successfully");
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-permissions"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create permission"
      );
    },
  });

  // Update permission mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(
        `/api/master/permissions/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Permission updated successfully");
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-permissions"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update permission"
      );
    },
  });

  // Get available modules from dropdowns
  const availableModules = useMemo(() => {
    return (
      dropdownsData?.data?.find(
        (dropdown: any) =>
          dropdown.dropdown_name === "company_superadmin_modules"
      )?.values || []
    );
  }, [dropdownsData]);

  // Sort permissions when not using pagination
  const sortedPermissions = useMemo(() => {
    if (!sortField) return permissions;

    return [...permissions].sort((a: Permission, b: Permission) => {
      let aValue = a[sortField as keyof Permission];
      let bValue = b[sortField as keyof Permission];

      // Handle nested properties
      if (sortField === "created_by") {
        aValue = a.created_by
          ? `${a.created_by.first_name} ${a.created_by.last_name}`
          : "";
        bValue = b.created_by
          ? `${b.created_by.first_name} ${b.created_by.last_name}`
          : "";
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [permissions, sortField, sortOrder]);

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

  const resetForm = () => {
    setFormData({
      module_name: "",
      internal_name: "",
      description: "",
      is_active: true,
    });
    setEditPermission(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editPermission) {
      updateMutation.mutate({ id: editPermission._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeletePermission = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(
        `/api/master/permissions/${deleteDialog.permissionId}`
      );
      toast.success("Permission deleted successfully");
      setDeleteDialog({ isOpen: false, permissionId: "", permissionName: "" });
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to delete permission"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (
    permissionId: string,
    currentStatus: boolean
  ) => {
    try {
      await apiClient.patch(`/api/master/permissions/${permissionId}/status`, {
        is_active: !currentStatus,
      });
      toast.success("Permission status updated successfully");
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update permission status"
      );
    }
  };

  const handleViewDetails = (permission: Permission) => {
    setSelectedPermission(permission);
  };

  const handleEdit = (permission: Permission) => {
    setEditPermission(permission);
    setFormData({
      module_name: permission.module_name,
      internal_name: permission.internal_name,
      description: permission.description,
      is_active: permission.is_active,
    });
    setIsAddDialogOpen(true);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setModuleFilter("all");
    setPage(1);
    refetch();
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const openDeleteDialog = (permissionId: string, permissionName: string) => {
    setDeleteDialog({
      isOpen: true,
      permissionId,
      permissionName,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      permissionId: "",
      permissionName: "",
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleExport = () => {
    toast.success("Export started");
  };

  const handleAddPermission = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  // Calculate counts for chips
  const totalPermissions = (stats as any)?.totalPermissions || 0;
  const activePermissions = (stats as any)?.activePermissions || 0;
  const inactivePermissions = (stats as any)?.inactivePermissions || 0;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalPermissions,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
    {
      label: "Active",
      value: activePermissions,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Inactive",
      value: inactivePermissions,
      variant: "secondary" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
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
      tooltip: "Export Permissions",
      onClick: handleExport,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Add Permission",
      onClick: handleAddPermission,
      className:
        "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: "Import Permissions",
      onClick: () => toast.info("Import feature coming soon"),
      className:
        "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("module_name")}
      >
        <div className="flex items-center">
          Module
          {getSortIcon("module_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("internal_name")}
      >
        <div className="flex items-center">
          Internal Name
          {getSortIcon("internal_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("description")}
      >
        <div className="flex items-center">
          Description
          {getSortIcon("description")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("is_active")}
      >
        <div className="flex items-center">
          Status
          {getSortIcon("is_active")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("created_by")}
      >
        <div className="flex items-center">
          Created By
          {getSortIcon("created_by")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("created_at")}
      >
        <div className="flex items-center">
          Created
          {getSortIcon("created_at")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedPermissions.map((permission: Permission, index: number) => {
        const moduleDisplayName =
          availableModules.find(
            (module: MasterDropdown) =>
              module.option_value === permission.module_name
          )?.display_value || permission.module_name;

        return (
          <TableRow key={permission._id}>
            <TableCell>
              {paginationEnabled
                ? (page - 1) * rowsPerPage + index + 1
                : index + 1}
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{moduleDisplayName}</span>
              </div>
            </TableCell>
            <TableCell>
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                {permission.internal_name}
              </code>
            </TableCell>
            <TableCell className="max-w-xs">
              <p className="truncate" title={permission.description}>
                {permission.description}
              </p>
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={permission.is_active}
                  onCheckedChange={() =>
                    handleToggleStatus(permission._id, permission.is_active)
                  }
                />
                <Badge variant={permission.is_active ? "default" : "secondary"}>
                  {permission.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              {permission.created_by
                ? `${permission.created_by.first_name} ${permission.created_by.last_name}`
                : "System"}
            </TableCell>
            <TableCell>
              {new Date(permission.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetails(permission)}
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(permission)}
                  title="Edit Permission"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    openDeleteDialog(permission._id, permission.internal_name)
                  }
                  title="Delete Permission"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="Permissions Management"
        data={sortedPermissions}
        isLoading={isLoading}
        totalCount={permissionsResponse?.total || 0}
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
      />

      {/* Search & Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search & Filter Permissions</DialogTitle>
            <DialogDescription>
              Search and filter permissions by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Permissions</Label>
              <Input
                id="search"
                placeholder="Search by module, internal name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="module">Module Filter</Label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {availableModules.map((module: MasterDropdown) => (
                    <SelectItem key={module._id} value={module.option_value}>
                      {module.display_value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
              <Button
                onClick={() => {
                  setPage(1);
                  setIsFilterDialogOpen(false);
                  refetch();
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Permission Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editPermission ? "Edit Permission" : "Add New Permission"}
            </DialogTitle>
            <DialogDescription>
              {editPermission
                ? "Update the permission details below"
                : "Create a new permission for the system"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="module_name">Module Name</Label>
              {editPermission ? (
                <Input
                  id="module_name"
                  value={
                    availableModules.find(
                      (module: MasterDropdown) =>
                        module.option_value === formData.module_name
                    )?.display_value || formData.module_name
                  }
                  disabled
                />
              ) : (
                <Select
                  value={formData.module_name}
                  onValueChange={(value) =>
                    setFormData({ ...formData, module_name: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModules.map((module: MasterDropdown) => (
                      <SelectItem key={module._id} value={module.option_value}>
                        {module.display_value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_name">Internal Name</Label>
              <Input
                id="internal_name"
                value={formData.internal_name}
                onChange={(e) =>
                  setFormData({ ...formData, internal_name: e.target.value })
                }
                placeholder="create_user"
                required
              />
              <p className="text-sm text-muted-foreground">
                Internal permission identifier (lowercase, underscores)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ability to create new users"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Processing..."
                  : editPermission
                  ? "Update Permission"
                  : "Create Permission"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permission Details Dialog */}
      <Dialog
        open={!!selectedPermission}
        onOpenChange={() => setSelectedPermission(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permission Details</DialogTitle>
          </DialogHeader>
          {selectedPermission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Module</Label>
                  <p className="text-sm text-muted-foreground">
                    {availableModules.find(
                      (module: MasterDropdown) =>
                        module.option_value === selectedPermission.module_name
                    )?.display_value || selectedPermission.module_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge
                    variant={
                      selectedPermission.is_active ? "default" : "secondary"
                    }
                  >
                    {selectedPermission.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Internal Name</Label>
                <code className="text-sm bg-muted px-2 py-1 rounded block">
                  {selectedPermission.internal_name}
                </code>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedPermission.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPermission.created_by
                      ? `${selectedPermission.created_by.first_name} ${selectedPermission.created_by.last_name}`
                      : "System"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(
                      selectedPermission.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDeletePermission}
     
      />
    </>
  );
};

export default MasterPermissions;
