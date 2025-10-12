import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Car, Search, Loader2, Calendar, DollarSign, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commonVehicleServices } from "@/api/services";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, differenceInDays } from "date-fns";
import type { DateRange } from "react-day-picker";

interface KanbanReportDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleType: string;
}

// Status columns configuration
const STATUS_COLUMNS = [
  { id: "pending", label: "Pending", color: "bg-yellow-100 border-yellow-300" },
  { id: "processing", label: "Processing", color: "bg-blue-100 border-blue-300" },
  { id: "completed", label: "Completed", color: "bg-green-100 border-green-300" },
  { id: "failed", label: "Failed", color: "bg-red-100 border-red-300" },
];

// Vehicle Card Component
const VehicleCard = ({ vehicle, isDragging }: { vehicle: any; isDragging?: boolean }) => {
  const daysUntilExpiry = vehicle.regoExpiry 
    ? differenceInDays(new Date(vehicle.regoExpiry), new Date())
    : null;

  const expiryColor = daysUntilExpiry !== null
    ? daysUntilExpiry > 30 
      ? "bg-green-100 text-green-800 border-green-300"
      : daysUntilExpiry >= 7
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-red-100 text-red-800 border-red-300"
    : "bg-gray-100 text-gray-800 border-gray-300";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={`mb-3 cursor-move hover:shadow-lg transition-shadow ${
              isDragging ? "opacity-50" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {vehicle.vehicle_hero_image ? (
                    <img
                      src={vehicle.vehicle_hero_image}
                      alt={vehicle.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Car className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{vehicle.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock: {vehicle.vehicle_stock_id}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {daysUntilExpiry !== null && (
                      <Badge variant="outline" className={`text-xs ${expiryColor}`}>
                        {daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : "Expired"}
                      </Badge>
                    )}
                    {vehicle.workshop_quotes.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                        {vehicle.workshop_quotes.length} Quotes
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm">
          <div className="space-y-2">
            <p className="font-semibold">{vehicle.title}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Rego:</span>
                <p className="font-medium">{vehicle.plate_no}</p>
              </div>
              <div>
                <span className="text-muted-foreground">VIN:</span>
                <p className="font-medium truncate">{vehicle.vin}</p>
              </div>
              {vehicle.regoExpiry && (
                <div>
                  <span className="text-muted-foreground">Rego Expiry:</span>
                  <p className="font-medium">
                    {format(new Date(vehicle.regoExpiry), "dd MMM yyyy")}
                  </p>
                </div>
              )}
              {vehicle.purchasePrice > 0 && (
                <div>
                  <span className="text-muted-foreground">Purchase Price:</span>
                  <p className="font-medium">${vehicle.purchasePrice.toLocaleString()}</p>
                </div>
              )}
              {vehicle.purchaseDate && (
                <div>
                  <span className="text-muted-foreground">Purchase Date:</span>
                  <p className="font-medium">
                    {format(new Date(vehicle.purchaseDate), "dd MMM yyyy")}
                  </p>
                </div>
              )}
            </div>
            {vehicle.workshop_quotes.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold mb-1">Workshop Quotes:</p>
                <div className="space-y-1">
                  {vehicle.workshop_quotes.slice(0, 3).map((quote: any) => (
                    <div key={quote._id} className="text-xs flex justify-between">
                      <span className="truncate mr-2">{quote.field_name}</span>
                      <span className="font-medium">${quote.quote_amount}</span>
                    </div>
                  ))}
                  {vehicle.workshop_quotes.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{vehicle.workshop_quotes.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Sortable Vehicle Card
const SortableVehicleCard = ({ vehicle }: { vehicle: any }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vehicle._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <VehicleCard vehicle={vehicle} isDragging={isDragging} />
    </div>
  );
};

// Kanban Column Component
const KanbanColumn = ({ status, vehicles, count }: { status: any; vehicles: any[]; count: number }) => {
  return (
    <div className="flex-shrink-0 w-80">
      <div className={`rounded-lg border-2 ${status.color} h-full flex flex-col`}>
        <div className="p-4 border-b bg-background/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{status.label}</h3>
            <Badge variant="secondary" className="ml-2">
              {count}
            </Badge>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <SortableContext items={vehicles.map((v) => v._id)} strategy={verticalListSortingStrategy}>
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No vehicles in this status
              </div>
            ) : (
              vehicles.map((vehicle) => (
                <SortableVehicleCard key={vehicle._id} vehicle={vehicle} />
              ))
            )}
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
};

const KanbanReportDialog: React.FC<KanbanReportDialogProps> = ({ open, onClose, vehicleType }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Default to last 7 days
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultStartDate,
    to: defaultEndDate,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch kanban data
  const { data: kanbanData, isLoading } = useQuery({
    queryKey: [
      "kanban-report",
      vehicleType,
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
    ],
    queryFn: async () => {
      const params: any = { vehicle_type: vehicleType };
      if (dateRange?.from) params.start_date = dateRange.from.toISOString();
      if (dateRange?.to) params.end_date = dateRange.to.toISOString();

      const response = await commonVehicleServices.getKanbanReport(params);
      return response.data.data;
    },
    enabled: open,
    staleTime: 30000,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ vehicleId, status }: { vehicleId: string; status: string }) => {
      return await commonVehicleServices.updateVehicleStatus(vehicleId, {
        vehicle_type: vehicleType,
        status,
      });
    },
    onSuccess: () => {
      toast.success("Vehicle status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["kanban-report"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update vehicle status");
    },
  });

  // Filter vehicles by search term
  const filteredVehicles = React.useMemo(() => {
    if (!kanbanData?.vehicles) return [];
    
    if (!searchTerm) return kanbanData.vehicles;

    const term = searchTerm.toLowerCase();
    return kanbanData.vehicles.filter((vehicle: any) =>
      vehicle.plate_no?.toLowerCase().includes(term) ||
      vehicle.vin?.toLowerCase().includes(term) ||
      vehicle.title?.toLowerCase().includes(term) ||
      vehicle.vehicle_stock_id?.toString().includes(term)
    );
  }, [kanbanData?.vehicles, searchTerm]);

  // Group vehicles by status
  const vehiclesByStatus = React.useMemo(() => {
    const grouped: Record<string, any[]> = {
      pending: [],
      processing: [],
      completed: [],
      failed: [],
    };

    filteredVehicles.forEach((vehicle: any) => {
      const status = vehicle.status || "pending";
      if (grouped[status]) {
        grouped[status].push(vehicle);
      }
    });

    return grouped;
  }, [filteredVehicles]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeVehicle = filteredVehicles.find((v: any) => v._id === active.id);
    const overColumn = STATUS_COLUMNS.find((col) =>
      vehiclesByStatus[col.id]?.some((v: any) => v._id === over.id)
    );

    if (activeVehicle && overColumn && activeVehicle.status !== overColumn.id) {
      updateStatusMutation.mutate({
        vehicleId: activeVehicle.vehicle_stock_id,
        status: overColumn.id,
      });
    }

    setActiveId(null);
  };

  const activeVehicle = activeId ? filteredVehicles.find((v: any) => v._id === activeId) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Trade-In Vehicle Kanban Report</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-4 items-center pb-4 border-b">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by registration, VIN, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-[300px]"
          />
        </div>

        {/* Statistics */}
        {kanbanData?.statistics && (
          <div className="flex gap-4 pb-4">
            <Badge variant="outline" className="px-4 py-2">
              Total: {kanbanData.statistics.total}
            </Badge>
            {STATUS_COLUMNS.map((status) => (
              <Badge key={status.id} variant="outline" className="px-4 py-2">
                {status.label}: {kanbanData.statistics.by_status[status.id] || 0}
              </Badge>
            ))}
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <ScrollArea className="h-full">
                <div className="flex gap-4 h-full p-1">
                  {STATUS_COLUMNS.map((status) => (
                    <KanbanColumn
                      key={status.id}
                      status={status}
                      vehicles={vehiclesByStatus[status.id] || []}
                      count={vehiclesByStatus[status.id]?.length || 0}
                    />
                  ))}
                </div>
              </ScrollArea>
              <DragOverlay>
                {activeVehicle ? <VehicleCard vehicle={activeVehicle} isDragging /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KanbanReportDialog;
