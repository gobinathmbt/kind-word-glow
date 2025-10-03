import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload,
  Plus,
  Filter,
  Database,
  Car,
  Calendar,
  Settings,
  Trash2,
  Edit,
  FileText,
} from "lucide-react";
import { vehicleMetadataServices } from "@/api/services";
import FlexibleUploadModal from "@/components/metadata/FlexibleUploadModal";
import AddEntryDialog from "@/components/metadata/AddEntryDialog";

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface DropdownItem {
  _id: string;
  displayName: string;
  displayValue?: string;
  isActive?: boolean;
  year?: number;
  make?: DropdownItem;
  models?: DropdownItem[];
  model?: DropdownItem;
  variant?: DropdownItem;
}

interface VehicleMetadataItem {
  _id: string;
  make?: DropdownItem;
  model?: DropdownItem;
  variant?: DropdownItem;
  body?: DropdownItem;
  variantYear?: DropdownItem;
  fuelType?: string;
  transmission?: string;
  engineCapacity?: string;
  power?: string;
  torque?: string;
  seatingCapacity?: string;
}

interface CountsData {
  makes?: number;
  models?: number;
  variants?: number;
  bodies?: number;
  years?: number;
  metadata?: number;
}

interface CountsResponse {
  data: CountsData;
}

interface ApiResponse<T> {
  data: T;
  pagination?: {
    total: number;
    pages: number;
  };
}

