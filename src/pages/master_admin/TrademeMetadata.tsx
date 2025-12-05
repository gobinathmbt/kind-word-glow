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
import { toast } from "sonner";
import {
  Filter,
  Trash2,
  Edit,
  RefreshCw,
} from "lucide-react";
import { trademeMetadataServices } from "@/api/services";

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface TrademeMetadataItem {
  _id: string;
  value_id: number;
  parent_id?: number;
  name: string;
  metadata_type: string;
  category_id?: number;
  categoriesSupported?: number[];
  externalNames?: string[];
  raw_data?: any;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface CountsData {
  total?: number;
  VEHICLE_TYPE?: number;
  CATEGORY?: number;
  SUBCATEGORY?: number;
  ATTRIBUTE?: number;
}

const TrademeMetadata = () => {
  const queryClient = useQueryClient();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    metadata_type: "",
    parent_id: "",
    category_id: "",
    is_active: "",
  });

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Dialog states
  const [editItem, setEditItem] = useState<TrademeMetadataItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<TrademeMetadataItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: "",
  });

  // Get counts for dashboard
  const { data: counts, isLoading: countsLoading, error: countsError } = useQuery({
    queryKey: ["trademe-metadata-counts"],
    queryFn: async () => {
      try {
        const response = await trademeMetadataServices.getCounts();
        return response.data.data as CountsData;
      } catch (error) {
        console.error("Error fetching counts:", error);
        throw error;
      }
    },
  });

  // Get current data
  const { data: currentData, isLoading: currentLoading, error: dataError } = useQuery({
    queryKey: [
      "trademe-metadata",
      filters,
      pagination.page,
      pagination.limit,
      searchTerm,
    ],
    queryFn: async () => {
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm,
          ...filters,
        };
        const response = await trademeMetadataServices.getAll(params);
        return response.data;
      } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
      }
    },
  });

  // Update pagination when data changes
  useEffect(() => {
    if (currentData?.pagination) {
      setPagination((prev) => ({
        ...prev,
        total: currentData.pagination.total || 0,
        pages: currentData.pagination.pages || 0,
      }));
    }
  }, [currentData]);

  // CREATE MUTATION
  // UPDATE MUTATION
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return trademeMetadataServices.update(id, data);
    },
    onSuccess: () => {
      toast.success("Trademe metadata updated successfully");
      setEditItem(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["trademe-metadata"] });
    },
    onError: (error: any) => {
      toast.error(
        `Failed to update: ${error.response?.data?.message || error.message}`
      );
    },
  });

  // DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return trademeMetadataServices.delete(id);
    },
    onSuccess: () => {
      toast.success("Trademe metadata deleted successfully");
      setShowDeleteDialog(false);
      setDeleteItem(null);
      queryClient.invalidateQueries({ queryKey: ["trademe-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["trademe-metadata-counts"] });
    },
    onError: (error: any) => {
      toast.error(
        `Failed to delete: ${error.response?.data?.message || error.message}`
      );
    },
  });

  const handleDeleteItem = (item: TrademeMetadataItem) => {
    setDeleteItem(item);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteItem) {
      deleteMutation.mutate(deleteItem._id);
    }
  };

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({
        id: editItem._id,
        data: formData,
      });
    }
  };

  const handleEdit = (item: TrademeMetadataItem) => {
    setEditItem(item);
    setFormData({
      name: item.name,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
    });
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

  return (
    <DashboardLayout title="Trademe MetaData">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Trademe MetaData</h1>
            <p className="text-muted-foreground">
              Manage Trademe vehicle metadata and categories
            </p>
            {/* Total Counts */}
            {!countsLoading && counts && (
              <div className="flex gap-4 mt-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Total: {counts.total?.toLocaleString()}
                </Badge>
                {counts.VEHICLE_TYPE !== undefined && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Vehicle Types: {counts.VEHICLE_TYPE?.toLocaleString()}
                  </Badge>
                )}
                {counts.CATEGORY !== undefined && (
                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                    Categories: {counts.CATEGORY?.toLocaleString()}
                  </Badge>
                )}
                {counts.SUBCATEGORY !== undefined && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    Subcategories: {counts.SUBCATEGORY?.toLocaleString()}
                  </Badge>
                )}
                {counts.ATTRIBUTE !== undefined && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">
                    Attributes: {counts.ATTRIBUTE?.toLocaleString()}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["trademe-metadata"] });
                queryClient.invalidateQueries({ queryKey: ["trademe-metadata-counts"] });
                toast.success("Data refreshed");
              }}
              variant="outline"
              size="icon"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label>Metadata Type</Label>
                <Select
                  value={filters.metadata_type}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, metadata_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="CATEGORY">Category</SelectItem>
                    <SelectItem value="CONDITION">Condition</SelectItem>
                    <SelectItem value="FEATURE">Feature</SelectItem>
                    <SelectItem value="FUEL_TYPE">Fuel Type</SelectItem>
                    <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                    <SelectItem value="MODEL">Model</SelectItem>
                    <SelectItem value="TRANSMISSION">Transmission</SelectItem>
                    <SelectItem value="VEHICLE_TYPE">Vehicle Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={filters.is_active}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, is_active: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      metadata_type: "",
                      parent_id: "",
                      category_id: "",
                      is_active: "",
                    })
                  }
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="p-6">
              {currentLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : dataError ? (
                <div className="text-center py-8 text-red-500">
                  Error loading data: {(dataError as any)?.message || "Unknown error"}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">S.No</TableHead>
                        <TableHead>Value ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Parent ID</TableHead>
                        <TableHead>Category ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!currentData?.data || currentData.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No data found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentData.data.map((item: TrademeMetadataItem, index: number) => (
                          <TableRow key={item._id}>
                            <TableCell>{(pagination.page - 1) * pagination.limit + index + 1}</TableCell>
                            <TableCell>{item.value_id}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.metadata_type}</Badge>
                            </TableCell>
                            <TableCell>{item.parent_id || "-"}</TableCell>
                            <TableCell>{item.category_id || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={item.is_active === 1 ? "default" : "secondary"}
                              >
                                {item.is_active === 1 ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <PaginationControls />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog
          open={!!editItem}
          onOpenChange={() => {
            setEditItem(null);
            resetForm();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Trademe Metadata</DialogTitle>
              <DialogDescription>
                Update the trademe metadata name
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditItem(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
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
                  <p className="font-medium">{deleteItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Value ID: {deleteItem.value_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Type: {deleteItem.metadata_type}
                  </p>
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

export default TrademeMetadata;
