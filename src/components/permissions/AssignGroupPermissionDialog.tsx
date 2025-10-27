import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { companyServices } from "@/api/services";

interface AssignGroupPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    group_permissions?: any;
  } | null;
}

interface GroupPermission {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
}

const AssignGroupPermissionDialog: React.FC<AssignGroupPermissionDialogProps> = ({
  open,
  onOpenChange,
  user,
}) => {
    
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const { data: groupPermissionsData, isLoading } = useQuery({
    queryKey: ["group-permissions"],
    queryFn: () =>
      companyServices.getGroupPermissions().then((res) => res.data),
    enabled: open,
  });

  useEffect(() => {
    if (user?.group_permissions) {
      setSelectedGroupId(user.group_permissions?._id);
    } else {
      setSelectedGroupId("");
    }
  }, [user]);

  const assignMutation = useMutation({
    mutationFn: ({
      userId,
      groupId,
    }: {
      userId: string;
      groupId: string | null;
    }) =>
      companyServices.assignGroupPermissionToUser(userId, {
        group_permission_id: groupId,
      }),
    onSuccess: () => {
      toast.success("Group permission assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["company-users-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-company-users-permissions"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to assign group permission"
      );
    },
  });

  const handleAssign = () => {
    if (!user) return;

    const groupId = selectedGroupId === "" ? null : selectedGroupId;
    assignMutation.mutate({ userId: user._id, groupId });
  };

  const groupPermissions = groupPermissionsData?.data || [];

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Group Permission
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {user.first_name} {user.last_name} ({user.email})
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-[45vh] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading group permissions...
              </div>
            ) : groupPermissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No group permissions available. Please create one first.
              </div>
            ) : (
              <RadioGroup value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <div className="space-y-3">
                  {/* None Option */}
                  <div
                    className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroupId === ""
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => setSelectedGroupId("")}
                  >
                    <RadioGroupItem value="" id="none" className="mt-1" />
                    <div className="flex-1">
                      <Label
                        htmlFor="none"
                        className="font-medium cursor-pointer"
                      >
                        None (No Group Permission)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        User will only have individually assigned permissions
                      </p>
                    </div>
                  </div>

                  {/* Group Options */}
                  {groupPermissions.map((group: GroupPermission) => (
                    <div
                      key={group._id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedGroupId === group._id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => setSelectedGroupId(group._id)}
                    >
                      <RadioGroupItem
                        value={group._id}
                        id={group._id}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Label
                            htmlFor={group._id}
                            className="font-medium text-base cursor-pointer"
                          >
                            {group.name}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            {group.permissions.length} permissions
                          </Badge>
                          {user.group_permissions === group._id && (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assignMutation.isPending || groupPermissions.length === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            {assignMutation.isPending ? "Assigning..." : "Assign Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignGroupPermissionDialog;