import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Save, HardHat, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bayBookingServices } from "@/api/services";
import { toast } from "sonner";
import DateTimePicker from "@/components/workshop/CommentSheetTabs/DateTimePicker";
import { format, parseISO, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns";

interface BayBookingCalendarProps {
  bay: any;
  field: any;
  vehicleType: string;
  vehicleStockId: number;
  onBack: () => void;
  onSuccess: () => void;
}

interface BookingSlot {
  booking: any;
  startTime: string;
  endTime: string;
  rowSpan: number;
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
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

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
      setShowBookingDialog(false);
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
      booking_request: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 cursor-pointer",
      booking_accepted: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 cursor-pointer",
      booking_rejected: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 cursor-pointer",
      work_in_progress: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 cursor-pointer",
      work_review: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 cursor-pointer",
      completed_jobs: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 cursor-pointer",
      rework: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 cursor-pointer",
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

  // Calculate row span for merged booking slots
  const getBookingSlotsForDay = (date: Date): BookingSlot[] => {
    if (!calendarData?.bookings) return [];

    const dateStr = format(date, "yyyy-MM-dd");
    const dayBookings = calendarData.bookings.filter((booking: any) => {
      const bookingDate = format(parseISO(booking.booking_date), "yyyy-MM-dd");
      return bookingDate === dateStr;
    });

    const bookingSlots: BookingSlot[] = [];

    dayBookings.forEach((booking: any) => {
      const startIndex = timeSlots.findIndex(slot => slot === booking.booking_start_time);
      const endIndex = timeSlots.findIndex(slot => slot === booking.booking_end_time);
      
      if (startIndex !== -1 && endIndex !== -1) {
        bookingSlots.push({
          booking,
          startTime: booking.booking_start_time,
          endTime: booking.booking_end_time,
          rowSpan: endIndex - startIndex
        });
      }
    });

    return bookingSlots;
  };

  // Check if a time slot is part of a booking
  const getBookingForTimeSlot = (date: Date, time: string): BookingSlot | null => {
    const bookingSlots = getBookingSlotsForDay(date);
    return bookingSlots.find(slot => 
      time >= slot.startTime && time < slot.endTime
    ) || null;
  };

  // Check if a time slot is the start of a booking
  const isBookingStart = (date: Date, time: string): boolean => {
    const bookingSlot = getBookingForTimeSlot(date, time);
    return bookingSlot ? bookingSlot.startTime === time : false;
  };

  const handleSlotClick = (date: Date, time: string) => {
    const bookingSlot = getBookingForTimeSlot(date, time);
    if (bookingSlot) {
      setSelectedBooking(bookingSlot.booking);
    } else {
      // Open booking dialog for available slot
      const selectedDateTime = new Date(date);
      const [hours, minutes] = time.split(':').map(Number);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      setBookingStartTime(selectedDateTime.toISOString());
      setShowBookingDialog(true);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 sticky top-0 z-10">
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

      {/* Scrollable Content */}
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
            <p className="text-sm text-muted-foreground">
              {format(weekStart, "MMM dd")} - {format(weekEnd, "MMM dd, yyyy")}
            </p>
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
                  <div className="grid grid-cols-8 border-b bg-muted/50 sticky top-0 z-5">
                    <div className="p-3 font-semibold border-r">Time</div>
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={`p-3 text-center font-semibold border-r last:border-r-0 ${
                          isSameDay(day, new Date()) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <div>{format(day, "EEE")}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(day, "MMM dd")}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time slots */}
                  <div className="max-h-96 overflow-y-auto">
                    {timeSlots.map((time, timeIndex) => (
                      <div key={time} className="grid grid-cols-8 border-b hover:bg-muted/20">
                        <div className="p-3 font-medium border-r text-sm bg-muted/30 sticky left-0">
                          {time}
                        </div>
                        {weekDays.map((day) => {
                          const bookingSlot = getBookingForTimeSlot(day, time);
                          const isStart = isBookingStart(day, time);
                          
                          return (
                            <div
                              key={`${day.toISOString()}-${time}`}
                              className="p-1 border-r last:border-r-0 min-h-16"
                              onClick={() => handleSlotClick(day, time)}
                            >
                              {bookingSlot ? (
                                isStart && (
                                  <div
                                    className={`h-full p-2 rounded-md border ${getStatusColor(bookingSlot.booking.status)}`}
                                    style={{ gridRow: `span ${bookingSlot.rowSpan}` }}
                                  >
                                    <div className="font-medium text-xs truncate">
                                      {bookingSlot.booking.field_name}
                                    </div>
                                    <div className="text-xs truncate">
                                      Stock: {bookingSlot.booking.vehicle_stock_id}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {bookingSlot.startTime} - {bookingSlot.endTime}
                                    </div>
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {bookingSlot.booking.status.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                )
                              ) : (
                                <div className="h-full flex items-center justify-center text-xs text-muted-foreground hover:bg-green-50 hover:text-green-700 cursor-pointer rounded-md border border-dashed border-transparent hover:border-green-200 transition-colors">
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
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                Rework
              </Badge>
              <Badge className="bg-red-100 text-red-800 border-red-200">
                Rejected
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Footer */}
      <div className="border-t bg-background p-4 sticky bottom-0 z-10">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bay Selection
          </Button>
          <Button onClick={() => setShowBookingDialog(true)}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Booking Details Dialog */}
      {showBookingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <DialogTitle>Create New Booking</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBookingDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
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

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitBooking}
                  disabled={createBookingMutation.isPending || !bookingStartTime || !bookingEndTime}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details View Dialog */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <DialogTitle>Booking Details</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBooking(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Field Name</Label>
                  <p className="text-sm">{selectedBooking.field_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Stock ID</Label>
                  <p className="text-sm">{selectedBooking.vehicle_stock_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Booking Date</Label>
                  <p className="text-sm">
                    {format(parseISO(selectedBooking.booking_date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Time Slot</Label>
                  <p className="text-sm">
                    {selectedBooking.booking_start_time} - {selectedBooking.booking_end_time}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={`mt-1 ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {selectedBooking.booking_description && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm mt-1">{selectedBooking.booking_description}</p>
                  </div>
                )}
              </div>
              
              <div className="pt-4">
                <Button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BayBookingCalendar;