const VehicleMetadata = () => {
  const queryClient = useQueryClient();

  // Helper function to transform display names to display values
  const transformToDisplayValue = (text: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .trim();
  };

  // State management
  const [currentTab, setCurrentTab] = useState("metadata");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    make: "",
    model: "",
    variant: "",
    body: "",
    year: "",
    fuelType: "",
    transmission: "",
  });

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Dialog states
  const [showFlexibleUpload, setShowFlexibleUpload] = useState(false);
  const [editItem, setEditItem] = useState<
    VehicleMetadataItem | DropdownItem | null
  >(null);
  const [editData, setEditData] = useState<any>({});
  const [deleteItem, setDeleteItem] = useState<{
    _id: string;
    type: string;
    displayName?: string;
    make?: DropdownItem;
    model?: DropdownItem;
    body?: DropdownItem;
    variantYear?: DropdownItem;
  } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get dropdown data for filters
  const { data: allMakes, isLoading: allMakesLoading } = useQuery({
    queryKey: ["dropdown-makes"],
    queryFn: () => vehicleMetadataServices.getDropdownData("makes"),
  });

  const { data: allModels, isLoading: allModelsLoading } = useQuery({
    queryKey: ["dropdown-models", filters.make],
    queryFn: () =>
      vehicleMetadataServices.getDropdownData("models", {
        makeId: filters.make || undefined,
      }),
    enabled: !!filters.make,
  });

  const { data: allVariants, isLoading: allVariantsLoading } = useQuery({
    queryKey: ["dropdown-variants", filters.model],
    queryFn: () =>
      vehicleMetadataServices.getDropdownData("variants", {
        modelId: filters.model || undefined,
      }),
    enabled: !!filters.model,
  });

  const { data: allBodies, isLoading: allBodiesLoading } = useQuery({
    queryKey: ["dropdown-bodies"],
    queryFn: () => vehicleMetadataServices.getDropdownData("bodies"),
  });

  const { data: allYears, isLoading: allYearsLoading } = useQuery({
    queryKey: ["dropdown-years", filters.model, filters.variant],
    queryFn: () =>
      vehicleMetadataServices.getDropdownData("years", {
        modelId: filters.model || undefined,
        variantId: filters.variant || undefined,
      }),
    enabled: !!(filters.model || filters.variant),
  });

  // Get counts for dashboard
  const { data: counts, isLoading: countsLoading } = useQuery<CountsResponse>({
    queryKey: ["vehicle-metadata-counts"],
    queryFn: async () => {
      const response = await vehicleMetadataServices.getCounts();
      return response.data;
    },
  });

  // Get current tab data based on selected tab
  const { data: currentTabData, isLoading: currentTabLoading } = useQuery<
    ApiResponse<{ data: any[]; pagination?: PaginationState }>
  >({
    queryKey: [
      `vehicle-metadata-${currentTab}`,
      filters,
      pagination.page,
      pagination.limit,
      searchTerm,
    ],
    queryFn: () => {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...filters,
      };

      switch (currentTab) {
        case "metadata":
          return vehicleMetadataServices.getVehicleMetadata(params);
        case "makes":
          return vehicleMetadataServices.getMakes(params);
        case "models":
          return vehicleMetadataServices.getModels(params);
        case "variants":
          return vehicleMetadataServices.getVariants(params);
        case "bodies":
          return vehicleMetadataServices.getBodies(params);
        case "years":
          return vehicleMetadataServices.getVariantYears(params);
        default:
          return Promise.resolve({ data: { data: [] } } as ApiResponse<{
            data: any[];
          }>);
      }
    },
  });

  // Update pagination when data changes
  useEffect(() => {
    if (currentTabData?.data?.pagination) {
      setPagination((prev) => ({
        ...prev,
        total: currentTabData.data.pagination?.total || 0,
        pages: currentTabData.data.pagination?.pages || 0,
      }));
    }
  }, [currentTabData]);

  // Helper function to update cache with new/updated data
  const updateCacheData = (
    operation: "create" | "update" | "delete",
    entityType: string,
    data?: any,
    itemId?: string
  ) => {
    const targetTab = entityType === "metadata" ? "metadata" : `${entityType}s`;

    // Update current tab data
    const queryKey = [
      `vehicle-metadata-${targetTab}`,
      filters,
      pagination.page,
      pagination.limit,
      searchTerm,
    ];

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.data?.data) return oldData;

      const currentData = [...oldData.data.data];
      let newTotal = oldData.data.pagination?.total || 0;

      switch (operation) {
        case "create":
          // Add new item to the beginning
          currentData.unshift(data);
          if (currentData.length > pagination.limit) {
            currentData.pop();
          }
          newTotal += 1;
          break;

        case "update":
          // Update existing item
          const updateIndex = currentData.findIndex(
            (item) => item._id === itemId
          );
          if (updateIndex !== -1) {
            currentData[updateIndex] = { ...currentData[updateIndex], ...data };
          }
          break;

        case "delete":
          // Remove item
          const deleteIndex = currentData.findIndex(
            (item) => item._id === itemId
          );
          if (deleteIndex !== -1) {
            currentData.splice(deleteIndex, 1);
            newTotal -= 1;
          }
          break;
      }

      return {
        ...oldData,
        data: {
          ...oldData.data,
          data: currentData,
          pagination: {
            ...oldData.data.pagination,
            total: newTotal,
            pages: Math.ceil(newTotal / pagination.limit),
          },
        },
      };
    });

    // Update counts for create/delete operations
    if (operation === "create" || operation === "delete") {
      queryClient.setQueryData(
        ["vehicle-metadata-counts"],
        (oldCounts: any) => {
          if (!oldCounts?.data) return oldCounts;

          const countKey =
            entityType === "body"
              ? "bodies"
              : entityType === "year"
              ? "years"
              : `${entityType}s`;

          const change = operation === "create" ? 1 : -1;

          return {
            ...oldCounts,
            data: {
              ...oldCounts.data,
              [countKey]: Math.max(0, (oldCounts.data[countKey] || 0) + change),
            },
          };
        }
      );
    }
  };

  // CREATE MUTATION - Modified to handle errors without closing dialog
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { type, ...formData } = data;

      switch (type) {
        case "make":
          return vehicleMetadataServices.addMake({
            displayName: formData.displayName,
            isActive: formData.isActive ?? true,
          });
        case "model":
          return vehicleMetadataServices.addModel({
            displayName: formData.displayName,
            makeId: formData.makeId,
            isActive: formData.isActive ?? true,
          });
        case "variant":
          return vehicleMetadataServices.addVariant({
            displayName: formData.displayName,
            models: formData.models,
            isActive: formData.isActive ?? true,
          });
        case "body":
          return vehicleMetadataServices.addBody({
            displayName: formData.displayName,
            isActive: formData.isActive ?? true,
          });
        case "year":
          return vehicleMetadataServices.addVariantYear({
            year: parseInt(formData.year),
            displayName: formData.year.toString(),
            ...(formData.modelId && { modelId: formData.modelId }),
            ...(formData.variantId && { variantId: formData.variantId }),
            isActive: true,
          });
        case "metadata":
          return vehicleMetadataServices.addVehicleMetadata({
            make: formData.makeId,
            model: formData.modelId,
            variant: formData.variantId,
            body: formData.bodyId,
            variantYear: formData.yearId,
            fuelType: formData.fuelType,
            transmission: formData.transmission,
            engineCapacity: formData.engineCapacity,
            power: formData.power,
            torque: formData.torque,
            seatingCapacity: formData.seatingCapacity,
          });
        default:
          throw new Error("Invalid type");
      }
    },
    onSuccess: async (response, variables) => {
      const newData = response.data;
      const entityType = variables.type;

      toast.success(
        `${
          entityType.charAt(0).toUpperCase() + entityType.slice(1)
        } added successfully`
      );

      // Determine target tab
      const targetTab =
        entityType === "metadata" ? "metadata" : `${entityType}s`;
      const wasTabSwitched = currentTab !== targetTab;

      // Switch to appropriate tab
      if (wasTabSwitched) {
        setCurrentTab(targetTab);
      }

      // Reset pagination to first page
      const newPagination = { ...pagination, page: 1 };
      setPagination(newPagination);

      // Clear search to ensure new item is visible
      setSearchTerm("");

      // Update cache immediately
      updateCacheData("create", entityType, newData);

      // Invalidate dropdown queries for filters
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["dropdown"] });
        queryClient.invalidateQueries({
          queryKey: [`vehicle-metadata-${targetTab}`],
        });
      }, 100);
    },
    onError: (error: any, variables) => {
      console.error("Creation error:", error);
      // Don't show toast here as AddEntryDialog will handle it
      // Just throw the error to be caught by the dialog
      throw error;
    },
  });

  // UPDATE MUTATION
  const updateMutation = useMutation({
    mutationFn: async ({
      type,
      id,
      data,
    }: {
      type: string;
      id: string;
      data: any;
    }) => {
      switch (type) {
        case "make":
          return vehicleMetadataServices.updateMake(id, data);
        case "model":
          return vehicleMetadataServices.updateModel(id, data);
        case "variant":
          return vehicleMetadataServices.updateVariant(id, data);
        case "body":
          return vehicleMetadataServices.updateBody(id, data);
        case "year":
          return vehicleMetadataServices.updateVariantYear(id, data);
        case "metadata":
          return vehicleMetadataServices.updateVehicleMetadata(id, data);
        default:
          throw new Error("Invalid type");
      }
    },
    onSuccess: (response, variables) => {
      const updatedData = response.data;
      const entityType = variables.type;

      toast.success("Item updated successfully");

      // Update cache immediately
      updateCacheData("update", entityType, updatedData, variables.id);

      // Close edit dialog
      setEditItem(null);

      // Invalidate related queries for consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["dropdown"] });
        const targetTab =
          entityType === "metadata" ? "metadata" : `${entityType}s`;
        queryClient.invalidateQueries({
          queryKey: [`vehicle-metadata-${targetTab}`],
        });
      }, 100);
    },
    onError: (error: any) => {
      toast.error("Failed to update item");
      console.error("Update error:", error);
    },
  });

  // DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      switch (type) {
        case "make":
          return vehicleMetadataServices.deleteMake(id);
        case "model":
          return vehicleMetadataServices.deleteModel(id);
        case "variant":
          return vehicleMetadataServices.deleteVariant(id);
        case "body":
          return vehicleMetadataServices.deleteBody(id);
        case "year":
          return vehicleMetadataServices.deleteVariantYear(id);
        case "metadata":
          return vehicleMetadataServices.deleteVehicleMetadata(id);
        default:
          throw new Error("Invalid type");
      }
    },
    onSuccess: (response, variables) => {
      const entityType = variables.type;

      toast.success("Item deleted successfully");

      // Update cache immediately
      updateCacheData("delete", entityType, null, variables.id);

      // Close delete dialog
      setShowDeleteDialog(false);
      setDeleteItem(null);

      // Invalidate related queries for consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["dropdown"] });
        const targetTab =
          entityType === "metadata" ? "metadata" : `${entityType}s`;
        queryClient.invalidateQueries({
          queryKey: [`vehicle-metadata-${targetTab}`],
        });
      }, 100);
    },
    onError: (error: any) => {
      toast.error(
        `Failed to delete item: ${
          error.response?.data?.message || error.message
        }`
      );
      setShowDeleteDialog(false);
      setDeleteItem(null);
    },
  });

  const handleDeleteItem = (item: any, type: string) => {
    setDeleteItem({ ...item, type });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteItem) {
      deleteMutation.mutate({
        type: deleteItem.type,
        id: deleteItem._id,
      });
    }
  };

  const handleSaveEdit = () => {
    if (!editItem) return;

    const type = getItemType(editItem);
    updateMutation.mutate({
      type,
      id: editItem._id,
      data: editData,
    });
  };

  // Modified handleAddEntry to properly handle errors
  const handleAddEntry = async (type: string, data: any) => {
    try {
      await createMutation.mutateAsync({ type, ...data });
    } catch (error) {
      // Re-throw the error so AddEntryDialog can catch it
      throw error;
    }
  };

  // Helper function to determine item type
  const getItemType = (item: VehicleMetadataItem | DropdownItem): string => {
    if ("make" in item && item.make && "model" in item && item.model)
      return "metadata";
    if ("year" in item && item.year !== undefined) return "year";
    if ("make" in item && item.make) return "model";
    return currentTab.slice(0, -1); // Remove 's' from plural
  };

  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
        {pagination.total} entries
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
          }
          disabled={pagination.page === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
          }
          disabled={pagination.page === pagination.pages}
        >
          Next
        </Button>
      </div>
    </div>
  );

  const renderMetadataTable = () => (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No</TableHead>
            <TableHead>Make</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead>Body</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Fuel Type</TableHead>
            <TableHead>Transmission</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentTabData?.data?.data?.map((item: VehicleMetadataItem, index: number) => (
            <TableRow key={item._id}>
              <TableCell>
                {(pagination.page - 1) * pagination.limit + index + 1}
              </TableCell>
              <TableCell>{item.make?.displayName}</TableCell>
              <TableCell>{item.model?.displayName}</TableCell>
              <TableCell>{item.variant?.displayName || "-"}</TableCell>
              <TableCell>{item.body?.displayName || "-"}</TableCell>
              <TableCell>{item.variantYear?.year || "-"}</TableCell>
              <TableCell>{item.fuelType || "-"}</TableCell>
              <TableCell>{item.transmission || "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditItem(item);
                      setEditData(item);
                    }}
                    className="h-8 w-8"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteItem(item, "metadata")}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls />
    </>
  );

  const renderBasicTable = (type: string) => (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Display Name</TableHead>
            <TableHead>Display Value</TableHead>
            {type === "years" && <TableHead>Year</TableHead>}
            {type === "models" && <TableHead>Make</TableHead>}
            {type === "variants" && <TableHead>Models</TableHead>}
            {type === "years" && <TableHead>Model</TableHead>}
            {type === "years" && <TableHead>Variant</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentTabData?.data?.data?.map((item: DropdownItem) => (
            <TableRow key={item._id}>
              <TableCell>{item.displayName}</TableCell>
              <TableCell>{item.displayValue}</TableCell>
              {type === "years" && <TableCell>{item.year}</TableCell>}
              {type === "models" && (
                <TableCell>{item.make?.displayName || "-"}</TableCell>
              )}
              {type === "variants" && (
                <TableCell>
                  {item.models
                    ?.map((model: any) => model.displayName)
                    .join(", ") || "-"}
                </TableCell>
              )}
              {type === "years" && (
                <TableCell>{item.model?.displayName || "-"}</TableCell>
              )}
              {type === "years" && (
                <TableCell>{item.variant?.displayName || "-"}</TableCell>
              )}
              <TableCell>
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditItem(item);
                      setEditData(item);
                    }}
                    className="h-8 w-8"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteItem(item, type.slice(0, -1))}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls />
    </>
  );

  return (
    <DashboardLayout title="Vehicle MetaData">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Vehicle MetaData</h1>
            <p className="text-muted-foreground">
              Manage vehicle makes, models, body types, and metadata
            </p>
            {/* Total Counts */}
            {!countsLoading && counts?.data && (
              <div className="flex gap-4 mt-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Makes: {counts.data?.makes?.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Models: {counts.data?.models?.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                  Variants: {counts.data?.variants?.toLocaleString()}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700"
                >
                  Bodies: {counts.data?.bodies?.toLocaleString()}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-700"
                >
                  Years: {counts.data?.years?.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  Metadata: {counts.data?.metadata?.toLocaleString()}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowFlexibleUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>

            <AddEntryDialog
              makes={allMakes?.data?.data || []}
              onAddEntry={handleAddEntry}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label>Make</Label>
                <Select
                  value={filters.make}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      make: value,
                      model: "", // Reset dependent filters
                      variant: "",
                      year: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Makes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Makes</SelectItem>
                    {allMakes?.data?.data?.map((make: DropdownItem) => (
                      <SelectItem key={make._id} value={make._id}>
                        {make.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Select
                  value={filters.model}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      model: value,
                      variant: "", // Reset dependent filters
                      year: "",
                    }))
                  }
                  disabled={!filters.make}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Models" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {allModels?.data?.data?.map((model: DropdownItem) => (
                      <SelectItem key={model._id} value={model._id}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Variant</Label>
                <Select
                  value={filters.variant}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      variant: value,
                      year: "", // Reset dependent filter
                    }))
                  }
                  disabled={!filters.model}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Variants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Variants</SelectItem>
                    {allVariants?.data?.data?.map((variant: DropdownItem) => (
                      <SelectItem key={variant._id} value={variant._id}>
                        {variant.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body Type</Label>
                <Select
                  value={filters.body}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, body: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Bodies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bodies</SelectItem>
                    {allBodies?.data?.data?.map((body: DropdownItem) => (
                      <SelectItem key={body._id} value={body._id}>
                        {body.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select
                  value={filters.year}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, year: value }))
                  }
                  disabled={!filters.model && !filters.variant}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {allYears?.data?.data?.map((year: DropdownItem) => (
                      <SelectItem key={year._id} value={year._id}>
                        {year.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      make: "",
                      model: "",
                      variant: "",
                      body: "",
                      year: "",
                      fuelType: "",
                      transmission: "",
                    })
                  }
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <CardHeader>
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger
                    value="metadata"
                    className="flex items-center gap-2"
                  >
                    <Database className="h-4 w-4" />
                    Metadata
                  </TabsTrigger>
                  <TabsTrigger
                    value="makes"
                    className="flex items-center gap-2"
                  >
                    <Car className="h-4 w-4" />
                    Makes
                  </TabsTrigger>
                  <TabsTrigger
                    value="models"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Models
                  </TabsTrigger>
                  <TabsTrigger
                    value="variants"
                    className="flex items-center gap-2"
                  >
                    <Car className="h-4 w-4" />
                    Variants
                  </TabsTrigger>
                  <TabsTrigger
                    value="bodies"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Bodies
                  </TabsTrigger>
                  <TabsTrigger
                    value="years"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Years
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <div className="p-6">
                <TabsContent value="metadata" className="mt-0">
                  {currentTabLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    renderMetadataTable()
                  )}
                </TabsContent>

                <TabsContent value="makes" className="mt-0">
                  {currentTabLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    renderBasicTable("makes")
                  )}
                </TabsContent>

                <TabsContent value="models" className="mt-0">
                  {currentTabLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    renderBasicTable("models")
                  )}
                </TabsContent>

                <TabsContent value="variants" className="mt-0">
                  {currentTabLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    renderBasicTable("variants")
                  )}
                </TabsContent>

                <TabsContent value="bodies" className="mt-0">
                  {currentTabLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    renderBasicTable("bodies")
                  )}
                </TabsContent>

                <TabsContent value="years" className="mt-0">
                  {currentTabLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    renderBasicTable("years")
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Flexible Upload Modal */}
        <FlexibleUploadModal
          open={showFlexibleUpload}
          onClose={() => setShowFlexibleUpload(false)}
          onUploadComplete={(result) => {
            queryClient.invalidateQueries({ queryKey: ["vehicle-metadata"] });
          }}
        />

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Make changes to the item here. Display values will be
                automatically generated from display names.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={editData.displayName || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        displayName: e.target.value,
                        displayValue: transformToDisplayValue(e.target.value),
                      })
                    }
                  />
                </div>
                {editData.year !== undefined && (
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={editData.year || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          year: parseInt(e.target.value) || "",
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditItem(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this item? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {deleteItem && (
                <div className="space-y-2">
                  <p className="font-medium">
                    {deleteItem.displayName ||
                      (deleteItem.make?.displayName &&
                      deleteItem.model?.displayName
                        ? `${deleteItem.make.displayName} - ${deleteItem.model.displayName}`
                        : "Item")}
                  </p>
                  {deleteItem.body?.displayName && (
                    <p>Body: {deleteItem.body.displayName}</p>
                  )}
                  {deleteItem.variantYear?.year && (
                    <p>Year: {deleteItem.variantYear.year}</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VehicleMetadata;
