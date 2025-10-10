import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  HardHat,
  Users,
  Clock,
  Mail,
  User,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { serviceBayServices } from "@/api/services";
import BayBookingCalendar from "@/components/workshop/BayBookingCalendar";

interface BayBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  vehicleType: string;
  vehicleStockId: string;
  onSuccess: () => void;
  isManual?: boolean;
  manualQuoteAmount?: number;
}

const BayBookingDialog: React.FC<BayBookingDialogProps> = ({
  open,
  onOpenChange,
  field,
  vehicleType,
  vehicleStockId,
  onSuccess,
  isManual = false,
  manualQuoteAmount,
}) => {
  const [selectedBay, setSelectedBay] = useState<any>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedBayId, setSelectedBayId] = useState<string>("");

  const { data: baysData, isLoading } = useQuery({
    queryKey: ["company-bays-dropdown"],
    queryFn: async () => {
      const response = await serviceBayServices.getBaysDropdown();
      return response.data.data;
    },
    enabled: open,
  });

  React.useEffect(() => {
    if (field?.bay_id && baysData && !showCalendar && !selectedBay) {
      const bay = baysData.find((b: any) => b._id === field.bay_id);
      if (bay) {
        setSelectedBay(bay);
        setSelectedBayId(field.bay_id);
        setShowCalendar(true);
      }
    }
  }, [field?.bay_id, baysData, showCalendar, selectedBay]);

  const handleProceed = () => {
    if (!selectedBayId) return;

    const bay = baysData?.find((b: any) => b._id === selectedBayId);
    if (bay) {
      setSelectedBay(bay);
      setShowCalendar(true);
    }
  };

  const handleBack = () => {
    if (field.bay_id) {
      onOpenChange(false);
      setShowCalendar(false);
      setSelectedBay(null);
      setSelectedBayId("");
    } else {
      setShowCalendar(false);
      setSelectedBay(null);
      setSelectedBayId("");
    }
  };

  const handleBookingComplete = () => {
    onSuccess();
  };

  const getWorkingDaysCount = (bayTimings: any[]) => {
    if (!bayTimings) return 0;
    return bayTimings.filter((timing: any) => timing.is_working_day).length;
  };

  const getBayTimingsSummary = (bayTimings: any[]) => {
    if (!bayTimings || bayTimings.length === 0) return "No timings set";

    const workingDays = bayTimings.filter((t: any) => t.is_working_day);
    if (workingDays.length === 0) return "No working days";

    const times = workingDays.map((t) => `${t.start_time}-${t.end_time}`);
    const uniqueTimes = [...new Set(times)];

    if (uniqueTimes.length === 1) {
      return uniqueTimes[0];
    }
    return "Varied timings";
  };

  const selectedBayDetails = selectedBayId
    ? baysData?.find((b: any) => b._id === selectedBayId)
    : null;

  if (showCalendar && selectedBay) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0 overflow-hidden">
          <BayBookingCalendar
            bay={selectedBay}
            field={field}
            vehicleType={vehicleType}
            vehicleStockId={vehicleStockId}
            onBack={handleBack}
            onSuccess={handleBookingComplete}
            isManual={isManual}
            manualQuoteAmount={manualQuoteAmount}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Select Service Bay for Booking
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Field: {field?.field_name} • Stock ID: {vehicleStockId}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : baysData && baysData.length > 0 ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="bay-select" className="text-base font-semibold">
                Choose a Bay
              </Label>
              <Select value={selectedBayId} onValueChange={setSelectedBayId}>
                <SelectTrigger id="bay-select" className="w-full">
                  <SelectValue placeholder="Select a service bay..." />
                </SelectTrigger>
                <SelectContent>
                  {baysData.map((bay: any) => (
                    <SelectItem key={bay._id} value={bay._id}>
                      <div className="flex items-center gap-2">
                        <HardHat className="h-4 w-4" />
                        <span className="font-medium">{bay.bay_name}</span>
                        {bay.dealership_id && (
                          <span className="text-xs text-muted-foreground">
                            • {bay.dealership_id.dealership_name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBayDetails && (
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                        <HardHat className="h-5 w-5" />
                        {selectedBayDetails.bay_name}
                      </h3>
                      {selectedBayDetails.bay_description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {selectedBayDetails.bay_description}
                        </p>
                      )}
                      {selectedBayDetails.dealership_id && (
                        <Badge variant="outline" className="mb-2">
                          {selectedBayDetails.dealership_id.dealership_name}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Bay Users
                        </p>
                        <p className="font-semibold">
                          {selectedBayDetails.user_count || 0} User
                          {selectedBayDetails.user_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {selectedBayDetails.bay_timings && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                          <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Working Days
                          </p>
                          <p className="font-semibold">
                            {getWorkingDaysCount(
                              selectedBayDetails.bay_timings
                            )}
                            /7 Days
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                        <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Primary Admin
                        </p>
                        <p className="font-semibold truncate">
                          {selectedBayDetails.primary_admin_name}
                        </p>
                      </div>
                    </div>

                    {selectedBayDetails.bay_timings && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Working Hours
                          </p>
                          <p className="font-semibold truncate">
                            {getBayTimingsSummary(
                              selectedBayDetails.bay_timings
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded">
                      <Mail className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Admin Email
                      </p>
                      <p className="font-medium text-sm truncate">
                        {selectedBayDetails.primary_admin_email}
                      </p>
                    </div>
                  </div>

                  {selectedBayDetails.bay_timings &&
                    selectedBayDetails.bay_timings.length > 0 && (
                      <div className="mt-4 p-4 bg-background rounded-lg">
                        <p className="text-sm font-semibold mb-3">
                          Bay Schedule:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {selectedBayDetails.bay_timings.map((timing: any) => (
                            <div
                              key={timing._id}
                              className={`flex justify-between p-2 rounded ${
                                timing.is_working_day
                                  ? "bg-green-50 dark:bg-green-900/20"
                                  : "bg-gray-50 dark:bg-gray-900/20"
                              }`}
                            >
                              <span className="font-medium capitalize">
                                {timing.day_of_week}
                              </span>
                              <span
                                className={
                                  timing.is_working_day
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-gray-500"
                                }
                              >
                                {timing.is_working_day
                                  ? `${timing.start_time} - ${timing.end_time}`
                                  : "Closed"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="mt-6">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleProceed}
                    >
                      Proceed to Calendar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <HardHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Bays Available</h3>
            <p className="text-muted-foreground">
              Please contact your administrator to set up service bays.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BayBookingDialog;
