import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Save, HardHat } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bayBookingServices } from "@/api/services";
import { toast } from "sonner";
import DateTimePicker from "@/components/workshop/CommentSheetTabs/DateTimePicker";
import { format, parseISO, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";

interface BayBookingCalendarProps {
  bay: any;
  field: any;
  vehicleType: string;
  vehicleStockId: number;
  onBack: () => void;
  onSuccess: () => void;
}

const BayBookingCalendar: React.FC<BayBookingCalendarProps> = ({
  bay,
  field,
  vehicleType,
  vehicleStockId,
  onBack,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [bookingStartTime, setBookingStartTime] = useState("");
  const [bookingEndTime, setBookingEndTime] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [allowOverlap, setAllowOverlap] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  // Fetch existing booking for this field
  const { data: existingBooking } = useQuery({
    queryKey: ["field-bay-booking", vehicleType, vehicleStockId, field.field_id],
    queryFn: async () => {
      const response = await bayBookingServices.getBookingForField(
        vehicleType,
        vehicleStockId,
        field.field_id
      );
      return response.data.data;
    },
    enabled: !!field,
  });

  // Fetch calendar data for selected bay
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: [
      "bay-booking-calendar",
      bay._id,
      format(weekStart, "yyyy-MM-dd"),
      format(weekEnd, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const response = await bayBookingServices.getBayCalendar(
        format(weekStart, "yyyy-MM-dd"),
        format(weekEnd, "yyyy-MM-dd"),
        bay._id
      );
      return response.data.data;
    },
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await bayBookingServices.createBayBooking(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Bay booking created successfully");
      queryClient.invalidateQueries({ queryKey: ["field-bay-booking"] });
      queryClient.invalidateQueries({ queryKey: ["bay-booking-calendar"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create booking");
    },
  });

  const handleSubmitBooking = () => {
    if (!bookingStartTime || !bookingEndTime) {
      toast.error("Please select start and end time");
      return;
    }

    const startDate = new Date(bookingStartTime);
    const endDate = new Date(bookingEndTime);

    if (startDate >= endDate) {
      toast.error("End time must be after start time");
      return;
    }

    const bookingData = {
      vehicle_type: vehicleType,
      vehicle_stock_id: vehicleStockId,
      field_id: field.field_id,
      field_name: field.field_name,
      bay_id: bay._id,
      booking_date: format(startDate, "yyyy-MM-dd"),
      booking_start_time: format(startDate, "HH:mm"),
      booking_end_time: format(endDate, "HH:mm"),
      booking_description: bookingDescription,
      images: field.images || [],
      videos: field.videos || [],
    };

    createBookingMutation.mutate(bookingData);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      booking_request: "bg-yellow-100 text-yellow-800 border-yellow-200",
      booking_accepted: "bg-green-100 text-green-800 border-green-200",
      booking_rejected: "bg-red-100 text-red-800 border-red-200",
      work_in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      work_review: "bg-purple-100 text-purple-800 border-purple-200",
      completed_jobs: "bg-gray-100 text-gray-800 border-gray-200",
      rework: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Generate time slots for the selected bay
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const bayTiming = bay.bay_timings?.find((t: any) => t.is_working_day);

    if (!bayTiming) return slots;

    const [startHour, startMin] = bayTiming.start_time.split(":").map(Number);
    const [endHour, endMin] = bayTiming.end_time.split(":").map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
      slots.push(timeStr);
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get bookings for a specific date and time
  const getBookingForSlot = (date: Date, time: string) => {
    if (!calendarData?.bookings) return [];

    const dateStr = format(date, "yyyy-MM-dd");
    return calendarData.bookings.filter((booking: any) => {
      const bookingDate = format(parseISO(booking.booking_date), "yyyy-MM-dd");
      return (
        bookingDate === dateStr &&
        booking.booking_start_time <= time &&
        booking.booking_end_time > time
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bay Selection
        </Button>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Book Bay: {bay.bay_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Field: {field?.field_name} • Stock ID: {vehicleStockId}
          </p>
        </DialogHeader>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Existing Booking Warning */}
        {existingBooking && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="py-4">
              <p className="text-sm font-medium">
                This field already has a bay booking (Status: {existingBooking.status})
              </p>
            </CardContent>
          </Card>
        )}

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateTimePicker
                label="Start Date & Time"
                value={bookingStartTime}
                onChange={setBookingStartTime}
                placeholder="Select start time"
                required
              />

              <DateTimePicker
                label="End Date & Time"
                value={bookingEndTime}
                onChange={setBookingEndTime}
                placeholder="Select end time"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Work Description</Label>
              <Textarea
                id="description"
                value={bookingDescription}
                onChange={(e) => setBookingDescription(e.target.value)}
                placeholder="Describe the work to be done..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_overlap"
                checked={allowOverlap}
                onCheckedChange={(checked) => setAllowOverlap(checked as boolean)}
              />
              <Label
                htmlFor="allow_overlap"
                className="text-sm font-normal cursor-pointer"
              >
                Allow overlapping bookings (multiple works on same vehicle)
              </Label>
            </div>

            <Button
              onClick={handleSubmitBooking}
              disabled={createBookingMutation.isPending || !bookingStartTime || !bookingEndTime}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Bay Availability</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {calendarLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header */}
                  <div className="grid grid-cols-8 border-b bg-muted/50">
                    <div className="p-3 font-semibold border-r">Time</div>
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="p-3 text-center font-semibold border-r last:border-r-0"
                      >
                        <div>{format(day, "EEE")}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(day, "MMM dd")}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time slots */}
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b hover:bg-muted/20">
                      <div className="p-3 font-medium border-r text-sm">{time}</div>
                      {weekDays.map((day) => {
                        const bookingsInSlot = getBookingForSlot(day, time);
                        return (
                          <div
                            key={`${day.toISOString()}-${time}`}
                            className="p-2 border-r last:border-r-0"
                          >
                            {bookingsInSlot.length > 0 ? (
                              <div className="space-y-1">
                                {bookingsInSlot.map((booking: any, idx: number) => (
                                  <div
                                    key={booking._id}
                                    className={`text-xs p-2 rounded-md border ${getStatusColor(booking.status)}`}
                                  >
                                    <div className="font-medium truncate">
                                      {booking.field_name}
                                    </div>
                                    <div className="text-xs truncate">
                                      Stock: {booking.vehicle_stock_id}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                Available
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                Booking Request
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Accepted
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                In Progress
              </Badge>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                Under Review
              </Badge>
              <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                Completed
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BayBookingCalendar;
