
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { vehicleServices, companyServices, commonVehicleServices } from "@/api/services";
import { useQuery } from "@tanstack/react-query";
import FieldWithHistory from "@/components/common/FieldWithHistory";

interface VehicleOdometerSectionProps {
  vehicle: any;
  onUpdate: () => void;
}

interface OdometerEntry {
  _id?: string;
  reading: number | string;
  reading_date: string;
  odometerCertified: boolean;
  odometerStatus: string;
  created_at?: string;
}

const VehicleOdometerSection: React.FC<VehicleOdometerSectionProps> = ({ vehicle, onUpdate }) => {
  const [odometerEntries, setOdometerEntries] = useState<OdometerEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<OdometerEntry>({
    reading: "",
    reading_date: new Date().toISOString().split('T')[0],
    odometerCertified: false,
    odometerStatus: "",
  });

  // Fetch odometer status options from Master Dropdown (global)
  const { data: odometerStatusData, isLoading: isLoadingOdometerStatus, error: odometerStatusError } = useQuery({
    queryKey: ["odometer-status"],
    queryFn: async () => {
      try {
        // Fetch from global Master Dropdown
        const response = await companyServices.getMasterdropdownvalues({
          dropdown_name: ["odometer_status"],
        });
        
        // Response structure: { success: true, data: [{ dropdown_name, values: [...] }] }
        if (response.data?.success && response.data?.data && Array.isArray(response.data.data)) {
          // Find the odometer_status dropdown in the response
          const odometerDropdown = response.data.data.find(
            (item: any) => item.dropdown_name === "odometer_status"
          );
          
          if (odometerDropdown && odometerDropdown.values && Array.isArray(odometerDropdown.values)) {
            return odometerDropdown.values;
          }
          
        }
        return [];
      } catch (error) {
        console.error("Error fetching odometer status dropdown:", error);
        return [];
      }
    },
  });

  // Map dropdown values to options format
  const odometerStatusOptions = useMemo(() => {
    if (!odometerStatusData || !Array.isArray(odometerStatusData)) {
      return [];
    }
    
    if (odometerStatusData.length === 0) {
      return [];
    }

    const options = odometerStatusData
      .filter((item: any) => {
        // Only show active values with non-empty option_value
        return (
          item.is_active !== false &&
          item.option_value &&
          item.option_value.trim() !== ""
        );
      })
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)) // Sort by display_order
      .map((item: any) => ({
        value: item.option_value,
        label: item.display_value || item.option_value,
      }))
      .filter((option) => option.value && option.value.trim() !== ""); 
    return options;
  }, [odometerStatusData]);

  // Initialize odometer entries from vehicle data
  useEffect(() => {
    if (vehicle?.vehicle_odometer && Array.isArray(vehicle.vehicle_odometer)) {
      const entries = vehicle.vehicle_odometer.map((entry: any) => ({
        _id: entry._id || entry.id,
        reading: entry.reading || 0,
        reading_date: entry.reading_date
          ? new Date(entry.reading_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        odometerCertified: entry.odometerCertified || false,
        odometerStatus: entry.odometerStatus || "",
        created_at: entry.created_at,
      }));
      setOdometerEntries(entries);
    } else {
      setOdometerEntries([]);
    }
  }, [vehicle]);

  // Calculate latest reading (most recent entry's reading, not max reading)
  const latestReading = useMemo(() => {
    if (odometerEntries.length === 0) return 0;
    // Get the most recent entry (same logic as latestEntry)
    const sorted = [...odometerEntries].sort((a, b) => {
      // First priority: created_at (most recent entry first)
      if (a.created_at && b.created_at) {
        const createdA = new Date(a.created_at).getTime();
        const createdB = new Date(b.created_at).getTime();
        if (createdB !== createdA) return createdB - createdA;
      } else if (a.created_at && !b.created_at) return -1;
      else if (!a.created_at && b.created_at) return 1;
      
      // Second priority: reading_date descending
      const dateA = new Date(a.reading_date).getTime();
      const dateB = new Date(b.reading_date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      // Third priority: reading descending
      return Number(b.reading) - Number(a.reading);
    });
    return Number(sorted[0]?.reading) || 0;
  }, [odometerEntries]);

  // Get latest entry for summary display - based on last entered (created_at)
  const latestEntry = useMemo(() => {
    if (odometerEntries.length === 0) return null;
    // Sort by created_at descending (most recently created first), then by reading_date descending, then by reading descending
    const sorted = [...odometerEntries].sort((a, b) => {
      // First priority: created_at (most recent entry)
      if (a.created_at && b.created_at) {
        const createdA = new Date(a.created_at).getTime();
        const createdB = new Date(b.created_at).getTime();
        if (createdB !== createdA) return createdB - createdA;
      } else if (a.created_at && !b.created_at) return -1;
      else if (!a.created_at && b.created_at) return 1;
      
      // Second priority: reading_date descending
      const dateA = new Date(a.reading_date).getTime();
      const dateB = new Date(b.reading_date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      // Third priority: reading descending
      return Number(b.reading) - Number(a.reading);
    });
    return sorted[0];
  }, [odometerEntries]);

  // Get display values for summary
  const summaryStatus = useMemo(() => {
    if (!latestEntry?.odometerStatus) return "N/A";
    const foundOption = odometerStatusOptions.find(
      (opt) => opt.value === latestEntry.odometerStatus
    );
    return foundOption?.label || latestEntry.odometerStatus;
  }, [latestEntry, odometerStatusOptions]);
  
  const summaryCertified = latestEntry?.odometerCertified ? "Yes" : "No";

  const handleOpenDialog = (index: number | null = null) => {
    if (index !== null) {
      // Edit mode
      const entry = odometerEntries[index];
      setFormData({
        reading: entry.reading,
        reading_date: entry.reading_date,
        odometerCertified: entry.odometerCertified,
        odometerStatus: entry.odometerStatus,
        _id: entry._id,
      });
      setEditingIndex(index);
    } else {
      // Add mode
      setFormData({
        reading: "",
        reading_date: new Date().toISOString().split('T')[0],
        odometerCertified: false,
        odometerStatus: "",
      });
      setEditingIndex(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIndex(null);
    setFormData({
      reading: "",
      reading_date: new Date().toISOString().split('T')[0],
      odometerCertified: false,
      odometerStatus: "",
    });
  };

  const handleSaveEntry = async () => {
    // Validation
    if (!formData.reading || Number(formData.reading) < 0) {
      toast.error("Please enter a valid reading");
      return;
    }
    if (!formData.reading_date) {
      toast.error("Please select a reading date");
      return;
    }

    try {
      let updatedEntries: OdometerEntry[];

      if (editingIndex !== null) {
        // Update existing entry
        updatedEntries = [...odometerEntries];
        updatedEntries[editingIndex] = {
          ...formData,
          reading: Number(formData.reading),
          created_at: odometerEntries[editingIndex].created_at || new Date().toISOString(),
        };
      } else {
        // Add new entry
        const newEntry: OdometerEntry = {
          ...formData,
          reading: Number(formData.reading),
          created_at: new Date().toISOString(),
        };
        updatedEntries = [...odometerEntries, newEntry];
      }

      // Update backend - preserve _id if it exists for proper matching
      await commonVehicleServices.updateVehiclePricing(vehicle._id, vehicle.vehicle_type, {
        vehicle_odometer: updatedEntries.map((entry) => ({
          ...(entry._id && { _id: entry._id }), // Preserve _id if it exists
          reading: entry.reading,
          reading_date: entry.reading_date,
          odometerCertified: entry.odometerCertified,
          odometerStatus: entry.odometerStatus,
          created_at: entry.created_at,
        })),
        module_section: "Pricing Odometer"
      });

      setOdometerEntries(updatedEntries);
      toast.success(editingIndex !== null ? "Odometer entry updated successfully" : "Odometer entry added successfully");
      handleCloseDialog();
      onUpdate();
    } catch (error) {
      toast.error("Failed to save odometer entry");
      console.error(error);
    }
  };

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index);
    setDeleteDialogOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (deleteIndex === null) return;

    try {
      const updatedEntries = odometerEntries.filter((_, i) => i !== deleteIndex);

      await commonVehicleServices.updateVehiclePricing(vehicle._id, vehicle.vehicle_type, {
        vehicle_odometer: updatedEntries.map((entry) => ({
          ...(entry._id && { _id: entry._id }), // Preserve _id if it exists
          reading: entry.reading,
          reading_date: entry.reading_date,
          odometerCertified: entry.odometerCertified,
          odometerStatus: entry.odometerStatus,
          created_at: entry.created_at,
        })),
        module_section: "Pricing Odometer",
      });

      setOdometerEntries(updatedEntries);
      toast.success("Odometer entry deleted successfully");
      setDeleteDialogOpen(false);
      setDeleteIndex(null);
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete odometer entry");
      console.error(error);
    }
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="odometer">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Odometer</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Card>
            <CardContent className="pt-6">
              {/* Summary Section - Display only, with FieldWithHistory for activity tracking */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <FieldWithHistory
                  fieldName="odometerStatus"
                  fieldDisplayName="Odometer Status"
                  vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                  vehicleType={vehicle?.vehicle_type || "pricing"}
                  moduleName="Pricing Odometer"
                  label="Odometer Status"
                >
                  <p className="text-sm text-muted-foreground">
                    {summaryStatus}
                  </p>
                </FieldWithHistory>
                <FieldWithHistory
                  fieldName="odometerCertified"
                  fieldDisplayName="Odometer Certified"
                  vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                  vehicleType={vehicle?.vehicle_type || "pricing"}
                  moduleName="Pricing Odometer"
                  label="Odometer Certified"
                >
                  <p className="text-sm text-muted-foreground">
                    {summaryCertified}
                  </p>
                </FieldWithHistory>
                <FieldWithHistory
                  fieldName="reading"
                  fieldDisplayName="Latest Reading"
                  vehicleStockId={vehicle?.vehicle_stock_id || vehicle?._id}
                  vehicleType={vehicle?.vehicle_type || "pricing"}
                  moduleName="Pricing Odometer"
                  label="Latest Reading"
                >
                  <p className="text-sm text-muted-foreground">
                    {latestReading > 0 ? `${latestReading.toLocaleString()} km` : "N/A"}
                  </p>
                </FieldWithHistory>
              </div>

              {/* Table Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Odometer Entries</h3>
                  <Button onClick={() => handleOpenDialog(null)} size="sm" className="h-7 text-xs px-3">
                    <Plus className="h-3 w-3 mr-1.5" />
                    Add Entry
                  </Button>
                </div>

                {odometerEntries.length === 0 ? (
                  <div className="text-center py-3 text-muted-foreground text-xs">
                    <p>No odometer entries found. Click "Add Entry" to create one.</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <ScrollArea className="h-[120px] max-h-[120px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10 border-b">
                          <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="h-7 px-1.5 py-1 text-[11px] font-semibold w-16 border-0">Actions</TableHead>
                            <TableHead className="h-7 px-1.5 py-1 text-[11px] font-semibold border-0">Reading (km)</TableHead>
                            <TableHead className="h-7 px-1.5 py-1 text-[11px] font-semibold border-0">Reading Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {odometerEntries
                            .sort((a, b) => {
                              // Sort by created_at descending (last entered first), then by reading_date descending, then by reading descending
                              // First priority: created_at (most recent entry first)
                              if (a.created_at && b.created_at) {
                                const createdA = new Date(a.created_at).getTime();
                                const createdB = new Date(b.created_at).getTime();
                                if (createdB !== createdA) return createdB - createdA;
                              } else if (a.created_at && !b.created_at) return -1;
                              else if (!a.created_at && b.created_at) return 1;
                              
                              // Second priority: reading_date descending
                              const dateA = new Date(a.reading_date).getTime();
                              const dateB = new Date(b.reading_date).getTime();
                              if (dateB !== dateA) return dateB - dateA;
                              
                              // Third priority: reading descending
                              return Number(b.reading) - Number(a.reading);
                            })
                            .map((entry, index) => {
                              const originalIndex = odometerEntries.findIndex(
                                (e) => e._id === entry._id || 
                                (e.reading_date === entry.reading_date && e.reading === entry.reading)
                              );
                              return (
                                <TableRow key={entry._id || index} className="hover:bg-muted/50 border-0">
                                  <TableCell className="h-8 px-1.5 py-0.5 border-0">
                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenDialog(originalIndex)}
                                        className="h-5 w-5 p-0 hover:bg-muted"
                                      >
                                        <Edit className="h-2.5 w-2.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(originalIndex)}
                                        className="h-5 w-5 p-0 hover:bg-destructive/10"
                                      >
                                        <Trash2 className="h-2.5 w-2.5 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="h-8 px-1.5 py-0.5 text-[11px] font-medium border-0">
                                    {Number(entry.reading).toLocaleString()} km
                                  </TableCell>
                                  <TableCell className="h-8 px-1.5 py-0.5 text-[11px] text-muted-foreground border-0">
                                    {entry.reading_date
                                      ? new Date(entry.reading_date).toLocaleDateString()
                                      : "N/A"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Odometer Details</DialogTitle>
            <DialogDescription>
              {editingIndex !== null ? "Edit odometer entry details" : "Add a new odometer reading"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reading">Latest Reading (km) *</Label>
              <Input
                id="reading"
                type="number"
                min="0"
                value={formData.reading}
                onChange={(e) =>
                  setFormData({ ...formData, reading: e.target.value })
                }
                placeholder="Enter odometer reading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reading_date">Date *</Label>
              <Input
                id="reading_date"
                type="date"
                value={formData.reading_date}
                onChange={(e) =>
                  setFormData({ ...formData, reading_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odometer_status">Odometer Status</Label>
              <Select
                value={formData.odometerStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, odometerStatus: value })
                }
                disabled={isLoadingOdometerStatus}
              >
                <SelectTrigger id="odometer_status">
                  <SelectValue placeholder={isLoadingOdometerStatus ? "Loading..." : "Select status"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingOdometerStatus ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Loading options...
                    </div>
                  ) : odometerStatusOptions.length > 0 ? (
                    odometerStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No status options available. Please add values in Master Dropdown (odometer_status).
                    </div>
                  )}
                </SelectContent>
              </Select>
              {odometerStatusError && (
                <p className="text-sm text-destructive">
                  Error loading odometer status options
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="odometer_certified"
                checked={formData.odometerCertified}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, odometerCertified: checked === true })
                }
              />
              <Label htmlFor="odometer_certified" className="cursor-pointer">
                Odometer Certified
              </Label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveEntry}>
                <Save className="h-4 w-4 mr-2" />
                {editingIndex !== null ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Odometer Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this odometer entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteIndex(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Accordion>
  );
};

export default VehicleOdometerSection;
