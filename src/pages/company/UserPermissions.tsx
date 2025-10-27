import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Layers, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, Download, Plus, UserPlus, Search, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { companyServices } from "@/api/services";
import ManageModuleDialog from "@/components/permissions/ManageModuleDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompleteUser, useAuth } from "@/auth/AuthContext";
import GroupPermissionsDialog from "@/components/permissions/GroupPermissionsDialog";
import AssignGroupPermissionDialog from "@/components/permissions/AssignGroupPermissionDialog";

interface Permission {
  _id: string;
  module_name: string;
  internal_name: string;
  description: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  permissions: string[];
  module_access?: string[];
  group_permissions?: string;
}

interface UserPermission {
  permission_id: string;
  module_name: string;
  internal_name: string;
  description: string;
  enabled: boolean;
}

const UserPermissions = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isGroupPermissionsDialogOpen, setIsGroupPermissionsDialogOpen] = useState(false);
  const [isAssignGroupDialogOpen, setIsAssignGroupDialogOpen] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { completeUser } = useAuth();
  
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);

  const fetchAllUsers = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await companyServices.getUsersWithPermissions({
          page: currentPage,
          limit: 100,
          search: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
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
        pagination: { total_pages: 1 }
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: usersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["company-users-permissions", page, search, statusFilter, rowsPerPage]
      : ["all-company-users-permissions", search, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllUsers();
      }

      const response = await companyServices.getUsersWithPermissions({
        page,
        limit: rowsPerPage,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      return response.data;
    },
  });

  const { data: availablePermissions } = useQuery({
    queryKey: ["available-permissions"],
    queryFn: () =>
      companyServices.getAvailablePermissions().then((res) => res.data.data),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: string[];
    }) => companyServices.updateUserPermissions(userId, { permissions }),
    onSuccess: () => {
      toast.success("User permissions updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["company-users-permissions"],
      });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update permissions"
      );
    },
  });

  const users = usersData?.data || [];

  const sortedUsers = React.useMemo(() => {
    if (!sortField) return users;

    return [...users].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "name") {
        aValue = `${a.first_name} ${a.last_name}`;
        bValue = `${b.first_name} ${b.last_name}`;
      } else if (sortField === "permissions_count") {
        aValue = a.permissions?.length || 0;
        bValue = b.permissions?.length || 0;
      } else if (sortField === "module_access_count") {
        aValue = a.module_access?.length || 0;
        bValue = b.module_access?.length || 0;
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
  }, [users, sortField, sortOrder]);

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

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);

    if (availablePermissions) {
      const initialPermissions: UserPermission[] = availablePermissions.map(
        (permission: Permission) => {
          const hasPermission =
            user.permissions?.includes(permission.internal_name) || false;

          return {
            permission_id: permission._id,
            module_name: permission.module_name,
            internal_name: permission.internal_name,
            description: permission.description,
            enabled: hasPermission,
          };
        }
      );
      setUserPermissions(initialPermissions);
    }

    setIsDialogOpen(true);
  };

  const handleManageModules = (user: User) => {
    setSelectedUser(user);
    setIsModuleDialogOpen(true);
  };

  const handleAssignGroupPermission = (user: User) => {
    setSelectedUser(user);
    setIsAssignGroupDialogOpen(true);
  };

  const canManageModules = (completeUser: CompleteUser) => {
    return completeUser.role === "company_super_admin";
  };

  const handlePermissionToggle = (internalName: string, enabled: boolean) => {
    setUserPermissions((prev) =>
      prev.map((p) =>
        p.internal_name === internalName ? { ...p, enabled } : p
      )
    );
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;

    const enabledPermissions = userPermissions
      .filter((p) => p.enabled)
      .map((p) => p.internal_name);

    updatePermissionsMutation.mutate({
      userId: selectedUser._id,
      permissions: enabledPermissions,
    });
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
    refetch();
  };

  const handleExport = () => {
    toast.success("Export started");
  };

  const handleImport = () => {
    toast.info("Import feature coming soon");
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalUsers = usersData?.pagination?.total_records || usersData?.total || 0;
  const activeCount = users.filter((u: User) => u.is_active).length;
  const inactiveCount = users.filter((u: User) => !u.is_active).length;
  const adminCount = users.filter((u: User) => u.role.includes("admin")).length;

  const statChips = [
    {
      label: "Total",
      value: totalUsers,
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
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
    },
    {
      label: "Admins",
      value: adminCount,
      variant: "default" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-100",
    },
  ];

  const actionButtons = [
    {
      icon: <Users className="h-4 w-4" />,
      tooltip: "Group Permissions",
      onClick: () => setIsGroupPermissionsDialogOpen(true),
      className: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
    },
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
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Import Users",
      onClick: handleImport,
      className:
        "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("name")}
      >
        <div className="flex items-center">
          Name
          {getSortIcon("name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("email")}
      >
        <div className="flex items-center">
          Email
          {getSortIcon("email")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("role")}
      >
        <div className="flex items-center">
          Role
          {getSortIcon("role")}
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
        onClick={() => handleSort("permissions_count")}
      >
        <div className="flex items-center">
          Permissions
          {getSortIcon("permissions_count")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("module_access_count")}
      >
        <div className="flex items-center">
          Module Access
          {getSortIcon("module_access_count")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  const renderTableBody = () => (
    <>
      {sortedUsers.map((user: User, index: number) => (
        <TableRow key={user._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell className="font-medium">
            <div>
              <p className="font-medium">{user.first_name} {user.last_name}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </TableCell>
          <TableCell>{user.email}</TableCell>
          <TableCell>
            <Badge variant="outline">
              {user.role.replace("_", " ").toUpperCase()}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant={user.is_active ? "default" : "secondary"}
              className={
                user.is_active
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-red-100 text-red-800 hover:bg-red-100"
              }
            >
              {user.is_active ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline">
              {user.permissions?.length || 0}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline">
              {user.module_access?.length || 0}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManagePermissions(user)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <Settings className="h-4 w-4 mr-1" />
                Permissions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssignGroupPermission(user)}
                className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
              >
                <Users className="h-4 w-4 mr-1" />
                Group
              </Button>
              {canManageModules(completeUser) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageModules(user)}
                  className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100"
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Modules
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  const groupedPermissions = userPermissions.reduce((acc, permission) => {
    const module = permission.module_name;
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, UserPermission[]>);

  return (
    <>
      <DataTableLayout
        title="User Permissions"
        data={sortedUsers}
        isLoading={isLoading}
        totalCount={totalUsers}
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
        cookieName="permission_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {/* Search and Filters Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Search & Filter Users</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-10"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearch("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!search && statusFilter === "all"}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button
              onClick={() => {
                setPage(1);
                setIsFilterDialogOpen(false);
                refetch();
              }}
              disabled={isLoading}
            >
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Manage Permissions - {selectedUser?.first_name}{" "}
              {selectedUser?.last_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(
                  ([moduleName, permissions]) => (
                    <div key={moduleName} className="space-y-3">
                      <div className="sticky top-0 bg-background pb-2 border-b z-20">
                        <h3 className="text-lg font-semibold text-primary">
                          {moduleName}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        {permissions.map((permission) => (
                          <div
                            key={permission.permission_id}
                            className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors relative z-10"
                          >
                            <Switch
                              checked={permission.enabled}
                              onCheckedChange={(checked) =>
                                handlePermissionToggle(
                                  permission.internal_name,
                                  checked
                                )
                              }
                              className="mt-1 relative z-10"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                <Label className="font-medium text-sm">
                                  {permission.internal_name}
                                </Label>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updatePermissionsMutation.isPending
                ? "Saving..."
                : "Save Permissions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Management Dialog */}
      <ManageModuleDialog
        open={isModuleDialogOpen}
        onOpenChange={setIsModuleDialogOpen}
        user={selectedUser}
      />

      {/* Group Permissions Dialog */}
      <GroupPermissionsDialog
        open={isGroupPermissionsDialogOpen}
        onOpenChange={setIsGroupPermissionsDialogOpen}
      />

      {/* Assign Group Permission Dialog */}
      <AssignGroupPermissionDialog
        open={isAssignGroupDialogOpen}
        onOpenChange={setIsAssignGroupDialogOpen}
        user={selectedUser}
      />
    </>
  );
};

export default UserPermissions;