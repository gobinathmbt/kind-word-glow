import React, { useState, useEffect } from "react";
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
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { dealershipServices } from "@/api/services";
import apiClient from "@/api/axios";
import Select from "react-select";
import { useAuth } from "@/auth/AuthContext";

interface User {
  _id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  dealership_ids?: any[];
}

interface UserEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: () => void;
}

const UserEditDialog: React.FC<UserEditDialogProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "company_admin",
    dealership_ids: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const { completeUser } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        dealership_ids: user.dealership_ids?.map((d) => d._id || d) || [],
      });
    }
  }, [user]);

  const { data: userInfo } = useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const response = await apiClient.get("/api/auth/me");
      return response.data.user;
    },
  });

  const isPrimaryAdmin = userInfo?.is_primary_admin || false;

  // Fetch available dealerships
  const { data: dealerships } = useQuery({
    queryKey: ["dealerships-dropdown", isPrimaryAdmin],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();

      // If user is not primary admin, filter dealerships to only show assigned ones
      if (!isPrimaryAdmin && completeUser?.dealership_ids) {
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

  // Set default dealerships for non-primary admins
  useEffect(() => {
    if (dealerships && dealerships.length > 0) {
      // For non-primary admins with exactly 1 dealership, auto-select it
      if (!isPrimaryAdmin && dealerships.length === 1) {
        setFormData((prev) => ({
          ...prev,
          dealership_ids: [dealerships[0]._id],
        }));
      }
      // For primary admins or non-primary admins with multiple dealerships, don't auto-select
      // (user should make the selection)
    }
  }, [dealerships, isPrimaryAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await apiClient.put(`/api/company/users/${user._id}`, formData);
      toast.success("User updated successfully");
      onUserUpdated();
      onClose();
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form when closing
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        dealership_ids: user.dealership_ids?.map((d) => d._id || d) || [],
      });
    }
  };

  const handleDealershipToggle = (dealershipId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      dealership_ids: checked
        ? [...prev.dealership_ids, dealershipId]
        : prev.dealership_ids.filter((id) => id !== dealershipId),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and role permissions.
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
              disabled
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
                <SelectItem value="company_admin">Company Admin</SelectItem>
              </SelectContent>
            </ShadcnSelect>
          </div>

          {/* Dealership Assignment */}
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
                  const found = dealerships?.find((d: any) => d._id === id);
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
                : "You can only assign dealerships that you have access to"}
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
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
