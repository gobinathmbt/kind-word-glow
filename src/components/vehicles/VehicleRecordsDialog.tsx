import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { dashboardReportServices } from "@/api/services";
import { Loader2, Car, ChevronLeft, ChevronRight } from "lucide-react";

interface VehicleRecordsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
}

const VehicleRecordsDialog = ({
  isOpen,
  onClose,
  filters,
}: VehicleRecordsDialogProps) => {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-records", filters, page],
    queryFn: () =>
      dashboardReportServices.getVehicleRecords({
        ...filters,
        page,
        limit,
      }),
    enabled: isOpen && Object.keys(filters).length > 0,
  });

  const vehicles = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Vehicle Records ({total} total)
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No vehicles found for the selected filters
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock No</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workshop Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle: any) => (
                    <TableRow key={vehicle._id}>
                      <TableCell>
                        <span className="font-medium text-primary">
                          {vehicle.vehicle_stock_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {vehicle.vehicle_hero_image ? (
                              <img
                                src={vehicle.vehicle_hero_image}
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Car className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.year}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.plate_no}</TableCell>
                      <TableCell>
                        <span className="text-sm">{vehicle.vin}</span>
                      </TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vehicle.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className="capitalize"
                        >
                          {vehicle.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {Array.isArray(vehicle.workshop_progress)
                            ? vehicle.workshop_progress.length > 0
                              ? "Multiple Stages"
                              : "N/A"
                            : vehicle.workshop_progress?.replace("_", " ") || "N/A"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleRecordsDialog;
