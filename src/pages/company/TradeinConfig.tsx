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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  configServices,
  dealershipServices,
  dropdownServices,
} from "@/api/services";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import DraggableTradeinSectionsList from "@/components/tradein/DraggableTradeinSectionsList";
import AddTradeinCategoryDialog from "@/components/tradein/AddTradeincategoryDialog";
import EditTradeinCategoryDialog from "@/components/tradein/EditTradeinCategoryDialog";
import { TradeinPreviewModal } from "@/components/tradein/TradeinPreviewModal";
import ConfigurationSearchmore from "@/components/inspection/ConfigurationSearchmore";
import { Calculator } from "lucide-react";
import CalculationSettingsDialog from "@/components/inspection/CalculationSettingsDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import { useAuth } from "@/auth/AuthContext";
import { formatApiNames } from "@/utils/GlobalUtils";
import TradeinFieldEditDialog from "@/components/tradein/TradeinFieldEditDialog";

const TradeinConfig = () => {
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFieldEditDialogOpen, setIsFieldEditDialogOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<any>(null);
  const [fieldToDelete, setFieldToDelete] = useState<any>(null);
  const [isFieldDeleteDialogOpen, setIsFieldDeleteDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [configToDelete, setConfigToDelete] = useState<any>(null);
  const [configToEdit, setConfigToEdit] = useState<any>(null);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);
  const [isCalculationSettingsOpen, setIsCalculationSettingsOpen] = useState(false);
  const [selectedCategoryForCalculations, setSelectedCategoryForCalculations] = useState<any>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<any>(null);

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

  const [editFormData, setEditFormData] = useState({
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

  const { data: selectedConfigDetails, isLoading: detailsLoading, error: detailsError } = useQuery({
    queryKey: ["tradein-config-details", selectedConfig?._id],
    queryFn: async () => {
      if (!selectedConfig?._id) return null;
      const response = await configServices.getTradeinConfigDetails(
        selectedConfig._id
      );
      console.log("Config Details API Response:", response.data); // Debug log
      return response.data.data;
    },
    enabled: !!selectedConfig?._id,
  });

  // Debug the selected config details
  React.useEffect(() => {
    if (selectedConfigDetails) {
      console.log("Selected Config Details Loaded:", selectedConfigDetails);
      console.log("Categories:", selectedConfigDetails.categories);
      if (selectedConfigDetails.categories) {
        selectedConfigDetails.categories.forEach((category: any, index: number) => {
          console.log(`Category ${index}:`, category.category_name, "Sections:", category.sections?.length);
          if (category.sections) {
            category.sections.forEach((section: any, secIndex: number) => {
              console.log(`  Section ${secIndex}:`, section.section_name, "Fields:", section.fields?.length);
            });
          }
        });
      }
    }
  }, [selectedConfigDetails]);

  // Fetch available dropdowns
  const { data: dropdowns } = useQuery({
    queryKey: ["dropdowns-for-config"],
    queryFn: async () => {
      const response = await dropdownServices.getDropdowns();
      return response.data.data;
    },
  });

  // Add this function to check if the config has calculation fields
  const hasCalculationFields = (category: any) => {
    return category.sections?.some((section: any) =>
      section.fields?.some(
        (field: any) =>
          field.field_type === "number" ||
          field.field_type === "currency" ||
          field.field_type === "calculation_field" ||
          field.field_type === "multiplier"
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
    { value: "multiplier", label: "Multiply Field" },
  ];

  // Mutations following inspection pattern
  const updateCategoryMutation = useMutation({
    mutationFn: ({
      configId,
      categoryId,
      categoryData,
    }: {
      configId: string;
      categoryId: string;
      categoryData: any;
    }) =>
      configServices.updateTradeinCategory(
        configId,
        categoryId,
        categoryData
      ),
    onSuccess: () => {
      toast.success("Category updated successfully");
      setIsEditCategoryDialogOpen(false);
      setCategoryToEdit(null);
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update category");
    },
  });

  const toggleCategoryStatusMutation = useMutation({
    mutationFn: ({
      configId,
      categoryId,
      isActive,
    }: {
      configId: string;
      categoryId: string;
      isActive: boolean;
    }) =>
      configServices.toggleTradeinCategoryStatus(
        configId,
        categoryId,
        isActive
      ),
    onSuccess: () => {
      toast.success("Category status updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update category status"
      );
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: ({
      configId,
      categoryData,
    }: {
      configId: string;
      categoryData: any;
    }) => configServices.addTradeinCategory(configId, categoryData),
    onSuccess: () => {
      toast.success("Category added successfully");
      setIsAddCategoryDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add category");
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: configServices.createTradeinConfig,
    onSuccess: () => {
      toast.success("Configuration created successfully");
      setIsConfigDialogOpen(false);
      setConfigFormData({
        config_name: "",
        description: "",
        is_active: false,
        dealership_id: isPrimaryAdmin ? "" : userDealerships[0]?._id || "",
      });
      refetch();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create configuration"
      );
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      configServices.updateTradeinConfig(id, data),
    onSuccess: () => {
      toast.success("Configuration updated successfully");
      setIsEditDialogOpen(false);
      setConfigToEdit(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update configuration"
      );
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: ({
      configId,
      fieldId,
    }: {
      configId: string;
      fieldId: string;
    }) => configServices.deleteTradeinField(configId, fieldId),
    onSuccess: () => {
      toast.success("Field deleted successfully");
      setIsFieldDeleteDialogOpen(false);
      setFieldToDelete(null);
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete field");
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      configServices.updateTradeinConfig(id, data),
    onSuccess: () => {
      toast.success("Configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["tradein-configs"] });
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to save configuration"
      );
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: configServices.deleteTradeinConfig,
    onSuccess: () => {
      toast.success("Configuration deleted successfully");
      setIsDeleteDialogOpen(false);
      setConfigToDelete(null);
      if (selectedConfig && selectedConfig._id === configToDelete?._id) {
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

  const deleteSectionMutation = useMutation({
    mutationFn: ({
      configId,
      sectionId,
    }: {
      configId: string;
      sectionId: string;
    }) => configServices.deleteTradeinSection(configId, sectionId),
    onSuccess: () => {
      toast.success("Section deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete section");
    },
  });

  const updateSectionsOrderMutation = useMutation({
    mutationFn: ({
      configId,
      categoryId,
      sections,
    }: {
      configId: string;
      categoryId: string;
      sections: any[];
    }) =>
      configServices.updateTradeinSectionsOrder(configId, categoryId, { sections }),
    onSuccess: () => {
      toast.success("Section order updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update section order"
      );
    },
  });

  const updateFieldsOrderMutation = useMutation({
    mutationFn: ({
      configId,
      sectionId,
      fields,
    }: {
      configId: string;
      sectionId: string;
      fields: any[];
    }) => configServices.updateTradeinFieldsOrder(configId, sectionId, { fields }),
    onSuccess: () => {
      toast.success("Field order updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update field order"
      );
    },
  });

  const addSectionMutation = useMutation({
  mutationFn: ({
    configId,
    categoryId,
    data,
  }: {
    configId: string;
    categoryId: string;
    data: any;
  }) => configServices.addTradeinSection(configId, categoryId, data),
  onSuccess: () => {
    toast.success("Section added successfully");
    setIsSectionDialogOpen(false);
    setSectionFormData({
      section_name: "",
      description: "",
      is_collapsible: true,
      is_expanded_by_default: false,
    });
    queryClient.invalidateQueries({
      queryKey: ["tradein-config-details"],
    });
  },
  onError: (error: any) => {
    const errorMessage = error.response?.data?.message 
      || error.response?.data?.error 
      || "Failed to add section";
    toast.error(errorMessage);
    console.error("Add section error:", error.response?.data);
  },
});

  const addFieldMutation = useMutation({
    mutationFn: ({
      configId,
      sectionId,
      data,
    }: {
      configId: string;
      sectionId: string;
      data: any;
    }) => configServices.addTradeinField(configId, sectionId, data),
    onSuccess: () => {
      toast.success("Field added successfully");
      setIsFieldDialogOpen(false);
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
      queryClient.invalidateQueries({
        queryKey: ["tradein-config-details"],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add field");
    },
  });

  // Fixed: Added proper type annotation
  const handleSort = (field: string) => {
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
    return dealership ? formatApiNames(dealership.dealership_name)  : "Primary";
  };

  const getSortIcon = (field: any) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Handler functions following inspection pattern
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

  // Fixed: Added proper type annotation
  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const handleAddCategory = (categoryData: {
    category_name: string;
    category_id: string;
    description: string;
  }) => {
    if (!selectedConfig) {
      toast.error("No configuration selected");
      return;
    }

    addCategoryMutation.mutate({
      configId: selectedConfig._id,
      categoryData,
    });
  };

  const handleEditCategory = (category: any) => {
    setCategoryToEdit(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleUpdateCategory = (categoryData: {
    category_name: string;
    category_id: string;
    description: string;
  }) => {
    if (!selectedConfig || !categoryToEdit) {
      toast.error("No configuration or category selected");
      return;
    }

    updateCategoryMutation.mutate({
      configId: selectedConfig._id,
      categoryId: categoryToEdit.category_id,
      categoryData,
    });
  };

  const handleToggleCategoryStatus = (category: any, isActive: boolean) => {
    if (!selectedConfig) {
      toast.error("No configuration selected");
      return;
    }

    toggleCategoryStatusMutation.mutate({
      configId: selectedConfig._id,
      categoryId: category.category_id,
      isActive,
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedConfig || !selectedConfigDetails) {
      toast.error("No configuration selected");
      return;
    }

    try {
      await saveConfigMutation.mutateAsync({
        id: selectedConfig._id,
        data: {
          config_name: selectedConfig.config_name,
          description: selectedConfig.description,
          is_active: selectedConfig.is_active,
          categories: selectedConfigDetails.categories,
          settings: selectedConfigDetails.settings,
        },
      });
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!selectedConfig) return;
    deleteSectionMutation.mutate({
      configId: selectedConfig._id,
      sectionId: sectionId,
    });
  };

  const handleUpdateSectionsOrder = (categoryId: string, sections: any[]) => {
    if (!selectedConfig) return;
    updateSectionsOrderMutation.mutate({
      configId: selectedConfig._id,
      categoryId: categoryId,
      sections: sections.map((section, index) => ({
        section_id: section.section_id,
        display_order: index,
      })),
    });
  };

  const handleUpdateFieldsOrder = (sectionId: string, fields: any[]) => {
    if (!selectedConfig) return;
    updateFieldsOrderMutation.mutate({
      configId: selectedConfig._id,
      sectionId: sectionId,
      fields: fields.map((field, index) => ({
        field_id: field.field_id,
        display_order: index,
      })),
    });
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only include dealership_id if user is not primary admin
    const submitData = isPrimaryAdmin
      ? configFormData
      : { ...configFormData, dealership_id: configFormData.dealership_id };

    createConfigMutation.mutate(submitData);
  };

  // Fixed: Updated handleEditField to set all required state
  const handleEditField = (field: any) => {
    setFieldToEdit(field);
    setSelectedField(field);
    setSelectedConfigId(selectedConfig?._id || null);
    setIsFieldEditDialogOpen(true);
  };

  const handleDeleteField = (field: any) => {
    setFieldToDelete(field);
    setIsFieldDeleteDialogOpen(true);
  };

  const confirmFieldDelete = () => {
    if (!fieldToDelete || !selectedConfig) return;
    deleteFieldMutation.mutate({
      configId: selectedConfig._id,
      fieldId: fieldToDelete.field_id,
    });
  };

  const handleEditConfig = (config: any) => {
    setConfigToEdit(config);
    setEditFormData({
      config_name: config.config_name,
      description: config.description || "",
      is_active: config.is_active,
      dealership_id: config.dealership_id?._id || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configToEdit) return;

    // Only include dealership_id if user is not primary admin
    const submitData = isPrimaryAdmin
      ? editFormData
      : { ...editFormData, dealership_id: editFormData.dealership_id };

    updateConfigMutation.mutate({
      id: configToEdit._id,
      data: submitData,
    });
  };

  const handleDeleteConfig = (config: any) => {
    setConfigToDelete(config);
    setIsDeleteDialogOpen(true);
  };

  const handlePreview = () => {
    if (!selectedConfigDetails) {
      toast.error("No configuration selected to preview");
      console.log("No selectedConfigDetails available");
      return;
    }
    
    console.log("Opening preview with config:", selectedConfigDetails);
    console.log("Categories count:", selectedConfigDetails.categories?.length);
    console.log("Total sections:", selectedConfigDetails.categories?.reduce((acc: number, cat: any) => acc + (cat.sections?.length || 0), 0));
    console.log("Total fields:", selectedConfigDetails.categories?.reduce((acc: number, cat: any) => 
      acc + (cat.sections?.reduce((secAcc: number, sec: any) => secAcc + (sec.fields?.length || 0), 0) || 0), 0));
    
    setIsPreviewOpen(true);
  };

  const confirmDelete = () => {
    if (!configToDelete) return;
    deleteConfigMutation.mutate(configToDelete._id);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig || !selectedCategory) return;

    addSectionMutation.mutate({
      configId: selectedConfig._id,
      categoryId: selectedCategory,
      data: sectionFormData,
    });
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig || !selectedSection) return;

    const fieldData = {
      field_name: fieldFormData.field_name,
      field_type: fieldFormData.field_type,
      is_required: fieldFormData.is_required,
      has_image: fieldFormData.has_image,
      has_notes: fieldFormData.has_notes,
      placeholder: fieldFormData.placeholder,
      help_text: fieldFormData.help_text,
      dropdown_config:
        fieldFormData.field_type === "dropdown"
          ? fieldFormData.dropdown_config
          : undefined,
    };

    addFieldMutation.mutate({
      configId: selectedConfig._id,
      sectionId: selectedSection.section_id,
      data: fieldData,
    });
  };

  const handleOpenCalculationSettings = (category: any) => {
    setSelectedCategoryForCalculations(category);
    setIsCalculationSettingsOpen(true);
  };

  // Calculate counts for chips
  const totalConfigs = configsData?.pagination?.total_items || 0;
  const activeCount = configs.filter((c: any) => c.is_active).length;
  const inactiveCount = configs.filter((c: any) => !c.is_active).length;
  const categoriesCount = selectedConfig
    ? selectedConfigDetails?.categories?.length || 0
    : configs.reduce(
        (sum: number, config: any) => sum + (config.categories_count || 0),
        0
      );

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
      label: "Total Categories",
      value: categoriesCount,
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
        onClick={() => handleSort("categories_count")}
      >
        <div className="flex items-center">
          Categories
          {getSortIcon("categories_count")}
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
          onClick={() => {
            setSelectedConfig(config);
          }}
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
              {config.categories_count || 0} categories
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
  {/* Configure Categories & Sections */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedConfig(config)}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Configure Categories & Sections</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Edit Basic Info */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditConfig(config)}
          className="text-green-600 hover:text-green-800 hover:bg-green-100"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Edit Basic Info</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Delete Configuration */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteConfig(config)}
          className="text-red-600 hover:text-red-800 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete Configuration</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>

          </TableCell>
        </TableRow>
      ))}
    </>
  );

  const addFieldForm = (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add Field to {selectedSection?.section_name}</DialogTitle>
        <DialogDescription>
          Create a new field within this section
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleAddField} className="space-y-4">
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
            placeholder="Oil Level"
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
              <SelectValue />
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

        {/* Dropdown Configuration */}
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
            placeholder="Enter oil level status"
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
            placeholder="Check dipstick for oil level"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_required"
            checked={fieldFormData.is_required}
            onCheckedChange={(checked) =>
              setFieldFormData({
                ...fieldFormData,
                is_required: checked === true,
              })
            }
          />
          <Label htmlFor="is_required">Required field</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_image"
            checked={fieldFormData.has_image}
            onCheckedChange={(checked) =>
              setFieldFormData({
                ...fieldFormData,
                has_image: checked === true,
              })
            }
          />
          <Label htmlFor="has_image">Include image capture</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_notes"
            checked={fieldFormData.has_notes}
            onCheckedChange={(checked) =>
              setFieldFormData({
                ...fieldFormData,
                has_notes: checked === true,
              })
            }
          />
          <Label htmlFor="has_notes">Allow To Enter Notes</Label>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFieldDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={addFieldMutation.isPending}>
            {addFieldMutation.isPending ? "Adding..." : "Add Field"}
          </Button>
        </div>
      </form>
    </DialogContent>
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

      {/* Configuration Editor */}
      {selectedConfig && (
        <Dialog
          open={!!selectedConfig}
          onOpenChange={(open) => !open && setSelectedConfig(null)}
        >
          <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
            <div className="flex flex-col h-full">
              {/* Header */}
              <DialogHeader className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl">
                      Edit Configuration: {selectedConfig?.config_name}
                    </DialogTitle>
                    <DialogDescription>
                      Configure categories, sections, and fields for trade-in evaluation
                    </DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConfig(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="flex-1 flex flex-col overflow-y-auto max-h-[90vh] p-6">
                {detailsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : detailsError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-red-600">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p>Error loading configuration details</p>
                      <Button 
                        variant="outline" 
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["tradein-config-details"] })}
                        className="mt-2"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : selectedConfigDetails?.categories?.length > 0 ? (
                  <div>
                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mb-6 flex-shrink-0">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsAddCategoryDialogOpen(true)}
                        >
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Add Categories
                        </Button>
                        <Button variant="outline" onClick={handlePreview}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                      <Button
                        onClick={handleSaveChanges}
                        disabled={saveConfigMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveConfigMutation.isPending
                          ? "Saving..."
                          : "Save Changes"}
                      </Button>
                    </div>

                    {/* Categories List - Scrollable */}
                    <div className="flex-1 overflow-y-auto pr-2">
                      <Accordion
                        type="single"
                        collapsible
                        className="space-y-4"
                      >
                        {selectedConfigDetails.categories?.map(
                          (category: any) => (
                            <AccordionItem
                              key={category.category_id}
                              value={category.category_id}
                              className="border rounded-lg"
                            >
                              <AccordionTrigger className="text-left px-4 hover:no-underline">
                                <div className="flex items-center justify-between w-full mr-4">
                                  <div>
                                    <h3 className="font-semibold">
                                      {category.category_name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      {category.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline">
                                      {category.sections?.length || 0} sections
                                    </Badge>
                                    <Switch
                                      checked={category.is_active !== false}
                                      onCheckedChange={(checked) =>
                                        handleToggleCategoryStatus(
                                          category,
                                          checked
                                        )
                                      }
                                      disabled={
                                        toggleCategoryStatusMutation.isPending
                                      }
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditCategory(category);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-4">
                                  {/* Sticky section header with actions */}
                                  <div className="flex justify-between items-center sticky top-0 bg-background z-10 py-2 -mx-2 px-2">
                                    <h4 className="font-medium">Sections</h4>
                                    <div className="flex space-x-2">
                                      {hasCalculationFields(category) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenCalculationSettings(
                                              category
                                            );
                                          }}
                                        >
                                          <Calculator className="h-4 w-4 mr-1" />
                                          Calculations
                                        </Button>
                                      )}
                                      {/* Fixed: Complete section dialog implementation */}
                                      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              setSelectedCategory(
                                                category.category_id
                                              )
                                            }
                                          >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Section
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Add Section</DialogTitle>
                                            <DialogDescription>
                                              Create a new section within the selected category
                                            </DialogDescription>
                                          </DialogHeader>
                                          <form onSubmit={handleAddSection} className="space-y-4">
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
                                                placeholder="Vehicle Condition"
                                                required
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="section_description">Description</Label>
                                              <Input
                                                id="section_description"
                                                value={sectionFormData.description}
                                                onChange={(e) =>
                                                  setSectionFormData({
                                                    ...sectionFormData,
                                                    description: e.target.value,
                                                  })
                                                }
                                                placeholder="Evaluate vehicle exterior and interior condition"
                                              />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id="is_collapsible"
                                                checked={sectionFormData.is_collapsible}
                                                onCheckedChange={(checked) =>
                                                  setSectionFormData({
                                                    ...sectionFormData,
                                                    is_collapsible: checked === true,
                                                  })
                                                }
                                              />
                                              <Label htmlFor="is_collapsible">Collapsible section</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id="is_expanded"
                                                checked={sectionFormData.is_expanded_by_default}
                                                onCheckedChange={(checked) =>
                                                  setSectionFormData({
                                                    ...sectionFormData,
                                                    is_expanded_by_default: checked === true,
                                                  })
                                                }
                                              />
                                              <Label htmlFor="is_expanded">Expanded by default</Label>
                                            </div>
                                            <div className="flex justify-end space-x-2">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsSectionDialogOpen(false)}
                                              >
                                                Cancel
                                              </Button>
                                              <Button type="submit" disabled={addSectionMutation.isPending}>
                                                {addSectionMutation.isPending ? "Adding..." : "Add Section"}
                                              </Button>
                                            </div>
                                          </form>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>

                                  {/* Scrollable sections content */}
                                  <div className="max-h-80 overflow-y-auto">
                                    {category.sections?.length > 0 ? (
                                      <DraggableTradeinSectionsList
                                        sections={category.sections}
                                        configId={selectedConfig._id}
                                        onDeleteSection={handleDeleteSection}
                                        onAddField={(section) =>
                                          setSelectedSection(section)
                                        }
                                        onEditField={handleEditField}
                                        onDeleteField={handleDeleteField}
                                        onUpdateSectionsOrder={(sections) =>
                                          handleUpdateSectionsOrder(
                                            category.category_id,
                                            sections
                                          )
                                        }
                                        onUpdateFieldsOrder={
                                          handleUpdateFieldsOrder
                                        }
                                        isFieldDialogOpen={isFieldDialogOpen}
                                        setIsFieldDialogOpen={
                                          setIsFieldDialogOpen
                                        }
                                        selectedSection={selectedSection}
                                        setSelectedSection={setSelectedSection}
                                        addFieldForm={addFieldForm}
                                        isDeletingSection={
                                          deleteSectionMutation.isPending
                                        }
                                      />
                                    ) : (
                                      <p className="text-muted-foreground text-center py-4">
                                        No sections added yet. Click "Add
                                        Section" to get started.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        )}
                      </Accordion>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">
                        No categories added yet. Add categories to get started
                        with this configuration.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddCategoryDialogOpen(true)}
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Add Your First Category
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trade-in Configuration</DialogTitle>
            <DialogDescription>
              Create a new configuration template for vehicle trade-in evaluations
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateConfig} className="space-y-4">
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
                    is_active: checked === true,
                  })
                }
              />
              <Label htmlFor="is_active">Set as active configuration</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfigDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createConfigMutation.isPending}>
                {createConfigMutation.isPending
                  ? "Creating..."
                  : "Create Configuration"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Configuration Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Configuration</DialogTitle>
            <DialogDescription>
              Update configuration details and status
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateConfig} className="space-y-4">
            {/* Show dealership dropdown for non-primary admins */}
            {!isPrimaryAdmin && userDealerships.length > 0 && (
              <div>
                <Label htmlFor="edit_dealership_id">Dealership</Label>
                <Select
                  value={editFormData.dealership_id}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, dealership_id: value })
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
                value={editFormData.config_name}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    config_name: e.target.value,
                  })
                }
                placeholder="Configuration name"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Input
                id="edit_description"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                placeholder="Configuration description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_active"
                checked={editFormData.is_active}
                onCheckedChange={(checked) =>
                  setEditFormData({
                    ...editFormData,
                    is_active: checked === true,
                  })
                }
              />
              <Label htmlFor="edit_is_active">Active configuration</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateConfigMutation.isPending}>
                {updateConfigMutation.isPending
                  ? "Updating..."
                  : "Update Configuration"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Field Edit Dialog - Fixed: Using correct state variables */}
      <TradeinFieldEditDialog
        isOpen={isFieldEditDialogOpen}
        onClose={() => {
          setIsFieldEditDialogOpen(false);
          setFieldToEdit(null);
          setSelectedField(null);
          setSelectedConfigId(null);
        }}
        configId={selectedConfigId || selectedConfig?._id || ""}
        field={fieldToEdit}
      />

      {/* Preview Modal - Fixed: Now properly showing categories and sections */}
      <TradeinPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        config={selectedConfigDetails}
        dropdowns={dropdowns}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setConfigToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Configuration"
        description={`Are you sure you want to delete "${configToDelete?.config_name}"? This action cannot be undone.`}
        isLoading={deleteConfigMutation.isPending}
      />

      <DeleteConfirmationDialog
        isOpen={isFieldDeleteDialogOpen}
        onClose={() => {
          setIsFieldDeleteDialogOpen(false);
          setFieldToDelete(null);
        }}
        onConfirm={confirmFieldDelete}
        title="Delete Field"
        description={`Are you sure you want to delete "${fieldToDelete?.field_name}"? This action cannot be undone.`}
        isLoading={deleteFieldMutation.isPending}
      />

      {/* Add Category Dialog */}
      <AddTradeinCategoryDialog
        isOpen={isAddCategoryDialogOpen}
        onClose={() => setIsAddCategoryDialogOpen(false)}
        onAddCategory={handleAddCategory}
        isLoading={addCategoryMutation.isPending}
      />

      {/* Edit Category Dialog */}
      <EditTradeinCategoryDialog
        isOpen={isEditCategoryDialogOpen}
        onClose={() => {
          setIsEditCategoryDialogOpen(false);
          setCategoryToEdit(null);
        }}
        onUpdateCategory={handleUpdateCategory}
        category={categoryToEdit}
        isLoading={updateCategoryMutation.isPending}
      />

      {/* Calculation Settings Dialog */}
      {selectedConfig && selectedCategoryForCalculations && (
        <CalculationSettingsDialog
          isOpen={isCalculationSettingsOpen}
          onClose={() => {
            setIsCalculationSettingsOpen(false);
            setSelectedCategoryForCalculations(null);
          }}
          configId={selectedConfig._id}
          categoryId={selectedCategoryForCalculations.category_id}
          category={selectedCategoryForCalculations}
          configType="tradein"
        />
      )}

      {/* Search and Filter Dialog */}
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