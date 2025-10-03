import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { companyServices } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";

interface ModuleAccess {
  module_name: string;
  display_name: string;
  enabled: boolean;
}

interface User {
  _id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  module_access?: string[];
}

interface ManageModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

const ManageModuleDialog: React.FC<ManageModuleDialogProps> = ({
  open,
  onOpenChange,
  user,
}) => {
  const queryClient = useQueryClient();
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([]);
  const { completeUser } = useAuth();

  // Determine if we need to fetch master dropdown data
  const shouldFetchMasterDropdown = useMemo(() => 
    open && user?.role === "company_admin", 
    [open, user?.role]
  );

  // Fetch master dropdown modules for company_admin role
  const { data: dropdownsData, isLoading: isLoadingDropdowns } = useQuery({
    queryKey: ["master-modules-for-permissions"],
    queryFn: () =>
      companyServices
        .getMasterdropdownvalues({
          dropdown_name: ["company_admin"],
        })
        .then((res) => res.data),
    enabled: shouldFetchMasterDropdown,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: userModules, isLoading: isLoadingUserModules } = useQuery({
    queryKey: ["user-modules", user?._id],
    queryFn: () =>
      user
        ? companyServices.getUserModules(user._id).then((res) => res.data.data)
        : Promise.resolve([]),
    enabled: !!user && open,
  });

  // Helper function to format module names for display
  const formatModuleName = useCallback((moduleName: string): string => {
    return moduleName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, []);

  // Get available modules based on user role
  const availableModules = useMemo(() => {
    if (!user) return [];
    
    if (user.role === "company_super_admin") {
      // For super admin, use all company modules
      return (completeUser?.company_id?.module_access || []).map((module: string) => ({
        module_name: module,
        display_name: formatModuleName(module),
      }));
    } else if (user.role === "company_admin") {
      // For company admin, filter modules based on company's module_access
      if (!dropdownsData || !completeUser?.company_id?.module_access) return [];
      
      const companyAdminDropdown = dropdownsData?.data?.find(
        (dropdown: any) => dropdown.dropdown_name === "company_admin"
      );
      
      if (!companyAdminDropdown) return [];
      
      // Filter modules that exist in both dropdown and company's module_access
      return companyAdminDropdown.values
        .filter((module: any) =>
          completeUser.company_id.module_access.includes(module.option_value)
        )
        .map((module: any) => ({
          module_name: module.option_value,
          display_name: formatModuleName(module.option_value),
        }));
    }
    
    return [];
  }, [dropdownsData, completeUser?.company_id?.module_access, user, formatModuleName]);

  // Initialize module access when data is available
  useEffect(() => {
    if (availableModules.length > 0 && user) {
      const initialModules = availableModules.map((module: any) => ({
        module_name: module.module_name,
        display_name: module.display_name,
        enabled: userModules?.includes(module.module_name) || false,
      }));
      setModuleAccess(initialModules);
    } else {
      setModuleAccess([]);
    }
  }, [availableModules, userModules, user]);

  const updateModulesMutation = useMutation({
    mutationFn: ({ userId, modules }: { userId: string; modules: string[] }) =>
      companyServices.updateUserModules(userId, { modules }),
    onSuccess: () => {
      toast.success("User module access updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["company-users-permissions"],
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update module access"
      );
    },
  });

  const handleModuleToggle = useCallback((moduleName: string, enabled: boolean) => {
    setModuleAccess((prev) =>
      prev.map((module) =>
        module.module_name === moduleName ? { ...module, enabled } : module
      )
    );
  }, []);

  const handleSaveModules = useCallback(() => {
    if (!user) return;

    const enabledModules = moduleAccess
      .filter((module) => module.enabled)
      .map((module) => module.module_name);

    updateModulesMutation.mutate({
      userId: user._id,
      modules: enabledModules,
    });
  }, [user, moduleAccess, updateModulesMutation]);

  if (!user) return null;

  const isLoading = isLoadingDropdowns || isLoadingUserModules;
  const isSaveDisabled = updateModulesMutation.isPending || moduleAccess.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Module Access - {user.first_name} {user.last_name}
            <span className="text-sm text-muted-foreground block mt-1">
              Role: {user.role}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4">
                {moduleAccess.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No modules available for this user's role
                  </div>
                ) : (
                  moduleAccess.map((module) => (
                    <div
                      key={module.module_name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <Label className="font-medium text-sm">
                          {module.display_name}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {module.module_name}
                        </p>
                      </div>
                      <Switch
                        checked={module.enabled}
                        onCheckedChange={(checked) =>
                          handleModuleToggle(module.module_name, checked)
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={updateModulesMutation.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSaveModules}
            disabled={isSaveDisabled}
          >
            {updateModulesMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {updateModulesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(ManageModuleDialog);