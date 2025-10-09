import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Mail,
  Trash2,
  Edit,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { dealershipServices } from "@/api/services";
import apiClient from "@/api/axios";
import UserDeleteDialog from "../../components/dialogs/UserDeleteDialog";
import UserEditDialog from "../../components/dialogs/UserEditDialog";
import Select from "react-select";
import { useAuth } from "@/auth/AuthContext";
import DataTableLayout from "@/components/common/DataTableLayout";

const CompanyUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  const { completeUser } = useAuth();
  
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    userId: "",
    userName: "",
  });
  
  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    user: null,
  });
  
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "company_admin",
    dealership_ids: [] as string[],
  });

  const { data: userInfo } = useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const response = await apiClient.get("/api/auth/me");
      return response.data.user;
    },
  });

  const isPrimaryAdmin = userInfo?.is_primary_admin || false;

  const { data: dealerships } = useQuery({
    queryKey: ["dealerships-dropdown", isPrimaryAdmin],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();
      
      if (!isPrimaryAdmin && completeUser?.dealership_ids) {
        const userDealershipIds = completeUser.dealership_ids.map((d: any) => 
          typeof d === 'object' ? d._id : d
        );
        return response.data.data.filter((dealership: any) => 
          userDealershipIds.includes(dealership._id)
        );
      }
      
      return response.data.data;
    },
    enabled: !!completeUser,
  });

  useEffect(() => {
    if (dealerships && dealerships.length > 0) {
      if (!isPrimaryAdmin && dealerships.length === 1) {
        setFormData(prev => ({
          ...prev,
          dealership_ids: [dealerships[0]._id]
        }));
      }
    }
  }, [dealerships, isPrimaryAdmin]);

  // Function to fetch all users when pagination is disabled
  const fetchAllUsers = async () => {
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

        const response = await apiClient.get(`/api/company/users?${params}`);
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
          totalUsers: allData.length,
          activeUsers: allData.filter((u: any) => u.is_active).length,
          inactiveUsers: allData.filter((u: any) => !u.is_active).length,
          superAdmins: allData.filter((u: any) => u.role === 'company_super_admin').length,
          admins: allData.filter((u: any) => u.role === 'company_admin').length,
        }
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: usersResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["company-users", page, searchTerm, statusFilter, rowsPerPage]
      : ["all-company-users", searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllUsers();
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await apiClient.get(`/api/company/users?${params}`);
      return response.data;
    },
  });

  const users = usersResponse?.data || [];
  const stats = usersResponse?.stats || {};

  // Sort users when not using pagination
  const sortedUsers = React.useMemo(() => {
    if (!sortField) return users;

    return [...users].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "full_name") {
        aValue = `${a.first_name} ${a.last_name}`;
        bValue = `${b.first_name} ${b.last_name}`;
      } else if (sortField === "dealerships_count") {
        aValue = a.dealership_ids?.length || 0;
        bValue = b.dealership_ids?.length || 0;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.role === "company_super_admin" && !isPrimaryAdmin) {
      toast.error("Only primary admins can create super admin users");
      return;
    }

    try {
      await apiClient.post("/api/company/users", formData);
      toast.success("User created successfully. Welcome email sent.");
      setIsDialogOpen(false);
      setFormData({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        role: "company_admin",
        dealership_ids: [],
      });
      refetch();
    } catch (error: any) {
      if (error.response?.data?.message === "User already exists") {
        toast.error("User already exists");
      } else if (
        error.response?.data?.message ===
        "Only primary admins can create super admin users"
      ) {
        toast.error("Only primary admins can create super admin users");
      } else {
        toast.error("Failed to create user");
      }
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/company/users/${deleteDialog.userId}`);
      toast.success("User deleted successfully");
      setDeleteDialog({ isOpen: false, userId: "", userName: "" });
      refetch();
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/api/company/users/${userId}/status`, {
        is_active: !currentStatus,
      });
      toast.success("User status updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const sendWelcomeEmail = async (userId: string) => {
    try {
      await apiClient.post(`/api/company/users/${userId}/send-welcome`);
      toast.success("Welcome email sent successfully");
    } catch (error) {
      toast.error("Failed to send welcome email");
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
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

  const openDeleteDialog = (userId: string, userName: string) => {
    setDeleteDialog({
      isOpen: true,
      userId,
      userName,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      userId: "",
      userName: "",
    });
  };

  const openEditDialog = (user: any) => {
    setEditDialog({
      isOpen: true,
      user,
    });
  };

  const closeEditDialog = () => {
    setEditDialog({
      isOpen: false,
      user: null,
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleExport = () => {
    toast.success("Export started");
  };

  // Calculate counts for chips
  const totalUsers = stats.totalUsers || 0;
  const activeUsers = stats.activeUsers || 0;
  const inactiveUsers = stats.inactiveUsers || 0;
  const superAdmins = stats.superAdmins || 0;
  const admins = stats.admins || 0;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalUsers,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
    {
      label: "Active",
      value: activeUsers,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Inactive",
      value: inactiveUsers,
      variant: "secondary" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
    },
    {
      label: "Super Admins",
      value: superAdmins,
      variant: "default" as const,
      bgColor: "bg-purple-100",
      textColor: "text-purple-800",
      hoverColor: "hover:bg-purple-100",
    },
    {
      label: "Admins",
      value: admins,
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
      tooltip: "Export Users",
      onClick: handleExport,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Add User",
      onClick: () => setIsDialogOpen(true),
      className:
        "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: "Import Users",
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
        onClick={() => handleSort("full_name")}
      >
        <div className="flex items-center">
          User
          {getSortIcon("full_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("username")}
      >
        <div className="flex items-center">
          Username
          {getSortIcon("username")}
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
        onClick={() => handleSort("dealerships_count")}
      >
        <div className="flex items-center">
          Dealerships
          {getSortIcon("dealerships_count")}
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
        onClick={() => handleSort("last_login")}
      >
        <div className="flex items-center">
          Last Login
          {getSortIcon("last_login")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedUsers.map((user: any, index: number) => (
        <TableRow key={user._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </TableCell>
          <TableCell>{user.username}</TableCell>
          <TableCell>
            <Badge variant="outline">
              {user.role
                .replace("_", " ")
                .replace("company", "Company")}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {user.dealership_ids && user.dealership_ids.length > 0 ? (
                <>
                  {user.dealership_ids
                    .slice(0, 2)
                    .map((dealership: any, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs bg-orange-500 text-white hover:bg-orange-600"
                      >
                        {dealership.dealership_name ||
                          dealership.dealership_id}
                      </Badge>
                    ))}
                  {user.dealership_ids.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.dealership_ids.length - 2} more
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground text-sm">
                  No dealerships
                </span>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={user.is_active}
                onCheckedChange={() =>
                  handleToggleStatus(user._id, user.is_active)
                }
              />
              <span className="text-sm">
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </TableCell>
          <TableCell>
            {user.last_login
              ? new Date(user.last_login).toLocaleDateString()
              : "Never"}
          </TableCell>
          <TableCell>
        <div className="flex items-center space-x-2">
  {/* Edit User */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEditDialog(user)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Edit User</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Send Welcome Email */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => sendWelcomeEmail(user._id)}
        >
          <Mail className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Send Welcome Email</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Delete User */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            openDeleteDialog(user._id, `${user.first_name} ${user.last_name}`)
          }
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete User</p>
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
        title="Team Members"
        data={sortedUsers}
        isLoading={isLoading}
        totalCount={usersResponse?.total || 0}
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
        cookieName="user_pagination_enabled" // Custom cookie name
        cookieMaxAge={60 * 60 * 24 * 30} // 30 days
      />

      {/* Add User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new team member to your company. They will receive a
              welcome email with login credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <ShadcnSelect
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isPrimaryAdmin && (
                    <SelectItem value="company_super_admin">
                      Company Super Admin
                    </SelectItem>
                  )}
                  <SelectItem value="company_admin">
                    Company Admin
                  </SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>

            <div>
              <Label>Assign Dealerships</Label>
              <Select
                isMulti
                isSearchable
                name="dealerships"
                options={
                  dealerships?.map((d: any) => ({
                    value: d._id,
                    label: `${d.dealership_name}`,
                  })) || []
                }
                className="mt-2"
                classNamePrefix="select"
                value={formData.dealership_ids
                  .map((id) => {
                    const found = dealerships?.find(
                      (d: any) => d._id === id
                    );
                    return found
                      ? {
                          value: found._id,
                          label: `${found.dealership_name}`,
                        }
                      : null;
                  })
                  .filter(Boolean)}
                onChange={(selected) =>
                  setFormData({
                    ...formData,
                    dealership_ids: selected.map((s: any) => s.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isPrimaryAdmin 
                  ? "Select dealerships this user can access"
                  : "You can only assign dealerships that you have access to"
                }
              </p>
              {!isPrimaryAdmin && completeUser?.dealership_ids?.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  You don't have access to any dealerships
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search & Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search & Filter Users</DialogTitle>
            <DialogDescription>
              Search and filter users by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <ShadcnSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </ShadcnSelect>
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

      {/* Edit User Dialog */}
      <UserEditDialog
        isOpen={editDialog.isOpen}
        onClose={closeEditDialog}
        user={editDialog.user}
        onUserUpdated={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <UserDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteUser}
        userName={deleteDialog.userName}
        isLoading={isDeleting}
      />
    </>
  );
};

export default CompanyUsers;