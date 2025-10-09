import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import {
  Plus,
  Trash2,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  serviceBayServices,
  dealershipServices,
  companyServices,
} from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import DataTableLayout from "@/components/common/DataTableLayout";
import ReactSelect from "react-select";
import apiClient from "@/api/axios";

const daysOfWeek = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

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
  const [showTimings, setShowTimings] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const { completeUser } = useAuth();

  const [formData, setFormData] = useState({
    bay_name: "",
    bay_description: "",
    dealership_id: "",
    bay_users: [] as string[],
    primary_admin: "",
    bay_timings: daysOfWeek.map((day) => ({
      day_of_week: day.value,
      start_time: "09:00",
      end_time: "18:00",
      is_working_day: true,
    })),
  });

  // Fetch user info to check if primary admin
  const { data: userInfo } = useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const response = await apiClient.get("/api/auth/me");
      return response.data.user;
    },
  });

  const isPrimaryAdmin = userInfo?.is_primary_admin || false;

  // Fetch dealerships based on user role
  const { data: dealerships } = useQuery({
    queryKey: ["dealerships-dropdown", isPrimaryAdmin],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();

      // If not primary admin, filter to only show dealerships user has access to
      if (!isPrimaryAdmin && completeUser?.dealership_ids) {
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

  // Fetch company admin users based on selected dealership
  const {
    data: companyUsers,
    refetch: refetchUsers,
    isFetching: isFetchingUsers,
  } = useQuery({
    queryKey: ["company-admin-users", formData.dealership_id],
    queryFn: async () => {
      if (!formData.dealership_id) return [];

      const response = await companyServices.getUsers({
        role: "company_admin",
        dealership_id: formData.dealership_id,
      });

      // Filter to only include users with company_admin role
      const filteredUsers = response.data.data.filter(
        (user: any) => user.role === "company_admin"
      );

      return filteredUsers;
    },
    enabled: !!formData.dealership_id,
  });
  // Reset users when dealership changes
  useEffect(() => {
    if (formData.dealership_id) {
      setFormData((prev) => ({
        ...prev,
        bay_users: [],
        primary_admin: "",
      }));
      refetchUsers();
    }
  }, [formData.dealership_id, refetchUsers]);

  // Auto-select dealership if non-primary admin has only one dealership
  useEffect(() => {
    if (dealerships && dealerships.length > 0) {
      if (
        !isPrimaryAdmin &&
        dealerships.length === 1 &&
        !formData.dealership_id
      ) {
        setFormData((prev) => ({
          ...prev,
          dealership_id: dealerships[0]._id,
        }));
      }
    }
  }, [dealerships, isPrimaryAdmin, formData.dealership_id]);

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
      toast.error(
        error.response?.data?.message || "Failed to create service bay"
      );
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
      toast.error(
        error.response?.data?.message || "Failed to update service bay"
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.bay_name ||
      !formData.dealership_id ||
      !formData.primary_admin
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate timings
    const invalidTimings = formData.bay_timings.filter(
      (timing) =>
        timing.is_working_day && (!timing.start_time || !timing.end_time)
    );

    if (invalidTimings.length > 0) {
      toast.error("Please provide timings for all working days");
      return;
    }

    createBayMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.bay_name ||
      !formData.dealership_id ||
      !formData.primary_admin
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate timings
    const invalidTimings = formData.bay_timings.filter(
      (timing) =>
        timing.is_working_day && (!timing.start_time || !timing.end_time)
    );

    if (invalidTimings.length > 0) {
      toast.error("Please provide timings for all working days");
      return;
    }

    updateBayMutation.mutate({ id: selectedBay._id, data: formData });
  };

  const handleEdit = async (bay: any) => {
    setSelectedBay(bay);
    setIsLoadingUsers(true);

    const dealershipId = bay.dealership_id?._id || bay.dealership_id;
    const bayUsers = bay.bay_users?.map((u: any) => u._id || u) || [];
    const primaryAdmin = bay.primary_admin?._id || bay.primary_admin;

    // Set form data with dealership first to trigger users query
    setFormData({
      bay_name: bay.bay_name,
      bay_description: bay.bay_description || "",
      dealership_id: dealershipId,
      bay_users: [], // Temporarily empty
      primary_admin: "", // Temporarily empty
      bay_timings:
        bay.bay_timings ||
        daysOfWeek.map((day) => ({
          day_of_week: day.value,
          start_time: "09:00",
          end_time: "18:00",
          is_working_day: true,
        })),
    });

    setIsEditDialogOpen(true);

    // Wait for users to be fetched, then populate
    try {
      await refetchUsers();

      // Now set the users after a small delay to ensure data is loaded
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          bay_users: bayUsers,
          primary_admin: primaryAdmin,
        }));
        setIsLoadingUsers(false);
      }, 100);
    } catch (error) {
      console.error("Error fetching users:", error);
      setIsLoadingUsers(false);
      toast.error("Failed to load users");
    }
  };

  const handleDelete = (bayId: string) => {
    if (window.confirm("Are you sure you want to delete this bay?")) {
      deleteBayMutation.mutate(bayId);
    }
  };

  const handleToggleStatus = (bayId: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id: bayId, is_active: !currentStatus });
  };

  const handleTimingChange = (index: number, field: string, value: any) => {
    const updatedTimings = [...formData.bay_timings];
    updatedTimings[index] = {
      ...updatedTimings[index],
      [field]: value,
    };

    // If marking as non-working day, clear timings
    if (field === "is_working_day" && !value) {
      updatedTimings[index].start_time = "";
      updatedTimings[index].end_time = "";
    }

    setFormData({
      ...formData,
      bay_timings: updatedTimings,
    });
  };

  const resetForm = () => {
    setFormData({
      bay_name: "",
      bay_description: "",
      dealership_id:
        !isPrimaryAdmin && dealerships?.length === 1 ? dealerships[0]._id : "",
      bay_users: [],
      primary_admin: "",
      bay_timings: daysOfWeek.map((day) => ({
        day_of_week: day.value,
        start_time: "09:00",
        end_time: "18:00",
        is_working_day: true,
      })),
    });
    setShowTimings(false);
  };

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
      toast.error(
        error.response?.data?.message || "Failed to delete service bay"
      );
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const response = await serviceBayServices.toggleServiceBayStatus(id, {
        is_active,
      });
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
      className:
        "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
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
              <div className="text-sm text-muted-foreground">
                {bay.bay_description}
              </div>
            )}
          </TableCell>
          <TableCell>{bay.dealership_id?.dealership_name || "N/A"}</TableCell>
          <TableCell>
            <div>
              {bay.primary_admin?.first_name} {bay.primary_admin?.last_name}
              <Badge variant="outline" className="ml-2 text-xs">
                Company Admin
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{bay.bay_users?.length || 0} users</Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Switch
                checked={bay.is_active}
                onCheckedChange={() =>
                  handleToggleStatus(bay._id, bay.is_active)
                }
              />
              <span className="text-sm">
                {bay.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEdit(bay)}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Edit Bay</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleDelete(bay._id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete Bay</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>

          </TableCell>
        </TableRow>
      ))}
    </>
  );

  const renderTimingsForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Bay Timings</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowTimings(!showTimings)}
        >
          <Clock className="h-4 w-4 mr-2" />
          {showTimings ? "Hide Timings" : "Show Timings"}
        </Button>
      </div>

      {showTimings && (
        <div className="grid gap-4 p-4 border rounded-lg">
          {formData.bay_timings.map((timing, index) => (
            <div
              key={timing.day_of_week}
              className="grid grid-cols-12 gap-4 items-center"
            >
              <div className="col-span-3">
                <Label className="font-medium capitalize">
                  {timing.day_of_week}
                </Label>
              </div>
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={timing.is_working_day}
                    onCheckedChange={(checked) =>
                      handleTimingChange(index, "is_working_day", checked)
                    }
                  />
                  <Label className="text-sm">
                    {timing.is_working_day ? "Working" : "Holiday"}
                  </Label>
                </div>
              </div>
              <div className="col-span-3">
                <Input
                  type="time"
                  value={timing.start_time}
                  onChange={(e) =>
                    handleTimingChange(index, "start_time", e.target.value)
                  }
                  disabled={!timing.is_working_day}
                  required={timing.is_working_day}
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="time"
                  value={timing.end_time}
                  onChange={(e) =>
                    handleTimingChange(index, "end_time", e.target.value)
                  }
                  disabled={!timing.is_working_day}
                  required={timing.is_working_day}
                />
              </div>
              <div className="col-span-1 text-sm text-muted-foreground">
                {timing.is_working_day
                  ? `${timing.start_time} - ${timing.end_time}`
                  : "Holiday"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDealershipSelect = (isEditMode: boolean = false) => (
    <div>
      <Label htmlFor={isEditMode ? "edit_dealership_id" : "dealership_id"}>
        Dealership *
      </Label>
      <Select
        value={formData.dealership_id}
        onValueChange={(value) =>
          setFormData({ ...formData, dealership_id: value })
        }
        disabled={!isPrimaryAdmin && dealerships?.length === 1}
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
      {!isPrimaryAdmin && (
        <p className="text-sm text-muted-foreground mt-1">
          {dealerships?.length === 1
            ? "Your assigned dealership is automatically selected"
            : "You can only assign bays to dealerships you have access to"}
        </p>
      )}
    </div>
  );

  const renderUserSelects = (isEditMode: boolean = false) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor={isEditMode ? "edit_primary_admin" : "primary_admin"}>
          Primary Admin *{" "}
          <Badge variant="outline" className="ml-2">
            Company Admin Only
          </Badge>
        </Label>

        {(isFetchingUsers || isLoadingUsers) && formData.dealership_id ? (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm text-muted-foreground">
              Loading admins...
            </span>
          </div>
        ) : (
          <>
            <Select
              value={formData.primary_admin}
              onValueChange={(value) =>
                setFormData({ ...formData, primary_admin: value })
              }
              disabled={
                !formData.dealership_id || isFetchingUsers || isLoadingUsers
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    formData.dealership_id
                      ? "Select primary admin"
                      : "Select dealership first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {companyUsers?.map((u: any) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.first_name} {u.last_name} ({u.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.dealership_id && (
              <p className="text-sm text-muted-foreground mt-1">
                Please select a dealership first to see available company admins
              </p>
            )}
            {formData.dealership_id &&
              companyUsers?.length === 0 &&
              !isFetchingUsers &&
              !isLoadingUsers && (
                <p className="text-sm text-amber-600 mt-1">
                  No company admins available for this dealership
                </p>
              )}
          </>
        )}
      </div>

      <div>
        <Label>
          Bay Users{" "}
          <Badge variant="outline" className="ml-2">
            Company Admin Only
          </Badge>
        </Label>

        {(isFetchingUsers || isLoadingUsers) && formData.dealership_id ? (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm text-muted-foreground">
              Loading users...
            </span>
          </div>
        ) : (
          <>
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
              placeholder={
                formData.dealership_id
                  ? "Select bay users"
                  : "Select dealership first"
              }
              isDisabled={
                !formData.dealership_id || isFetchingUsers || isLoadingUsers
              }
              isLoading={isFetchingUsers || isLoadingUsers}
              className="react-select-container"
              classNamePrefix="react-select"
            />
            {formData.dealership_id &&
              companyUsers?.length === 0 &&
              !isFetchingUsers &&
              !isLoadingUsers && (
                <p className="text-sm text-amber-600 mt-1">
                  No company admins available for this dealership
                </p>
              )}
          </>
        )}
      </div>
    </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Service Bay</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

              {renderDealershipSelect()}
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

            {renderTimingsForm()}

            {renderUserSelects()}

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service Bay</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

              {renderDealershipSelect(true)}
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

            {renderTimingsForm()}

            {renderUserSelects(true)}

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
