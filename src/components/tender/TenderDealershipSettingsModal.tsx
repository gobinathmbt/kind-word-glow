import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { tenderDealershipUserService } from "@/services/tenderDealershipUserService";
import {
  User,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import DeleteConfirmationDialog from "@/components/dialogs/DeleteConfirmationDialog";

interface TenderDealershipSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealership: any;
}

interface UserFormData {
  username: string;
  email: string;
  role: string;
}

const TenderDealershipSettingsModal: React.FC<
  TenderDealershipSettingsModalProps
> = ({ open, onOpenChange, dealership }) => {
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    email: "",
    role: "tender_dealership_user",
  });

  const [errors, setErrors] = useState<any>({});

  // Fetch users for this dealership
  const {
    data: usersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tender-dealership-users", dealership?._id],
    queryFn: async () => {
      if (!dealership?._id) return { data: [] };
      const response = await tenderDealershipUserService.getTenderDealershipUsers(
        {
          tenderDealership_id: dealership._id,
        }
      );
      return response.data;
    },
    enabled: open && !!dealership?._id,
  });

  const users = usersData?.data || [];

  const handleAddUser = () => {
    setIsEditMode(false);
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      role: "tender_dealership_user",
    });
    setErrors({});
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: any) => {
    setIsEditMode(true);
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
    });
    setErrors({});
    setIsUserFormOpen(true);
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = {
        ...formData,
        tenderDealership_id: dealership._id,
      };

      if (isEditMode && editingUser) {
        await tenderDealershipUserService.updateTenderDealershipUser(
          editingUser._id,
          userData
        );
        toast.success("User updated successfully");
      } else {
        await tenderDealershipUserService.createTenderDealershipUser(userData);
        toast.success(
          "User created successfully. Login credentials have been sent via email."
        );
      }

      setIsUserFormOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} user`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await tenderDealershipUserService.toggleTenderDealershipUserStatus(
        userId,
        {
          isActive: !currentStatus,
        }
      );
      toast.success("User status updated successfully");
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update user status"
      );
    }
  };

  const confirmDeleteUser = (userId: string) => {
    setDeleteTargetId(userId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetId) return;

    try {
      await tenderDealershipUserService.deleteTenderDealershipUser(
        deleteTargetId
      );
      toast.success("User deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await tenderDealershipUserService.resetTenderDealershipUserPassword(
        userId
      );
      toast.success("Password reset successfully. New credentials sent via email.");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to reset password"
      );
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "primary_tender_dealership_user":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "admin":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "salesman":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "primary_tender_dealership_user":
        return "Primary User";
      case "tender_dealership_user":
        return "User";
      case "admin":
        return "Admin";
      case "salesman":
        return "Salesman";
      default:
        return role;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Dealership Settings - {dealership?.dealership_name}
            </DialogTitle>
            <DialogDescription>
              Manage users for this tender dealership. Only super admins can
              access this section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Users</h3>
                <Badge variant="outline">{users.length}</Badge>
              </div>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh Users</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button size="sm" onClick={handleAddUser}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No users found. Click "Add User" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user: any) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            className={
                              user.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
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
                                      <PowerOff className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <Power className="h-4 w-4 text-green-600" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {user.isActive ? "Deactivate" : "Activate"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
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
                                    onClick={() => handleResetPassword(user._id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <KeyRound className="h-4 w-4 text-orange-600" />
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
                                    onClick={() => confirmDeleteUser(user._id)}
                                    className="h-8 w-8 p-0"
                                    disabled={
                                      user.role ===
                                      "primary_tender_dealership_user"
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {user.role ===
                                    "primary_tender_dealership_user"
                                      ? "Cannot delete primary user"
                                      : "Delete"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Form Dialog */}
      <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the user information below."
                : "Fill in the details to create a new user. Default password will be sent via email."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Enter username"
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tender_dealership_user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="salesman">Salesman</SelectItem>
                  {!isEditMode && (
                    <SelectItem value="primary_tender_dealership_user">
                      Primary User
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserFormOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update User"
                  : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
      />
    </>
  );
};

export default TenderDealershipSettingsModal;
