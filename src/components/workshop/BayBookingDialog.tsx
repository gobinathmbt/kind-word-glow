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
import { HardHat, Users, Clock, ChevronRight, Mail, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { serviceBayServices } from "@/api/services";
import BayBookingCalendar from "./BayBookingCalendar";

interface BayBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  categoryId: string | null;
  sectionId: string;
  vehicleType: string;
  vehicleStockId: number;
}

const BayBookingDialog: React.FC<BayBookingDialogProps> = ({
  open,
  onOpenChange,
  field,
  categoryId,
  sectionId,
  vehicleType,
  vehicleStockId,
}) => {
  const [selectedBay, setSelectedBay] = useState<any>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Fetch available bays
  const { data: baysData, isLoading } = useQuery({
    queryKey: ["company-bays-dropdown"],
    queryFn: async () => {
      const response = await serviceBayServices.getBaysDropdown();
      return response.data.data;
    },
    enabled: open,
  });

  const handleBaySelect = (bay: any) => {
    setSelectedBay(bay);
    setShowCalendar(true);
  };

  const handleBack = () => {
    setShowCalendar(false);
    setSelectedBay(null);
  };

  const handleBookingComplete = () => {
    setShowCalendar(false);
    setSelectedBay(null);
    onOpenChange(false);
  };

  // Function to get working days count
  const getWorkingDaysCount = (bayTimings: any[]) => {
    if (!bayTimings) return 0;
    return bayTimings.filter((timing: any) => timing.is_working_day).length;
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {baysData.map((bay: any) => (
              <Card
                key={bay._id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
                onClick={() => handleBaySelect(bay)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {bay.bay_name}
                      </h3>
                      {bay.bay_description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {bay.bay_description}
                        </p>
                      )}
                      {bay.dealership_id && (
                        <Badge variant="outline" className="mb-2">
                          {bay.dealership_id.dealership_name}
                        </Badge>
                      )}
                    </div>
                    <Badge variant={"default"}>Active</Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    {/* Bay Users Count */}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {bay.user_count || 0} Bay User
                        {bay.user_count !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Primary Admin Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Primary Admin: </span>
                        <span>{bay.primary_admin_name}</span>
                      </div>
                    </div>

                    {/* Primary Admin Email */}
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Admin Email: </span>
                        <span className="text-muted-foreground">
                          {bay.primary_admin_email}
                        </span>
                      </div>
                    </div>

                    {/* Working Hours */}
                    {bay.bay_timings && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Working Days: {getWorkingDaysCount(bay.bay_timings)}/7
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button className="w-full mt-2" variant="outline">
                    Select This Bay
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
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
