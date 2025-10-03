import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterServices } from "@/api/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Clock,
  Settings,
  Globe,
  Wrench,
  CalendarDays,
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  RefreshCw,
  Edit,
  Eye,
  Save,
} from "lucide-react";
import DataTableLayout from "@/components/common/DataTableLayout";

interface MaintenanceModule {
  module_name: string;
  is_enabled: boolean;
  message?: string;
  end_time?: string;
}

interface MaintenanceSettings {
  is_enabled: boolean;
  message: string;
  end_time?: string;
  modules: MaintenanceModule[];
}

interface ModuleOption {
  option_value: string;
  display_value: string;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  created_by: string;
  _id: string;
  created_at: string;
  updated_at: string;
}

interface MaintenanceTableRow {
  id: string;
  type: "global" | "module";
  name: string;
  is_enabled: boolean;
  message: string;
  end_time?: string;
  module_name?: string;
  created_at: string;
}

const WebsiteMaintenance = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Table state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Module state
  const [availableModules, setAvailableModules] = useState<ModuleOption[]>([]);
  const [modulesList, setModulesList] = useState<{value: string, label: string}[]>([]);

  // Maintenance settings state
  const [settings, setSettings] = useState<MaintenanceSettings>({
    is_enabled: false,
    message: "We are currently performing maintenance on our website. Please check back later.",
    end_time: "",
    modules: [],
  });

  // Edit dialog state
  const [editItem, setEditItem] = useState<MaintenanceTableRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Load available modules
  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await masterServices.getMasterdropdownvalues({
          dropdown_name: ["company_superadmin_modules"],
        });
        if (response.data.success) {
          const modules = response.data.data[0].values || [];
          setAvailableModules(modules);
          
          const formattedModules = modules.map((module: ModuleOption) => ({
            value: module.option_value,
            label: module.display_value
          }));
          
          setModulesList(formattedModules);
        }
      } catch (error) {
        console.error("Failed to load modules:", error);
        toast({
          title: "Error",
          description: "Failed to load available modules",
          variant: "destructive",
        });
      }
    };
    loadModules();
  }, []);

  // Fetch maintenance settings
  const { data: maintenanceData, isLoading, refetch } = useQuery({
    queryKey: ["maintenance-settings"],
    queryFn: async () => {
      const response = await masterServices.getMaintenanceSettings();
      return response.data.data;
    },
  });

  // Update maintenance settings
  const updateMaintenanceMutation = useMutation({
    mutationFn: (data: MaintenanceSettings) =>
      masterServices.updateMaintenanceSettings(data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["maintenance-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update maintenance settings",
        variant: "destructive",
      });
    },
  });

  // Update settings when data is loaded
  useEffect(() => {
    if (maintenanceData) {
      setSettings({
        ...maintenanceData,
        end_time: maintenanceData.end_time
          ? new Date(maintenanceData.end_time).toISOString().slice(0, 16)
          : "",
        modules: maintenanceData.modules || [],
      });
    }
  }, [maintenanceData]);

  // Transform data for table display
  const transformedData: MaintenanceTableRow[] = React.useMemo(() => {
    const data: MaintenanceTableRow[] = [];

    // Add global maintenance row
    data.push({
      id: "global",
      type: "global",
      name: "Global Website Maintenance",
      is_enabled: settings.is_enabled,
      message: settings.message,
      end_time: settings.end_time,
      created_at: new Date().toISOString(),
    });

    // Add module rows - include all modules, even if not configured
    modulesList.forEach((module) => {
      const moduleSettings = settings.modules.find(m => m.module_name === module.value);
      data.push({
        id: module.value,
        type: "module",
        name: module.label,
        is_enabled: moduleSettings?.is_enabled || false,
        message: moduleSettings?.message || `The ${module.label} module is currently under maintenance.`,
        end_time: moduleSettings?.end_time,
        module_name: module.value,
        created_at: new Date().toISOString(),
      });
    });

    return data;
  }, [settings, modulesList]);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = transformedData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        item.message?.toLowerCase().includes(searchTerm?.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(item =>
        statusFilter === "active" ? item.is_enabled : !item.is_enabled
      );
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue = a[sortField as keyof MaintenanceTableRow];
        let bValue = b[sortField as keyof MaintenanceTableRow];

        if (typeof aValue === "string") {
          aValue = aValue?.toLowerCase();
          bValue = (bValue as string)?.toLowerCase();
        }

        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  }, [transformedData, searchTerm, statusFilter, typeFilter, sortField, sortOrder]);

  // Pagination
  const paginatedData = React.useMemo(() => {
    if (!paginationEnabled) return filteredAndSortedData;
    const start = (page - 1) * rowsPerPage;
    return filteredAndSortedData.slice(start, start + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage, paginationEnabled]);

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
    return sortOrder === "asc" ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const handleToggleStatus = (item: MaintenanceTableRow) => {
    if (item.type === "global") {
      setSettings(prev => ({
        ...prev,
        is_enabled: !prev.is_enabled,
      }));
    } else {
      const enabled = !item.is_enabled;
      setSettings(prev => ({
        ...prev,
        modules: enabled
          ? [
              ...prev.modules.filter(m => m.module_name !== item.module_name),
              {
                module_name: item.module_name!,
                is_enabled: true,
                message: item.message,
                end_time: item.end_time,
              },
            ]
          : prev.modules.filter(m => m.module_name !== item.module_name),
      }));
    }
  };

  const handleEdit = (item: MaintenanceTableRow) => {
    setEditItem(item);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editItem) return;

    if (editItem.type === "global") {
      setSettings(prev => ({
        ...prev,
        message: editItem.message,
        end_time: editItem.end_time || "",
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        modules: prev.modules.some(m => m.module_name === editItem.module_name)
          ? prev.modules.map(m =>
              m.module_name === editItem.module_name
                ? { ...m, message: editItem.message, end_time: editItem.end_time }
                : m
            )
          : [
              ...prev.modules,
              {
                module_name: editItem.module_name!,
                is_enabled: editItem.is_enabled,
                message: editItem.message,
                end_time: editItem.end_time,
              },
            ],
      }));
    }

    setIsEditDialogOpen(false);
    setEditItem(null);
  };

  const handleSaveAll = () => {
    const formattedSettings = {
      ...settings,
      end_time: settings.end_time ? new Date(settings.end_time).toISOString() : undefined,
      modules: settings.modules.map(module => ({
        ...module,
        end_time: module.end_time ? new Date(module.end_time).toISOString() : undefined,
      })),
    };
    updateMaintenanceMutation.mutate(formattedSettings);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
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
    toast({
      title: "Success",
      description: "Data refreshed",
    });
  };

  const getTimeRemaining = (endTime: string) => {
    if (!endTime) return null;
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }

    return `${hours}h ${minutes}m remaining`;
  };

  // Calculate stats
  const totalCount = filteredAndSortedData.length;
  const activeCount = filteredAndSortedData.filter(item => item.is_enabled).length;
  const inactiveCount = totalCount - activeCount;
  const globalActive = settings.is_enabled ? 1 : 0;
  const moduleActive = settings.modules.filter(m => m.is_enabled).length;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalCount,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
    },
    {
      label: "Active",
      value: activeCount,
      variant: "destructive" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      variant: "secondary" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
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
      icon: <Save className="h-4 w-4" />,
      tooltip: "Save All Changes",
      onClick: handleSaveAll,
      disabled: updateMaintenanceMutation.isPending,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Download className="h-4 w-4" />,
      tooltip: "Export Settings",
      onClick: () => toast({ title: "Info", description: "Export feature coming soon" }),
      className: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("type")}
      >
        <div className="flex items-center">
          Type
          {getSortIcon("type")}
        </div>
      </TableHead>
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
        onClick={() => handleSort("is_enabled")}
      >
        <div className="flex items-center">
          Status
          {getSortIcon("is_enabled")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Message</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("end_time")}
      >
        <div className="flex items-center">
          End Time
          {getSortIcon("end_time")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {paginatedData.map((item, index) => (
        <TableRow key={item.id}>
          <TableCell>
            {paginationEnabled ? (page - 1) * rowsPerPage + index + 1 : index + 1}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {item.type === "global" ? <Globe className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
              <Badge variant={item.type === "global" ? "default" : "outline"}>
                {item.type === "global" ? "Global" : "Module"}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{item.name}</p>
              {item.module_name && (
                <p className="text-sm text-muted-foreground">
                  Module: {item.module_name}
                </p>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={item.is_enabled}
                onCheckedChange={() => handleToggleStatus(item)}
              />
              <Badge variant={item.is_enabled ? "destructive" : "secondary"}>
                {item.is_enabled ? "Active" : "Inactive"}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <div className="max-w-xs">
              <p className="truncate" title={item.message}>
                {item.message}
              </p>
            </div>
          </TableCell>
          <TableCell>
            {item.end_time ? (
              <div className="text-sm">
                <p>{new Date(item.end_time).toLocaleString()}</p>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{getTimeRemaining(item.end_time)}</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Not set</span>
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(item)}
                title="Edit Settings"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="Website Maintenance"
        data={paginatedData}
        isLoading={isLoading}
        totalCount={filteredAndSortedData.length}
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
            <DialogTitle>Search & Filter Maintenance</DialogTitle>
            <DialogDescription>
              Search and filter maintenance settings by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <ShadcnSelect value={statusFilter} onValueChange={setStatusFilter}>
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
            <div>
              <Label htmlFor="type">Type Filter</Label>
              <ShadcnSelect value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="module">Module</SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button
                onClick={() => {
                  setPage(1);
                  setIsFilterDialogOpen(false);
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Settings</DialogTitle>
            <DialogDescription>
              Update maintenance message and end time for {editItem?.name}
            </DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-message">Maintenance Message</Label>
                <Textarea
                  id="edit-message"
                  value={editItem.message}
                  onChange={(e) =>
                    setEditItem(prev => prev ? { ...prev, message: e.target.value } : null)
                  }
                  placeholder="Enter maintenance message..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-end-time">End Time (Optional)</Label>
                <Input
                  id="edit-end-time"
                  type="datetime-local"
                  value={editItem.end_time || ""}
                  onChange={(e) =>
                    setEditItem(prev => prev ? { ...prev, end_time: e.target.value } : null)
                  }
                />
                {editItem.end_time && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{getTimeRemaining(editItem.end_time)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WebsiteMaintenance;