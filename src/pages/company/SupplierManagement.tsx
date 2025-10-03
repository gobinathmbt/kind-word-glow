import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierServices, companyServices } from "@/api/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Edit,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DataTableLayout from "@/components/common/DataTableLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MultiSelectOption {
  option_value: string;
  display_value: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);

  const toggleOption = (displayValue: string) => {
    const isSelected = selectedValues.includes(displayValue);
    if (isSelected) {
      onSelectionChange(selectedValues.filter((item) => item !== displayValue));
    } else {
      onSelectionChange([...selectedValues, displayValue]);
    }
  };

  const removeItem = (valueToRemove: string) => {
    onSelectionChange(selectedValues.filter((item) => item !== valueToRemove));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 px-3 py-2"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedValues.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedValues.map((value, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {value}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(value);
                    }}
                  />
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search options..." className="h-9" />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-60">
              {selectedValues.length > 0 && (
                <CommandItem
                  onSelect={clearAll}
                  className="justify-center text-center cursor-pointer"
                >
                  Clear all
                </CommandItem>
              )}
              {options.map((option) => {
                const isSelected = selectedValues.includes(
                  option.display_value
                );
                return (
                  <CommandItem
                    key={option.option_value}
                    onSelect={() => toggleOption(option.display_value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.display_value}
                  </CommandItem>
                );
              })}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const SupplierManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    supplier_shop_name: "",
    tags: [] as string[],
    is_active: true,
  });

  const queryClient = useQueryClient();

  // Fetch suppliers with pagination and filters
  const {
    data: suppliersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["suppliers", page, searchTerm, statusFilter, tagFilter, rowsPerPage],
    queryFn: async () => {
      const params = {
        page,
        limit: rowsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(tagFilter.length > 0 && { tags: tagFilter }),
      };
      const response = await supplierServices.getSuppliers(params);
      return response.data;
    },
  });

  // Fetch tradie tags
  const { data: tradieTagsData } = useQuery({
    queryKey: ["tradie-tags"],
    queryFn: () =>
      companyServices
        .getCompanyMasterdropdownvalues({
          dropdown_name: ["tradie_tags"],
        })
        .then((res) => res.data),
  });

  const availableTags =
    tradieTagsData?.data?.find(
      (dropdown:any) => dropdown.dropdown_name === "tradie_tags"
    )?.values || [];

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => supplierServices.createSupplier(data),
    onSuccess: () => {
      toast.success("Supplier created successfully");
      refetch();
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create supplier");
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      supplierServices.updateSupplier(id, data),
    onSuccess: () => {
      toast.success("Supplier updated successfully");
      refetch();
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update supplier");
    },
  });

  // Toggle supplier status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      supplierServices.updateSupplier(id, { is_active }),
    onSuccess: () => {
      toast.success("Supplier status updated successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      address: "",
      supplier_shop_name: "",
      tags: [],
      is_active: true,
    });
    setSelectedSupplier(null);
  };

  const handleCreateSupplier = () => {
    setIsCreateModalOpen(true);
    resetForm();
  };

  const handleEditSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || "",
      email: supplier.email || "",
      address: supplier.address || "",
      supplier_shop_name: supplier.supplier_shop_name || "",
      tags: supplier.tags || [],
      is_active: supplier.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }

    if (selectedSupplier) {
      updateSupplierMutation.mutate({
        id: selectedSupplier._id,
        data: formData,
      });
    } else {
      createSupplierMutation.mutate(formData);
    }
  };

  const handleToggleStatus = (supplier: any) => {
    toggleStatusMutation.mutate({
      id: supplier._id,
      is_active: !supplier.is_active,
    });
  };

  const suppliers = suppliersData?.data || [];
  const pagination = suppliersData?.pagination || {};

  // Sort suppliers when not using pagination
  const sortedSuppliers = useMemo(() => {
    if (!sortField) return suppliers;

    return [...suppliers].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

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
  }, [suppliers, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ChevronDown className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1 transform rotate-180" />
    );
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (enabled: boolean) => {
    setPaginationEnabled(enabled);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTagFilter([]);
    setPage(1);
    setIsFilterDialogOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    refetch();
    setIsFilterDialogOpen(false);
  };

  // Calculate counts for chips
  const totalSuppliers = pagination.total_records || 0;
  const activeCount = suppliers.filter((s: any) => s.is_active).length;
  const inactiveCount = suppliers.filter((s: any) => !s.is_active).length;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalSuppliers,
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
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Add Supplier",
      onClick: handleCreateSupplier,
      className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("name")}
      >
        <div className="flex items-center">
          Supplier Details
          {getSortIcon("name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("email")}
      >
        <div className="flex items-center">
          Contact
          {getSortIcon("email")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Tags</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("is_active")}
      >
        <div className="flex items-center">
          Status
          {getSortIcon("is_active")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedSuppliers.map((supplier: any, index: number) => (
        <TableRow key={supplier._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{supplier.name}</p>
              {supplier.supplier_shop_name && (
                <p className="text-sm text-muted-foreground">
                  {supplier.supplier_shop_name}
                </p>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div>
              <p className="text-sm">{supplier.email}</p>
              {supplier.address && (
                <p className="text-xs text-muted-foreground truncate max-w-32">
                  {supplier.address}
                </p>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {supplier.tags
                ?.slice(0, 2)
                .map((tag: string, tagIndex: number) => (
                  <Badge
                    key={tagIndex}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              {supplier.tags?.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{supplier.tags.length - 2} more
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Switch
                checked={supplier.is_active}
                onCheckedChange={() => handleToggleStatus(supplier)}
              />
              <Badge
                variant={supplier.is_active ? "default" : "secondary"}
              >
                {supplier.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditSupplier(supplier)}
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
        title="Supplier Management"
        data={sortedSuppliers}
        isLoading={isLoading}
        totalCount={pagination.total_records || 0}
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
        cookieName="supplier_pagination_enabled" // Custom cookie name
        cookieMaxAge={60 * 60 * 24 * 30} // 30 days
      />

      {/* Search and Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Search & Filter Suppliers</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFilterDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by supplier name, email, or shop name"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tags</Label>
              <MultiSelectDropdown
                options={availableTags}
                selectedValues={tagFilter}
                onSelectionChange={setTagFilter}
                placeholder="Filter by tags"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <Button onClick={applyFilters} disabled={isLoading}>
              {isLoading ? "Applying..." : "Apply Filters"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Supplier Modal */}
      <Dialog
        open={isCreateModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSupplier ? "Edit Supplier" : "Create New Supplier"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter supplier name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shop_name">Shop Name</Label>
                <Input
                  id="shop_name"
                  value={formData.supplier_shop_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplier_shop_name: e.target.value,
                    }))
                  }
                  placeholder="Enter shop name"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label>Active Status</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Enter supplier address"
              />
            </div>

            <div>
              <Label>Tags</Label>
              <div className="mt-2">
                <MultiSelectDropdown
                  options={availableTags}
                  selectedValues={formData.tags}
                  onSelectionChange={(selectedTags) =>
                    setFormData((prev) => ({ ...prev, tags: selectedTags }))
                  }
                  placeholder="Select tags for supplier"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createSupplierMutation.isPending ||
                  updateSupplierMutation.isPending
                }
              >
                {createSupplierMutation.isPending ||
                updateSupplierMutation.isPending
                  ? "Saving..."
                  : selectedSupplier
                  ? "Update Supplier"
                  : "Create Supplier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupplierManagement;