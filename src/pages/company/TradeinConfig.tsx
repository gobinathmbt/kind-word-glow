import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DeleteConfirmationDialog from "@/components/dialogs/DeleteConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Settings,
  Trash2,
  Eye,
  Save,
  Search,
  Edit,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  configServices,
  dealershipServices,
  dropdownServices,
} from "@/api/services";
import DraggableTradeinSectionsList from "@/components/tradein/DraggableTradeinSectionsList";
import { TradeinPreviewModal } from "@/components/tradein/TradeinPreviewModal";
import ConfigurationSearchmore from "@/components/inspection/ConfigurationSearchmore";
import { Calculator } from "lucide-react";
import CalculationSettingsDialog from "@/components/inspection/CalculationSettingsDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import { useAuth } from "@/auth/AuthContext";

const TradeinConfig = () => {
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isEditConfigDialogOpen, setIsEditConfigDialogOpen] = useState(false);
  const [isEditBasicInfoDialogOpen, setIsEditBasicInfoDialogOpen] =
    useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [editingField, setEditingField] = useState<any>(null);
  const [isCalculationSettingsOpen, setIsCalculationSettingsOpen] =
    useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // DataTable states
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dealershipFilter, setDealershipFilter] = useState("all");

  // Get user info from auth context
  const { completeUser } = useAuth();
  const isPrimaryAdmin = completeUser?.is_primary_admin;
  const userDealerships = completeUser?.dealership_ids || [];

  const [configFormData, setConfigFormData] = useState({
    config_name: "",
    description: "",
    is_active: false,
    dealership_id: isPrimaryAdmin ? "" : userDealerships[0]?._id || "",
  });

  const [editConfigFormData, setEditConfigFormData] = useState({
    config_name: "",
    description: "",
    is_active: false,
    dealership_id: "",
  });

  const [sectionFormData, setSectionFormData] = useState({
    section_name: "",
    description: "",
    is_collapsible: true,
    is_expanded_by_default: false,
  });

  const [fieldFormData, setFieldFormData] = useState({
    field_name: "",
    field_type: "text",
    is_required: false,
    has_image: false,
    has_notes: false,
    placeholder: "",
    help_text: "",
    dropdown_config: {
      dropdown_name: "",
      allow_multiple: false,
    },
  });

  const queryClient = useQueryClient();

  // Function to fetch all configurations when pagination is disabled
  const fetchAllConfigs = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          page: currentPage,
          limit: 100,
          search: searchTerm,
          status: statusFilter !== "all" ? statusFilter : undefined,
        };

        // Add dealership filter if not primary admin and not "all"
        if (!isPrimaryAdmin && dealershipFilter !== "all") {
          params.dealership_id = dealershipFilter;
        }

        const response = await configServices.getTradeinConfigs(params);

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
        pagination: { total_items: allData.length },
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: configsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? [
          "tradein-configs",
          page,
          searchTerm,
          statusFilter,
          dealershipFilter,
          rowsPerPage,
        ]
      : ["all-tradein-configs", searchTerm, statusFilter, dealershipFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllConfigs();
      }

      const params: any = {
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      // Add dealership filter if not primary admin and not "all"
      if (!isPrimaryAdmin && dealershipFilter !== "all") {
        params.dealership_id = dealershipFilter;
      }

      const response = await configServices.getTradeinConfigs(params);
      return response.data;
    },
  });

  const configs = configsData?.data || [];

  // Sort configurations when not using pagination
  const sortedConfigs = React.useMemo(() => {
    if (!sortField) return configs;

    return [...configs].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "dealership_name") {
        aValue = a.dealership_id?.dealership_name || "Primary";
        bValue = b.dealership_id?.dealership_name || "Primary";
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
  }, [configs, sortField, sortOrder]);

  const { data: configDetails } = useQuery({
    queryKey: ["tradein-config-details", selectedConfig?._id],
    queryFn: async () => {
      if (!selectedConfig?._id) return null;
      const response = await configServices.getTradeinConfigDetails(
        selectedConfig._id
      );
      return response.data.data;
    },
    enabled: !!selectedConfig?._id,
  });

  // Fetch available dropdowns
  const { data: dropdowns } = useQuery({
    queryKey: ["dropdowns-for-config"],
    queryFn: async () => {
      const response = await dropdownServices.getDropdowns();
      return response.data.data;
    },
  });

  // Add this function to check if the config has calculation fields
  const hasCalculationFields = (config: any) => {
    return config.sections?.some((section: any) =>
      section.fields?.some(
        (field: any) =>
          field.field_type === "number" ||
          field.field_type === "currency" ||
          field.field_type === "calculation_field" ||
          field.field_type === "mutiplier"
      )
    );
  };

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "currency", label: "Currency" },
    { value: "video", label: "Video" },
    { value: "dropdown", label: "Dropdown" },
    { value: "date", label: "Date" },
    { value: "boolean", label: "Yes/No" },
    { value: "calculation_field", label: "Calculation Field" },
    { value: "mutiplier", label: "Multiply Field" },
  ];

  const deleteConfigMutation = useMutation({
    mutationFn: async ({ configId }: { configId: string }) => {
      return await configServices.deleteTradeinConfig(configId);
    },
    onSuccess: (_, { configId }) => {
      toast.success("Configuration deleted successfully");
      if (selectedConfig?._id === configId) {
        setSelectedConfig(null);
      }
      refetch();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete configuration"
      );
    },
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const { data: dealerships } = useQuery({
    queryKey: ["dealerships-dropdown", completeUser?.is_primary_admin],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();

      if (!completeUser?.is_primary_admin && completeUser?.dealership_ids) {
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

  const getDealershipName = (dealershipId: string) => {
    const dealership = dealerships?.find(
      (dealer: any) => dealer._id === dealershipId
    );
    return dealership ? dealership.dealership_name : "Primary";
  };

  const getSortIcon = (field: any) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Only include dealership_id if user is not primary admin
      const submitData = isPrimaryAdmin
        ? configFormData
        : { ...configFormData, dealership_id: configFormData.dealership_id };

      await configServices.createTradeinConfig(submitData);
      toast.success("Trade-in configuration created successfully");
      setIsConfigDialogOpen(false);
      setConfigFormData({
        config_name: "",
        description: "",
        is_active: false,
        dealership_id: isPrimaryAdmin ? "" : userDealerships[0]?._id || "",
      });
      refetch();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create configuration"
      );
    }
  };

  const handleDeleteConfig = (config: any) => {
    setConfigToDelete(config);
    setIsDeleteDialogOpen(true);
  };

  const handleEditConfigClick = (config: any) => {
    setSelectedConfig(config);
    setIsEditConfigDialogOpen(true);
  };

  const handleEditBasicInfoClick = (config: any) => {
    setSelectedConfig(config);
    setEditConfigFormData({
      config_name: config.config_name,
      description: config.description,
      is_active: config.is_active,
      dealership_id: config.dealership_id?._id || "",
    });
    setIsEditBasicInfoDialogOpen(true);
  };

  const handleEditConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Only include dealership_id if user is not primary admin
      const submitData = isPrimaryAdmin
        ? editConfigFormData
        : {
            ...editConfigFormData,
            dealership_id: editConfigFormData.dealership_id,
          };

      await configServices.updateTradeinConfig(selectedConfig._id, submitData);
      toast.success("Configuration updated successfully");
      setIsEditBasicInfoDialogOpen(false);
      refetch();
      // Update selected config data
      setSelectedConfig({ ...selectedConfig, ...editConfigFormData });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update configuration"
      );
    }
  };

  const confirmDeleteConfig = () => {
    if (configToDelete) {
      deleteConfigMutation.mutate({ configId: configToDelete._id });
      setIsDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configServices.addTradeinSection(
        selectedConfig._id,
        sectionFormData
      );
      toast.success("Section added successfully");
      setIsSectionDialogOpen(false);
      setSectionFormData({
        section_name: "",
        description: "",
        is_collapsible: true,
        is_expanded_by_default: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details", selectedConfig._id],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add section");
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configServices.addTradeinField(
        selectedConfig._id,
        selectedSection.section_id,
        fieldFormData
      );
      toast.success("Field added successfully");
      setIsFieldDialogOpen(false);
      resetFieldForm();
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details", selectedConfig._id],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add field");
    }
  };

  const handleEditField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configServices.updateTradeinField(
        selectedConfig._id,
        editingField.field_id,
        fieldFormData
      );
      toast.success("Field updated successfully");
      setIsFieldDialogOpen(false);
      setEditingField(null);
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details", selectedConfig._id],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update field");
    }
  };

  const handleDeleteField = async (fieldId: string, sectionId: string) => {
    try {
      await configServices.deleteTradeinField(selectedConfig._id, fieldId);
      toast.success("Field deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details", selectedConfig._id],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete field");
    }
  };

  const resetFieldForm = () => {
    setFieldFormData({
      field_name: "",
      field_type: "text",
      is_required: false,
      has_image: false,
      has_notes: false,
      placeholder: "",
      help_text: "",
      dropdown_config: {
        dropdown_name: "",
        allow_multiple: false,
      },
    });
  };

  const openEditFieldDialog = (field: any, section: any) => {
    let dropdownName = "";
    if (field.dropdown_config?.dropdown_id && dropdowns) {
      const dropdown = dropdowns.find(
        (d) => d._id === field.dropdown_config.dropdown_id
      );
      dropdownName = dropdown?.dropdown_name || "";
    }
    setEditingField(field);
    setSelectedSection(section);
    setFieldFormData({
      field_name: field.field_name,
      field_type: field.field_type,
      is_required: field.is_required,
      has_image: field.has_image,
      has_notes: field.has_notes,
      placeholder: field.placeholder || "",
      help_text: field.help_text || "",
      dropdown_config: {
        dropdown_name: dropdownName || "",
        allow_multiple: field.dropdown_config?.allow_multiple || false,
      },
    });
    setIsFieldDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    try {
      await configServices.saveTradeinConfig(selectedConfig._id, configDetails);
      toast.success("Configuration saved successfully");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to save configuration"
      );
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleExport = () => {
    toast.success("Export started");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDealershipFilter("all");
    setPage(1);
    refetch();
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  // Calculate counts for chips
  const totalConfigs = configsData?.pagination?.total_items || 0;
  const activeCount = configs.filter((c: any) => c.is_active).length;
  const inactiveCount = configs.filter((c: any) => !c.is_active).length;
  const sectionsCount = selectedConfig
    ? configDetails?.sections?.length || 0
    : configs.reduce(
        (sum: number, config: any) => sum + (config.sections_count || 0),
        0
      );

  // Calculate dealership-specific counts
  const dealershipCounts = {};
  if (!isPrimaryAdmin && userDealerships.length > 0) {
    userDealerships.forEach((dealership) => {
      dealershipCounts[dealership._id] = configs.filter(
        (c: any) => c.dealership_id?._id === dealership._id
      ).length;
    });
  }

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalConfigs,
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
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
    {
      label: "Total Sections",
      value: sectionsCount,
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
      tooltip: "Export Configurations",
      onClick: handleExport,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Create Configuration",
      onClick: () => setIsConfigDialogOpen(true),
      className:
        "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: "Import Configurations",
      onClick: () => toast.info("Import feature coming soon"),
      className:
        "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  const STATUS_FILTER_OPTIONS = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("config_name")}
      >
        <div className="flex items-center">
          Configuration Name
          {getSortIcon("config_name")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Description</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("sections_count")}
      >
        <div className="flex items-center">
          Sections
          {getSortIcon("sections_count")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("dealership_name")}
      >
        <div className="flex items-center">
          Dealership
          {getSortIcon("dealership_name")}
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
        onClick={() => handleSort("created_at")}
      >
        <div className="flex items-center">
          Created
          {getSortIcon("created_at")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedConfigs.map((config: any, index: number) => (
        <TableRow
          key={config._id}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => handleEditConfigClick(config)}
        >
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{config.config_name}</p>
            </div>
          </TableCell>
          <TableCell>
            <p className="text-sm text-muted-foreground">
              {config.description || "No description"}
            </p>
          </TableCell>
          <TableCell>
            <Badge variant="outline">
              {config.sections_count || 0} sections
            </Badge>
          </TableCell>
          <TableCell>
            <Badge className="bg-orange-500 text-white hover:bg-orange-600">
              {getDealershipName(config.dealership_id)}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant={config.is_active ? "default" : "secondary"}
              className={
                config.is_active
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }
            >
              {config.is_active ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell>
            <p className="text-sm text-muted-foreground">
              {new Date(config.created_at).toLocaleDateString()}
            </p>
          </TableCell>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditConfigClick(config)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                title="Configure Sections & Fields"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditBasicInfoClick(config)}
                className="text-green-600 hover:text-green-800 hover:bg-green-100"
                title="Edit Basic Info"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteConfig(config)}
                className="text-red-600 hover:text-red-800 hover:bg-red-100"
                title="Delete Configuration"
              >
                <Trash2 className="h-4 w-4" />
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
        title="Trade-in Configuration"
        data={sortedConfigs}
        isLoading={isLoading}
        totalCount={configsData?.pagination?.total_items || 0}
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
        cookieName="tradeinconfig_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {/* Create Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Trade-in Configuration</DialogTitle>
            <DialogDescription>
              Create a new configuration template for vehicle trade-in
              evaluations
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateConfig} className="space-y-6">
            {/* Show dealership dropdown for non-primary admins */}
            {!isPrimaryAdmin && userDealerships.length > 0 && (
              <div>
                <Label htmlFor="dealership_id">Dealership</Label>
                <Select
                  value={configFormData.dealership_id}
                  onValueChange={(value) =>
                    setConfigFormData({
                      ...configFormData,
                      dealership_id: value,
                    })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dealership" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDealerships.map((dealership) => (
                      <SelectItem key={dealership._id} value={dealership._id}>
                        {dealership.dealership_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="config_name">Configuration Name</Label>
              <Input
                id="config_name"
                value={configFormData.config_name}
                onChange={(e) =>
                  setConfigFormData({
                    ...configFormData,
                    config_name: e.target.value,
                  })
                }
                placeholder="Standard Trade-in v1.0"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={configFormData.description}
                onChange={(e) =>
                  setConfigFormData({
                    ...configFormData,
                    description: e.target.value,
                  })
                }
                placeholder="Standard vehicle trade-in evaluation configuration"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={configFormData.is_active}
                onCheckedChange={(checked) =>
                  setConfigFormData({
                    ...configFormData,
                    is_active: checked as boolean,
                  })
                }
              />
              <Label htmlFor="is_active">Make this configuration active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfigDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Configuration</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Basic Info Dialog */}
      <Dialog
        open={isEditBasicInfoDialogOpen}
        onOpenChange={setIsEditBasicInfoDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Configuration Info</DialogTitle>
            <DialogDescription>
              Update the basic configuration details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditConfig} className="space-y-4">
            {/* Show dealership dropdown for non-primary admins */}
            {!isPrimaryAdmin && userDealerships.length > 0 && (
              <div>
                <Label htmlFor="edit_dealership_id">Dealership</Label>
                <Select
                  value={editConfigFormData.dealership_id}
                  onValueChange={(value) =>
                    setEditConfigFormData({
                      ...editConfigFormData,
                      dealership_id: value,
                    })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dealership" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDealerships.map((dealership) => (
                      <SelectItem key={dealership._id} value={dealership._id}>
                        {dealership.dealership_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="edit_config_name">Configuration Name</Label>
              <Input
                id="edit_config_name"
                value={editConfigFormData.config_name}
                onChange={(e) =>
                  setEditConfigFormData({
                    ...editConfigFormData,
                    config_name: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Input
                id="edit_description"
                value={editConfigFormData.description}
                onChange={(e) =>
                  setEditConfigFormData({
                    ...editConfigFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_active"
                checked={editConfigFormData.is_active}
                onCheckedChange={(checked) =>
                  setEditConfigFormData({
                    ...editConfigFormData,
                    is_active: checked as boolean,
                  })
                }
              />
              <Label htmlFor="edit_is_active">Active Configuration</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditBasicInfoDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search and Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search & Filter</DialogTitle>
            <DialogDescription>
              Search and filter trade-in configurations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search configurations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Status Filter</Label>
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
            {/* Dealership filter for non-primary admins */}
            {!isPrimaryAdmin && userDealerships.length > 0 && (
              <div>
                <Label htmlFor="dealership-filter">Dealership Filter</Label>
                <Select
                  value={dealershipFilter}
                  onValueChange={setDealershipFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by dealership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dealerships</SelectItem>
                    {userDealerships.map((dealership) => (
                      <SelectItem key={dealership._id} value={dealership._id}>
                        {dealership.dealership_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button onClick={() => setIsFilterDialogOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rest of the dialogs remain the same */}
      <Dialog
        open={isEditConfigDialogOpen}
        onOpenChange={setIsEditConfigDialogOpen}
      >
        <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl">
                    Edit Configuration: {selectedConfig?.config_name}
                  </DialogTitle>
                  <DialogDescription>
                    Configure sections and fields for trade-in evaluation
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditConfigDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col overflow-y-auto max-h-[90vh] p-6">
              {configDetails ? (
                <div>
                  <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div className="flex space-x-2">
                      <Dialog
                        open={isSectionDialogOpen}
                        onOpenChange={setIsSectionDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Section
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Section</DialogTitle>
                            <DialogDescription>
                              Create a new section for the configuration
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            onSubmit={handleAddSection}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="section_name">Section Name</Label>
                              <Input
                                id="section_name"
                                value={sectionFormData.section_name}
                                onChange={(e) =>
                                  setSectionFormData({
                                    ...sectionFormData,
                                    section_name: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="section_description">
                                Description
                              </Label>
                              <Input
                                id="section_description"
                                value={sectionFormData.description}
                                onChange={(e) =>
                                  setSectionFormData({
                                    ...sectionFormData,
                                    description: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="is_collapsible"
                                  checked={sectionFormData.is_collapsible}
                                  onCheckedChange={(checked) =>
                                    setSectionFormData({
                                      ...sectionFormData,
                                      is_collapsible: checked as boolean,
                                    })
                                  }
                                />
                                <Label htmlFor="is_collapsible">
                                  Collapsible Section
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="is_expanded_by_default"
                                  checked={
                                    sectionFormData.is_expanded_by_default
                                  }
                                  onCheckedChange={(checked) =>
                                    setSectionFormData({
                                      ...sectionFormData,
                                      is_expanded_by_default:
                                        checked as boolean,
                                    })
                                  }
                                />
                                <Label htmlFor="is_expanded_by_default">
                                  Expanded by Default
                                </Label>
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsSectionDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">Add Section</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        onClick={() => setIsPreviewOpen(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>

                      {hasCalculationFields(configDetails) && (
                        <Button
                          variant="outline"
                          onClick={() => setIsCalculationSettingsOpen(true)}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculation Settings
                        </Button>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditBasicInfoDialogOpen(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Info
                      </Button>
                      <Button onClick={handleSaveChanges}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2">
                    <DraggableTradeinSectionsList
                      sections={configDetails.sections.sort(
                        (a: any, b: any) =>
                          (a.display_order || 0) - (b.display_order || 0)
                      )}
                      selectedConfig={selectedConfig}
                      onAddField={(section) => {
                        setSelectedSection(section);
                        setEditingField(null);
                        resetFieldForm();
                        setIsFieldDialogOpen(true);
                      }}
                      onEditField={openEditFieldDialog}
                      onDeleteField={handleDeleteField}
                      dropdowns={dropdowns}
                    />
                  </div>
                </div>
              ) : (
                <div>Loading configuration details...</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Field" : "Add New Field"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Update the field configuration"
                : "Add a new field to the section"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editingField ? handleEditField : handleAddField}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="field_name">Field Name</Label>
              <Input
                id="field_name"
                value={fieldFormData.field_name}
                onChange={(e) =>
                  setFieldFormData({
                    ...fieldFormData,
                    field_name: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="field_type">Field Type</Label>
              <Select
                value={fieldFormData.field_type}
                onValueChange={(value) =>
                  setFieldFormData({
                    ...fieldFormData,
                    field_type: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fieldFormData.field_type === "dropdown" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium">Dropdown Configuration</h4>
                <div>
                  <Label htmlFor="dropdown_name">Select Dropdown</Label>
                  <Select
                    value={fieldFormData.dropdown_config.dropdown_name}
                    onValueChange={(value) =>
                      setFieldFormData({
                        ...fieldFormData,
                        dropdown_config: {
                          ...fieldFormData.dropdown_config,
                          dropdown_name: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a dropdown" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdowns?.map((dropdown: any) => (
                        <SelectItem
                          key={dropdown._id}
                          value={dropdown.dropdown_name}
                        >
                          {dropdown.display_name} ({dropdown.dropdown_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow_multiple_dropdown"
                    checked={fieldFormData.dropdown_config.allow_multiple}
                    onCheckedChange={(checked) =>
                      setFieldFormData({
                        ...fieldFormData,
                        dropdown_config: {
                          ...fieldFormData.dropdown_config,
                          allow_multiple: checked === true,
                        },
                      })
                    }
                  />
                  <Label htmlFor="allow_multiple_dropdown">
                    Allow multiple selections
                  </Label>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_required"
                  checked={fieldFormData.is_required}
                  onCheckedChange={(checked) =>
                    setFieldFormData({
                      ...fieldFormData,
                      is_required: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="is_required">Required Field</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_image"
                  checked={fieldFormData.has_image}
                  onCheckedChange={(checked) =>
                    setFieldFormData({
                      ...fieldFormData,
                      has_image: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="has_image">Allow Image Upload</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_notes"
                  checked={fieldFormData.has_notes}
                  onCheckedChange={(checked) =>
                    setFieldFormData({
                      ...fieldFormData,
                      has_notes: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="has_notes">Allow Notes</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={fieldFormData.placeholder}
                onChange={(e) =>
                  setFieldFormData({
                    ...fieldFormData,
                    placeholder: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="help_text">Help Text</Label>
              <Input
                id="help_text"
                value={fieldFormData.help_text}
                onChange={(e) =>
                  setFieldFormData({
                    ...fieldFormData,
                    help_text: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFieldDialogOpen(false);
                  setEditingField(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingField ? "Update Field" : "Add Field"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <TradeinPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        config={configDetails}
        dropdowns={dropdowns}
      />

      {selectedConfig && configDetails && (
        <CalculationSettingsDialog
          isOpen={isCalculationSettingsOpen}
          onClose={() => setIsCalculationSettingsOpen(false)}
          configId={selectedConfig._id}
          categoryId=""
          category={configDetails}
          configType="tradein"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setConfigToDelete(null);
        }}
        onConfirm={confirmDeleteConfig}
        title="Delete Configuration"
        description={`Are you sure you want to delete the configuration "${configToDelete?.config_name}"? This action cannot be undone.`}
      />

      <ConfigurationSearchmore
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        onClear={handleClearFilters}
        isLoading={isLoading}
        isOpen={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterLabel="Status"
      />
    </>
  );
};

export default TradeinConfig;
