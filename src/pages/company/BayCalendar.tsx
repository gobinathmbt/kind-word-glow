import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { bayBookingServices, serviceBayServices } from "@/api/services";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const BayCalendar = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedBay, setSelectedBay] = useState<string>("");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday

  // Fetch user's bays
  const { data: baysData } = useQuery({
    queryKey: ["user-bays-dropdown"],
    queryFn: async () => {
      const response = await serviceBayServices.getBaysDropdown();
      return response.data.data;
    },
  });

  // Fetch calendar data
  const { data: calendarData, isLoading } = useQuery({
    queryKey: [
      "bay-calendar",
      format(weekStart, "yyyy-MM-dd"),
      format(weekEnd, "yyyy-MM-dd"),
      selectedBay,
    ],
    queryFn: async () => {
      const response = await bayBookingServices.getBayCalendar(
        format(weekStart, "yyyy-MM-dd"),
        format(weekEnd, "yyyy-MM-dd"),
        selectedBay || undefined
      );
      return response.data.data;
    },
    enabled: !!baysData && baysData.length > 0,
  });

  // Set first bay as selected by default
  React.useEffect(() => {
    if (baysData && baysData.length > 0 && !selectedBay) {
      setSelectedBay(baysData[0]._id);
    }
  }, [baysData, selectedBay]);

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  // Generate time slots (30 min intervals)
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const bay = calendarData?.bays?.find((b: any) => b._id === selectedBay);
    
    if (!bay || !bay.bay_timings) return slots;

    const dayOfWeek = format(new Date(), "EEEE").toLowerCase();
    const timing = bay.bay_timings.find((t: any) => t.day_of_week === dayOfWeek);

    if (!timing || !timing.is_working_day) return slots;

    const [startHour, startMin] = timing.start_time.split(":").map(Number);
    const [endHour, endMin] = timing.end_time.split(":").map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(
        currentMin
      ).padStart(2, "0")}`;
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

  // Get bookings for a specific date and time
  const getBookingForSlot = (date: Date, time: string) => {
    if (!calendarData?.bookings) return null;

    const dateStr = format(date, "yyyy-MM-dd");
    return calendarData.bookings.find((booking: any) => {
      const bookingDate = format(parseISO(booking.booking_date), "yyyy-MM-dd");
      return (
        bookingDate === dateStr &&
        booking.booking_start_time <= time &&
        booking.booking_end_time > time &&
        booking.bay_id === selectedBay
      );
    });
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

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (!baysData || baysData.length === 0) {
    return (
      <DashboardLayout title="Bay Calendar">
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                No Bays Assigned
              </h3>
              <p className="text-muted-foreground">
                You are not assigned to any service bays. Please contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bay Calendar">
      <div className="space-y-4">
        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Bay Calendar
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div className="w-full sm:w-64">
                  <Select value={selectedBay} onValueChange={setSelectedBay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bay" />
                    </SelectTrigger>
                    <SelectContent>
                      {baysData?.map((bay: any) => (
                        <SelectItem key={bay._id} value={bay._id}>
                          {bay.bay_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
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
                    <div key={time} className="grid grid-cols-8 border-b">
                      <div className="p-3 font-medium border-r text-sm">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const booking = getBookingForSlot(day, time);
                        return (
                          <div
                            key={`${day.toISOString()}-${time}`}
                            className="p-2 border-r last:border-r-0 hover:bg-muted/30 transition-colors"
                          >
                            {booking && (
                              <div
                                className={`text-xs p-2 rounded-md border ${getStatusColor(
                                  booking.status
                                )}`}
                              >
                                <div className="font-medium truncate">
                                  {booking.field_name}
                                </div>
                                <div className="text-xs truncate">
                                  Stock: {booking.vehicle_stock_id}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-xs"
                                >
                                  {booking.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
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
    </DashboardLayout>
  );
};

export default BayCalendar;
