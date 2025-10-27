import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Settings, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { companyServices } from "@/api/services";
import ManageGroupPermissionsDialog from "./ManageGroupPermissionsDialog";

interface GroupPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GroupPermission {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  created_at: string;
}

const GroupPermissionsDialog: React.FC<GroupPermissionsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<GroupPermission | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  const { data: groupPermissionsData, isLoading } = useQuery({
    queryKey: ["group-permissions", search],
    queryFn: () =>
      companyServices.getGroupPermissions({ search: search || undefined }).then((res) => res.data),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      companyServices.createGroupPermission(data),
    onSuccess: () => {
      toast.success("Group permission created successfully");
      queryClient.invalidateQueries({ queryKey: ["group-permissions"] });
      setIsCreateMode(false);
      setNewGroupName("");
      setNewGroupDescription("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create group permission");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companyServices.deleteGroupPermission(id),
    onSuccess: () => {
      toast.success("Group permission deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["group-permissions"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete group permission");
    },
  });

  const handleCreate = () => {
    if (!newGroupName.trim() || !newGroupDescription.trim()) {
      toast.error("Please enter both name and description");
      return;
    }

    createMutation.mutate({
      name: newGroupName.trim(),
      description: newGroupDescription.trim(),
    });
  };

  const handleManagePermissions = (group: GroupPermission) => {
    setSelectedGroup(group);
    setIsManageDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const groupPermissions = groupPermissionsData?.data || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Permissions Management
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search and Create Section */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search group permissions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => setIsCreateMode(!isCreateMode)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>

            {/* Create Form */}
            {isCreateMode && (
              <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name *</Label>
                  <Input
                    id="group-name"
                    placeholder="Enter group name (e.g., Sales Team, Managers)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-description">Description *</Label>
                  <Textarea
                    id="group-description"
                    placeholder="Describe what this group permission is for..."
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateMode(false);
                      setNewGroupName("");
                      setNewGroupDescription("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              </div>
            )}

            {/* Group Permissions List */}
            <ScrollArea className="flex-1 pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading group permissions...
                </div>
              ) : groupPermissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? "No group permissions found" : "No group permissions created yet"}
                </div>
              ) : (
                <div className="space-y-3">
                  {groupPermissions.map((group: GroupPermission) => (
                    <div
                      key={group._id}
                      className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{group.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {group.user_count} {group.user_count === 1 ? "user" : "users"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {group.permissions.length} permissions
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {group.description}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManagePermissions(group)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(group._id, group.name)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-800 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Group Permissions Dialog */}
      <ManageGroupPermissionsDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        group={selectedGroup}
      />
    </>
  );
};

export default GroupPermissionsDialog;