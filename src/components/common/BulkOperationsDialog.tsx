import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  MoveHorizontal,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { dealershipServices, commonVehicleServices } from "@/api/services";
import { toast } from "sonner";
import { formatApiNames } from "@/utils/GlobalUtils";

interface BulkOperationsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleType: "inspection" | "tradein" | "advertisement" | "master";
  onSuccess?: () => void;
}

interface Vehicle {
  _id: string;
  vehicle_stock_id: number;
  make: string;
  model: string;
  year: number;
  variant?: string;
  plate_no: string;
  vin: string;
  status: string;
  dealership_id?: string;
  vehicle_hero_image?: string;
}

const BulkOperationsDialog: React.FC<BulkOperationsDialogProps> = ({
  isOpen,
  onOpenChange,
  vehicleType,
  onSuccess,
}) => {
  const { completeUser } = useAuth();
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dealershipFilter, setDealershipFilter] = useState("all");
  const [targetDealership, setTargetDealership] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch dealerships for filters and target selection
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
    enabled: isOpen && !!completeUser,
  });

  // Fetch vehicles for bulk operations
  const {
    data: vehiclesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "bulk-operations-vehicles",
      vehicleType,
      page,
      searchTerm,
      statusFilter,
      dealershipFilter,
      rowsPerPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        vehicle_type: vehicleType,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dealershipFilter !== "all")
        params.append("dealership_id", dealershipFilter);

      const response = await commonVehicleServices.getVehiclesForBulkOperations(
        {
          ...Object.fromEntries(params),
        }
      );
      return response.data;
    },
    enabled: isOpen,
  });

  const vehicles = vehiclesData?.data || [];
  const totalCount = vehiclesData?.total || 0;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVehicles(vehicles.map((v: Vehicle) => v._id));
    } else {
      setSelectedVehicles([]);
    }
  };

  // Handle individual vehicle selection
  const handleVehicleSelect = (vehicleId: string, checked: boolean) => {
    if (checked) {
      setSelectedVehicles([...selectedVehicles, vehicleId]);
    } else {
      setSelectedVehicles(selectedVehicles.filter((id) => id !== vehicleId));
    }
  };

  // Handle dealership update
  const handleUpdateDealership = async () => {
    if (!targetDealership) {
      toast.error("Please select a target dealership");
      return;
    }

    if (selectedVehicles.length === 0) {
      toast.error("Please select at least one vehicle");
      return;
    }

    setIsUpdating(true);
    try {
      await commonVehicleServices.updateVehicleDealership({
        vehicleIds: selectedVehicles,
        dealershipId: targetDealership,
        vehicleType,
      });

      toast.success(
        `Successfully updated dealership for ${selectedVehicles.length} vehicles`
      );
      setSelectedVehicles([]);
      setTargetDealership("");
      refetch();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Update dealership error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update dealership"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVehicles([]);
      setSearchTerm("");
      setStatusFilter("all");
      setDealershipFilter("all");
      setTargetDealership("");
      setPage(1);
    }
  }, [isOpen]);

  const getDealershipName = (dealershipId: string) => {
    const dealership = dealerships?.find(
      (dealer: any) => dealer._id === dealershipId
    );
       return dealership ? formatApiNames(dealership.dealership_name) : "Unknown";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "in_progress":
        return "default";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1600px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveHorizontal className="h-5 w-5" />
            Bulk Operations -{" "}
            {vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}{" "}
            Vehicles
          </DialogTitle>
          <DialogDescription>
            Select vehicles to perform bulk operations. Currently supports
            dealership movement.
          </DialogDescription>
        </DialogHeader>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[250px]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={dealershipFilter}
              onValueChange={setDealershipFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Dealership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dealerships</SelectItem>
                {dealerships?.map((dealer: any) => (
                  <SelectItem key={dealer._id} value={dealer._id}>
                    {dealer.dealership_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              value={targetDealership}
              onValueChange={setTargetDealership}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select target dealership" />
              </SelectTrigger>
              <SelectContent>
                {dealerships?.map((dealer: any) => (
                  <SelectItem key={dealer._id} value={dealer._id}>
                    {dealer.dealership_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleUpdateDealership}
              disabled={
                isUpdating || selectedVehicles.length === 0 || !targetDealership
              }
              className="whitespace-nowrap"
            >
              {isUpdating
                ? "Updating..."
                : `Move ${selectedVehicles.length} Vehicles`}
            </Button>
          </div>
        </div>

        {/* Vehicles Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedVehicles.length === vehicles.length &&
                      vehicles.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={vehicles.length === 0}
                  />
                </TableHead>
                <TableHead>Stock ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Dealership</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading vehicles...
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No vehicles found
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle: Vehicle) => (
                  <TableRow key={vehicle._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVehicles.includes(vehicle._id)}
                        onCheckedChange={(checked) =>
                          handleVehicleSelect(vehicle._id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {vehicle.vehicle_stock_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {vehicle.vehicle_hero_image ? (
                          <img
                            src={vehicle.vehicle_hero_image}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <MoveHorizontal className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {vehicle.year}{" "}
                            {vehicle.variant && `• ${vehicle.variant}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.plate_no}</TableCell>
                    <TableCell>
                      {vehicle.dealership_id ? (
                        <Badge variant="outline">
                          {getDealershipName(vehicle.dealership_id)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(vehicle.status)}>
                        {vehicle.status?.replace("_", " ") || "Unknown"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * rowsPerPage + 1} to{" "}
              {Math.min(page * rowsPerPage, totalCount)} of {totalCount}{" "}
              vehicles
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={
                      page === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum =
                    Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={pageNum === page}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className={
                      page === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => setRowsPerPage(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkOperationsDialog;
