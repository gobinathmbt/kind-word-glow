import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { serviceBayServices, dealershipServices, companyServices } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import DataTableLayout from "@/components/common/DataTableLayout";
import ReactSelect from "react-select";

const ServiceBays = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBay, setSelectedBay] = useState<any>(null);

  const { completeUser } = useAuth();

  const [formData, setFormData] = useState({
    bay_name: "",
    bay_description: "",
    dealership_id: "",
    bay_users: [] as string[],
    primary_admin: "",
    bay_timings: [
      { day_of_week: "monday", start_time: "09:00", end_time: "18:00", is_working_day: true },
      { day_of_week: "tuesday", start_time: "09:00", end_time: "18:00", is_working_day: true },
      { day_of_week: "wednesday", start_time: "09:00", end_time: "18:00", is_working_day: true },
      { day_of_week: "thursday", start_time: "09:00", end_time: "18:00", is_working_day: true },
      { day_of_week: "friday", start_time: "09:00", end_time: "18:00", is_working_day: true },
      { day_of_week: "saturday", start_time: "09:00", end_time: "14:00", is_working_day: true },
      { day_of_week: "sunday", start_time: "09:00", end_time: "18:00", is_working_day: false },
    ],
  });

  // Fetch dealerships
  const { data: dealerships } = useQuery({
    queryKey: ["dealerships-dropdown"],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();
      return response.data.data;
    },
  });

  // Fetch company admin users
  const { data: companyUsers } = useQuery({
    queryKey: ["company-admin-users"],
    queryFn: async () => {
      const response = await companyServices.getUsers({ role: "company_admin" });
      return response.data.data;
    },
  });

  // Fetch all bays when pagination is disabled
  const fetchAllBays = async () => {
    let allData: any[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const params: any = {
        page: currentPage.toString(),
        limit: "100",
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.is_active = statusFilter === "active";

      const response = await serviceBayServices.getServiceBays(params);
      const responseData = response.data;

      allData = [...allData, ...responseData.data];

      if (responseData.data.length < 100) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }

    return {
      data: allData,
      total: allData.length,
      stats: {
        totalBays: allData.length,
        activeBays: allData.filter((b: any) => b.is_active).length,
        inactiveBays: allData.filter((b: any) => !b.is_active).length,
      },
    };
  };

  const {
    data: baysResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["service-bays", page, searchTerm, statusFilter, rowsPerPage]
      : ["all-service-bays", searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllBays();
      }

      const params: any = {
        page: page.toString(),
        limit: rowsPerPage.toString(),
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.is_active = statusFilter === "active";

      const response = await serviceBayServices.getServiceBays(params);
      return response.data;
    },
  });

  const bays = baysResponse?.data || [];
  const stats = baysResponse?.stats || {};

  // Sort bays when not using pagination
  const sortedBays = React.useMemo(() => {
    if (!sortField) return bays;

    return [...bays].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "bay_users_count") {
        aValue = a.bay_users?.length || 0;
        bValue = b.bay_users?.length || 0;
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
  }, [bays, sortField, sortOrder]);

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
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Create bay mutation
  const createBayMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await serviceBayServices.createServiceBay(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Service bay created successfully");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create service bay");
    },
  });

  // Update bay mutation
  const updateBayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await serviceBayServices.updateServiceBay(id, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Service bay updated successfully");
      setIsEditDialogOpen(false);
      setSelectedBay(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update service bay");
    },
  });

  // Delete bay mutation
  const deleteBayMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await serviceBayServices.deleteServiceBay(id);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Service bay deleted successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete service bay");
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await serviceBayServices.toggleServiceBayStatus(id, { is_active });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Status updated successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bay_name || !formData.dealership_id || !formData.primary_admin) {
      toast.error("Please fill all required fields");
      return;
    }

    createBayMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bay_name || !formData.dealership_id || !formData.primary_admin) {
      toast.error("Please fill all required fields");
      return;
    }

    updateBayMutation.mutate({ id: selectedBay._id, data: formData });
  };

  const handleEdit = (bay: any) => {
    setSelectedBay(bay);
    setFormData({
      bay_name: bay.bay_name,
      bay_description: bay.bay_description || "",
      dealership_id: bay.dealership_id?._id || bay.dealership_id,
      bay_users: bay.bay_users?.map((u: any) => u._id || u) || [],
      primary_admin: bay.primary_admin?._id || bay.primary_admin,
      bay_timings: bay.bay_timings || formData.bay_timings,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (bayId: string) => {
    if (window.confirm("Are you sure you want to delete this bay?")) {
      deleteBayMutation.mutate(bayId);
    }
  };

  const handleToggleStatus = (bayId: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id: bayId, is_active: !currentStatus });
  };

  const resetForm = () => {
    setFormData({
      bay_name: "",
      bay_description: "",
      dealership_id: "",
      bay_users: [],
      primary_admin: "",
      bay_timings: [
        { day_of_week: "monday", start_time: "09:00", end_time: "18:00", is_working_day: true },
        { day_of_week: "tuesday", start_time: "09:00", end_time: "18:00", is_working_day: true },
        { day_of_week: "wednesday", start_time: "09:00", end_time: "18:00", is_working_day: true },
        { day_of_week: "thursday", start_time: "09:00", end_time: "18:00", is_working_day: true },
        { day_of_week: "friday", start_time: "09:00", end_time: "18:00", is_working_day: true },
        { day_of_week: "saturday", start_time: "09:00", end_time: "14:00", is_working_day: true },
        { day_of_week: "sunday", start_time: "09:00", end_time: "18:00", is_working_day: false },
      ],
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const statChips = [
    {
      label: "Total Bays",
      value: stats.totalBays || 0,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
    {
      label: "Active",
      value: stats.activeBays || 0,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Inactive",
      value: stats.inactiveBays || 0,
      variant: "secondary" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
    },
  ];

  const actionButtons = [
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Add Service Bay",
      onClick: () => setIsDialogOpen(true),
      className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
  ];

  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("bay_name")}
      >
        <div className="flex items-center">
          Bay Name
          {getSortIcon("bay_name")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Dealership</TableHead>
      <TableHead className="bg-muted/50">Primary Admin</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("bay_users_count")}
      >
        <div className="flex items-center">
          Bay Users
          {getSortIcon("bay_users_count")}
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
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  const renderTableBody = () => (
    <>
      {sortedBays.map((bay: any, index: number) => (
        <TableRow key={bay._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div className="font-medium">{bay.bay_name}</div>
            {bay.bay_description && (
              <div className="text-sm text-muted-foreground">{bay.bay_description}</div>
            )}
          </TableCell>
          <TableCell>{bay.dealership_id?.dealership_name || "N/A"}</TableCell>
          <TableCell>
            {bay.primary_admin?.first_name} {bay.primary_admin?.last_name}
          </TableCell>
          <TableCell>
            <Badge variant="outline">{bay.bay_users?.length || 0} users</Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Switch
                checked={bay.is_active}
                onCheckedChange={() => handleToggleStatus(bay._id, bay.is_active)}
              />
              <span className="text-sm">
                {bay.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(bay)}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(bay._id)}
              >
                <Trash2 className="h-3 w-3" />
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
        title="Service Bays"
        data={sortedBays}
        isLoading={isLoading}
        totalCount={baysResponse?.total || 0}
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
        cookieName="service_bay_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {/* Create Bay Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Service Bay</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="bay_name">Bay Name *</Label>
              <Input
                id="bay_name"
                value={formData.bay_name}
                onChange={(e) =>
                  setFormData({ ...formData, bay_name: e.target.value })
                }
                placeholder="Enter bay name"
                required
              />
            </div>

            <div>
              <Label htmlFor="bay_description">Description</Label>
              <Input
                id="bay_description"
                value={formData.bay_description}
                onChange={(e) =>
                  setFormData({ ...formData, bay_description: e.target.value })
                }
                placeholder="Enter bay description"
              />
            </div>

            <div>
              <Label htmlFor="dealership_id">Dealership *</Label>
              <Select
                value={formData.dealership_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, dealership_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dealership" />
                </SelectTrigger>
                <SelectContent>
                  {dealerships?.map((d: any) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.dealership_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="primary_admin">Primary Admin *</Label>
              <Select
                value={formData.primary_admin}
                onValueChange={(value) =>
                  setFormData({ ...formData, primary_admin: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary admin" />
                </SelectTrigger>
                <SelectContent>
                  {companyUsers?.map((u: any) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.first_name} {u.last_name} ({u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bay Users</Label>
              <ReactSelect
                isMulti
                value={companyUsers
                  ?.filter((u: any) => formData.bay_users.includes(u._id))
                  .map((u: any) => ({
                    value: u._id,
                    label: `${u.first_name} ${u.last_name} (${u.username})`,
                  }))}
                onChange={(selected) =>
                  setFormData({
                    ...formData,
                    bay_users: selected.map((s: any) => s.value),
                  })
                }
                options={companyUsers?.map((u: any) => ({
                  value: u._id,
                  label: `${u.first_name} ${u.last_name} (${u.username})`,
                }))}
                placeholder="Select bay users"
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBayMutation.isPending}>
                {createBayMutation.isPending ? "Creating..." : "Create Bay"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bay Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service Bay</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit_bay_name">Bay Name *</Label>
              <Input
                id="edit_bay_name"
                value={formData.bay_name}
                onChange={(e) =>
                  setFormData({ ...formData, bay_name: e.target.value })
                }
                placeholder="Enter bay name"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit_bay_description">Description</Label>
              <Input
                id="edit_bay_description"
                value={formData.bay_description}
                onChange={(e) =>
                  setFormData({ ...formData, bay_description: e.target.value })
                }
                placeholder="Enter bay description"
              />
            </div>

            <div>
              <Label htmlFor="edit_dealership_id">Dealership *</Label>
              <Select
                value={formData.dealership_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, dealership_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dealership" />
                </SelectTrigger>
                <SelectContent>
                  {dealerships?.map((d: any) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.dealership_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_primary_admin">Primary Admin *</Label>
              <Select
                value={formData.primary_admin}
                onValueChange={(value) =>
                  setFormData({ ...formData, primary_admin: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary admin" />
                </SelectTrigger>
                <SelectContent>
                  {companyUsers?.map((u: any) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.first_name} {u.last_name} ({u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bay Users</Label>
              <ReactSelect
                isMulti
                value={companyUsers
                  ?.filter((u: any) => formData.bay_users.includes(u._id))
                  .map((u: any) => ({
                    value: u._id,
                    label: `${u.first_name} ${u.last_name} (${u.username})`,
                  }))}
                onChange={(selected) =>
                  setFormData({
                    ...formData,
                    bay_users: selected.map((s: any) => s.value),
                  })
                }
                options={companyUsers?.map((u: any) => ({
                  value: u._id,
                  label: `${u.first_name} ${u.last_name} (${u.username})`,
                }))}
                placeholder="Select bay users"
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedBay(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateBayMutation.isPending}>
                {updateBayMutation.isPending ? "Updating..." : "Update Bay"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceBays;