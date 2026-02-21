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
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  SlidersHorizontal,
  Search,
  Power,
  PowerOff,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenderDealershipUserService } from "@/services/tenderDealershipUserService";
import DeleteConfirmationDialog from "@/components/dialogs/DeleteConfirmationDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import CreateTenderDealershipUserModal from "@/components/tender/CreateTenderDealershipUserModal";
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

const TenderDealershipUsers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dealershipUser, setDealershipUser] = useState<any>(null);
  const [dealershipInfo, setDealershipInfo] = useState<any>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editUser, setEditUser] = useState<any>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("tender_dealership_token");
    const user = sessionStorage.getItem("tender_dealership_user");
    const info = sessionStorage.getItem("tender_dealership_info");

    if (!token || !user) {
      navigate("/tender-dealership/login");
      return;
    }

    const parsedUser = JSON.parse(user);
    setDealershipUser(parsedUser);
    setDealershipInfo(JSON.parse(info || "{}"));

    // Check if user has permission to view this page
    if (
      parsedUser.role !== "primary_tender_dealership_user" &&
      parsedUser.role !== "admin"
    ) {
      toast.error("You don't have permission to access this page");
      navigate("/tender-dealership/dashboard");
    }
  }, [navigate]);

  // Function to fetch all users when pagination is disabled
  const fetchAllUsers = async () => {
    try {
      let allData: any[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          page: currentPage.toString(),
          limit: "100",
          dealership_id: dealershipInfo?.dealership_id,
        };

        if (searchTerm) params.search = searchTerm;
        if (statusFilter !== "all") params.status = statusFilter;
        if (roleFilter !== "all") params.role = roleFilter;

        const response = await tenderDealershipUserService.getTenderDealershipUsers(
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
          totalUsers: allData.length,
          activeUsers: allData.filter((u: any) => u.isActive).length,
          inactiveUsers: allData.filter((u: any) => !u.isActive).length,
        },
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
      ? [
          "tender-dealership-users",
          page,
          searchTerm,
          statusFilter,
          roleFilter,
          rowsPerPage,
          dealershipInfo?.dealership_id,
        ]
      : [
          "all-tender-dealership-users",
          searchTerm,
          statusFilter,
          roleFilter,
          dealershipInfo?.dealership_id,
        ],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllUsers();
      }

      const response = await tenderDealershipUserService.getTenderDealershipUsers({
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
        role: roleFilter,
        dealership_id: dealershipInfo?.dealership_id,
      });
      return response.data;
    },
    enabled: !!dealershipInfo?.dealership_id,
  });

  const users = usersData?.data || [];
  const stats = usersData?.stats || {};

  // Sort users when not using pagination
  const sortedUsers = React.useMemo(() => {
    if (!sortField) return users;

    return [...users].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

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
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const handleEdit = (user: any) => {
    setEditUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await tenderDealershipUserService.deleteTenderDealershipUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender-dealership-users"] });
      toast.success("User deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await tenderDealershipUserService.toggleTenderDealershipUserStatus(id, {
        isActive: !isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender-dealership-users"] });
      toast.success("User status updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update user status"
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      await tenderDealershipUserService.resetTenderDealershipUserPassword(id);
    },
    onSuccess: () => {
      toast.success("Password reset successfully. New password sent via email.");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reset password"
      );
    },
  });

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleStatusMutation.mutate({ id, isActive });
  };

  const handleResetPassword = (id: string) => {
    resetPasswordMutation.mutate(id);
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
    setRoleFilter("all");
    setPage(1);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "primary_tender_dealership_user":
        return "default";
      case "admin":
        return "secondary";
      case "salesman":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "primary_tender_dealership_user":
        return "Primary User";
      case "admin":
        return "Admin";
      case "salesman":
        return "Salesman";
      case "tender_dealership_user":
        return "User";
      default:
        return role;
    }
  };

  const statChips = [
    {
      label: "Total Users",
      value: stats.totalUsers || 0,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-200",
    },
    {
      label: "Active",
      value: stats.activeUsers || 0,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-200",
      onClick: () => setStatusFilter("active"),
    },
    {
      label: "Inactive",
      value: stats.inactiveUsers || 0,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-200",
      onClick: () => setStatusFilter("inactive"),
    },
  ];

  const actionButtons = [
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Add User",
      onClick: () => setIsCreateDialogOpen(true),
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
    {
      icon: (
        <div className="relative">
          <Input
            type="text"
            placeholder="Search users..."
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
        onClick={() => handleSort("username")}
      >
        <div className="flex items-center gap-2">
          Username {getSortIcon("username")}
        </div>
      </TableHead>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("email")}
      >
        <div className="flex items-center gap-2">
          Email {getSortIcon("email")}
        </div>
      </TableHead>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("role")}
      >
        <div className="flex items-center gap-2">
          Role {getSortIcon("role")}
        </div>
      </TableHead>
      <TableHead
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => handleSort("isActive")}
      >
        <div className="flex items-center gap-2">
          Status {getSortIcon("isActive")}
        </div>
      </TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  );

  const renderTableBody = () => {
    if (sortedUsers.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return sortedUsers.map((user: any) => (
      <TableRow key={user._id} className="hover:bg-muted/50">
        <TableCell className="font-medium">{user.username}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Badge variant={getRoleBadgeVariant(user.role)}>
            {getRoleLabel(user.role)}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={user.isActive ? "default" : "secondary"}>
            {user.isActive ? "Active" : "Inactive"}
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
                    onClick={() =>
                      handleToggleStatus(user._id, user.isActive)
                    }
                    className="h-8 w-8 p-0"
                  >
                    {user.isActive ? (
                      <PowerOff className="h-4 w-4 text-orange-600" />
                    ) : (
                      <Power className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{user.isActive ? "Deactivate" : "Activate"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetPassword(user._id)}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCw className="h-4 w-4 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset Password</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(user)}
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

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(user._id)}
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
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  if (!dealershipUser || !dealershipInfo) {
    return (
      <TenderDealershipLayout title="Users">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenderDealershipLayout>
    );
  }

  return (
    <TenderDealershipLayout title="Users">
      <DataTableLayout
        disableDashboardLayout={true}
        title="Dealership Users"
        data={sortedUsers}
        isLoading={isLoading}
        totalCount={usersData?.total || 0}
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
        cookieName="tender_dealership_users_pagination"
      />

      {/* Create User Modal */}
      <CreateTenderDealershipUserModal
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        dealershipId={dealershipInfo?.dealership_id}
      />

      {/* Edit User Modal */}
      <CreateTenderDealershipUserModal
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditUser(null);
        }}
        user={editUser}
        dealershipId={dealershipInfo?.dealership_id}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
          }
        }}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Users</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down the user list
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="primary_tender_dealership_user">
                    Primary User
                  </SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="salesman">Salesman</SelectItem>
                  <SelectItem value="tender_dealership_user">User</SelectItem>
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
    </TenderDealershipLayout>
  );
};

export default TenderDealershipUsers;
