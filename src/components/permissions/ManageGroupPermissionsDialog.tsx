import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { companyServices } from "@/api/services";

interface ManageGroupPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    _id: string;
    name: string;
    description: string;
    permissions: string[];
  } | null;
}

interface Permission {
  _id: string;
  module_name: string;
  internal_name: string;
  description: string;
}

interface GroupedPermission {
  permission_id: string;
  module_name: string;
  internal_name: string;
  description: string;
  enabled: boolean;
}

const ManageGroupPermissionsDialog: React.FC<ManageGroupPermissionsDialogProps> = ({
  open,
  onOpenChange,
  group,
}) => {
  const queryClient = useQueryClient();
  const [groupPermissions, setGroupPermissions] = useState<GroupedPermission[]>([]);

  const { data: availablePermissions } = useQuery({
    queryKey: ["available-permissions"],
    queryFn: () =>
      companyServices.getAvailablePermissions().then((res) => res.data.data),
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      companyServices.updateGroupPermission(id, { permissions }),
    onSuccess: () => {
      toast.success("Group permissions updated successfully");
      queryClient.invalidateQueries({ queryKey: ["group-permissions"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update group permissions"
      );
    },
  });

  useEffect(() => {
    if (group && availablePermissions) {
      const initialPermissions: GroupedPermission[] = availablePermissions.map(
        (permission: Permission) => ({
          permission_id: permission._id,
          module_name: permission.module_name,
          internal_name: permission.internal_name,
          description: permission.description,
          enabled: group.permissions?.includes(permission.internal_name) || false,
        })
      );
      setGroupPermissions(initialPermissions);
    }
  }, [group, availablePermissions]);

  const handlePermissionToggle = (internalName: string, enabled: boolean) => {
    setGroupPermissions((prev) =>
      prev.map((p) =>
        p.internal_name === internalName ? { ...p, enabled } : p
      )
    );
  };

  const handleSave = () => {
    if (!group) return;

    const enabledPermissions = groupPermissions
      .filter((p) => p.enabled)
      .map((p) => p.internal_name);

    updateMutation.mutate({
      id: group._id,
      permissions: enabledPermissions,
    });
  };

  // Group permissions by module
  const groupedPermissions = groupPermissions.reduce((acc, permission) => {
    const module = permission.module_name;
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, GroupedPermission[]>);

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Manage Permissions - {group.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{group.description}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-[55vh] pr-4">
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
                            <Label className="font-medium text-sm">
                              {permission.internal_name}
                            </Label>
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

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageGroupPermissionsDialog;