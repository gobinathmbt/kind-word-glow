import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bayQuoteServices, serviceBayServices } from "@/api/services";
import {
  format,
  parseISO,
  addWeeks,
  subWeeks,
  addDays,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  isSameDay,
} from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  Play,
  Send,
  MessageSquare,
  Eye,
  DollarSign,
  Edit,
  RefreshCw,
  Ban,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import CommentSheetModal from "@/components/workshop/CommentSheetModal";
import ChatModal from "@/components/workshop/ChatModal";
import DateTimePicker from "@/components/workshop/CommentSheetTabs/DateTimePicker";

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
  status: string;
  fieldName: string;
  stockId: number;
  fieldId: string;
  type: "booking" | "holiday";
}

const BayCalendar = () => {
  const { completeUser } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);
  const [selectedBay, setSelectedBay] = useState<string>("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [commentViewSheetOpen, setCommentViewSheetOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [showLegendDialog, setShowLegendDialog] = useState(false);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [showHolidayDetailsDialog, setShowHolidayDetailsDialog] =
    useState(false);
  const [workMode, setWorkMode] = useState<"submit" | "edit">("submit");
  const [mode, setMode] = useState<"company_view" | "supplier_submit">(
    "supplier_submit"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [holidayStartTime, setHolidayStartTime] = useState("");
  const [holidayEndTime, setHolidayEndTime] = useState("");
  const [holidayReason, setHolidayReason] = useState("");
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);
  const calendarRef = useRef<any>(null);

  // Fetch user's bays
const { data: baysData, refetch: refetchBays } = useQuery({
  queryKey: ["user-bays-dropdown"],
  queryFn: async () => {
    const response = await serviceBayServices.getBaysDropdown();
    
    // Filter bays based on user access
    const filteredBays = response.data.data.filter((bay: any) => {
      const userId = completeUser?.id;
      
      // Check if user is primary admin
      const isPrimaryAdmin = bay.primary_admin?._id === userId;
      
      // Check if user is in bay_users array
      const isBayUser = bay.bay_users?.some((user: any) => user._id === userId);
      
      // Show bay only if user is either primary admin OR bay user
      return isPrimaryAdmin || isBayUser;
    });
    
    return filteredBays;
  },
});

  // Calculate date range for calendar data
  const getDateRange = () => {
    switch (view) {
      case Views.DAY:
        return {
          start: currentDate,
          end: currentDate,
        };
      case Views.WEEK:
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case Views.MONTH:
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(addDays(currentDate, 35), { weekStartsOn: 1 }),
        };
      default:
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch calendar data
  const {
    data: calendarData,
    isLoading,
    refetch: refetchCalendar,
  } = useQuery({
    queryKey: [
      "bay-calendar",
      format(dateRange.start, "yyyy-MM-dd"),
      format(dateRange.end, "yyyy-MM-dd"),
      selectedBay,
    ],
    queryFn: async () => {
      const response = await bayQuoteServices.getBayCalendar(
        format(dateRange.start, "yyyy-MM-dd"),
        format(dateRange.end, "yyyy-MM-dd"),
        selectedBay || undefined
      );
      return response.data.data;
    },
    enabled: !!baysData && baysData.length > 0,
  });

  // Fetch bay holidays
  const { data: bayHolidays, refetch: refetchHolidays } = useQuery({
    queryKey: ["bay-holidays", selectedBay],
    queryFn: async () => {
      if (!selectedBay) return [];
      const response = await serviceBayServices.getBayHolidays(
        format(dateRange.start, "yyyy-MM-dd"),
        format(dateRange.end, "yyyy-MM-dd"),
        selectedBay || undefined
      );
      return response?.data?.data || [];
    },
    enabled: !!selectedBay,
  });


  // Set first bay as selected by default
  React.useEffect(() => {
    if (baysData && baysData.length > 0 && !selectedBay) {
      setSelectedBay(baysData[0]._id);
    }
  }, [baysData, selectedBay]);

  // Convert bookings to calendar events
  const events: CalendarEvent[] = React.useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add bookings
    if (calendarData?.bookings) {
      calendarData.bookings.forEach((booking: any) => {
        const startDate = parseISO(booking.booking_date);
        const [startHours, startMinutes] = booking.booking_start_time
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = booking.booking_end_time
          .split(":")
          .map(Number);

        const start = new Date(startDate);
        start.setHours(startHours, startMinutes, 0, 0);

        const end = new Date(startDate);
        end.setHours(endHours, endMinutes, 0, 0);

        events.push({
          id: booking._id,
          title: `${booking.field_name} (Stock: ${booking.vehicle_stock_id})`,
          start,
          end,
          resource: booking,
          status: booking.status,
          fieldName: booking.field_name,
          stockId: booking.vehicle_stock_id,
          fieldId: booking.field_id,
          type: "booking",
        });
      });
    }

    // Add holidays - properly access the holidays array
    if (bayHolidays && Array.isArray(bayHolidays)) {
      bayHolidays.forEach((bay: any) => {
        if (bay.holidays && Array.isArray(bay.holidays)) {
          bay.holidays.forEach((holiday: any) => {
            const startDate = new Date(holiday.date);
            const [startHours, startMinutes] = holiday.start_time
              ?.split(":")
              .map(Number) || [0, 0];
            const [endHours, endMinutes] = holiday.end_time
              ?.split(":")
              .map(Number) || [0, 0];

            const start = new Date(startDate);
            start.setHours(startHours, startMinutes, 0, 0);

            const end = new Date(startDate);
            end.setHours(endHours, endMinutes, 0, 0);

            // Validate the dates are valid
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
              console.error("Invalid holiday date:", holiday);
              return;
            }

            events.push({
              id: `holiday-${holiday._id}`,
              title: `Holiday: ${holiday.reason || "No reason provided"}`,
              start,
              end,
              resource: holiday,
              status: "holiday",
              fieldName: "Holiday",
              stockId: 0,
              fieldId: "holiday",
              type: "holiday",
            });
          });
        }
      });
    }

    return events;
  }, [calendarData, bayHolidays]);

  // Add holiday mutation
  const addHolidayMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await serviceBayServices.addBayHoliday(
        selectedBay,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holiday marked successfully");
      queryClient.invalidateQueries({ queryKey: ["bay-holidays"] });
      setShowHolidayDialog(false);
      resetHolidayForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to mark holiday");
    },
  });

  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: string) => {
      const response = await serviceBayServices.removeBayHoliday(
        selectedBay,
        holidayId
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Holiday removed successfully");
      queryClient.invalidateQueries({ queryKey: ["bay-holidays"] });
      setShowHolidayDetailsDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to remove holiday");
    },
  });

  const resetHolidayForm = () => {
    setHolidayStartTime("");
    setHolidayEndTime("");
    setHolidayReason("");
  };

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchBays(), refetchCalendar(), refetchHolidays()]);
      toast.success("Calendar refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh calendar");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper function to get day name from date
  const getDayName = (date: Date): string => {
    return format(date, "eeee").toLowerCase();
  };

  // Get bay timings for the selected bay
  const selectedBayData = baysData?.find((bay: any) => bay._id === selectedBay);
  const bayTimings = selectedBayData?.bay_timings || [];

   const isPrimaryAdmin = selectedBayData?.primary_admin?._id === completeUser?.id;
   const isSelectable = isPrimaryAdmin;

  // Holiday submission function
  const handleSubmitHoliday = async () => {
    if (!holidayStartTime || !holidayEndTime) {
      toast.error("Please select start and end time");
      return;
    }

    const startDate = new Date(holidayStartTime);
    const endDate = new Date(holidayEndTime);

    if (startDate >= endDate) {
      toast.error("End time must be after start time");
      return;
    }

    // Additional validation: Check if the day is a working day
    const dayName = getDayName(startDate);
    const dayTiming = bayTimings.find(
      (timing: any) => timing.day_of_week === dayName
    );

    if (!dayTiming || !dayTiming.is_working_day) {
      toast.error("Cannot mark holiday on a non-working day");
      return;
    }

    // Validate time is within working hours
    const [bayStartHour, bayStartMinute] = dayTiming.start_time
      .split(":")
      .map(Number);
    const [bayEndHour, bayEndMinute] = dayTiming.end_time.split(":").map(Number);

    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();

    const isBeforeStart =
      startHour < bayStartHour ||
      (startHour === bayStartHour && startMinute < bayStartMinute);

    const isAfterEnd =
      endHour > bayEndHour ||
      (endHour === bayEndHour && endMinute > bayEndMinute);

    if (isBeforeStart || isAfterEnd) {
      toast.error(
        `Holiday time must be within working hours (${dayTiming.start_time} - ${dayTiming.end_time})`
      );
      return;
    }

    // Check for overlapping holidays
    if (bayHolidays && Array.isArray(bayHolidays)) {
      let hasOverlappingHoliday = false;

      bayHolidays.forEach((bay: any) => {
        if (bay.holidays && Array.isArray(bay.holidays)) {
          bay.holidays.forEach((holiday: any) => {
            const holidayDate = new Date(holiday.date);
            
            if (isSameDay(holidayDate, startDate)) {
              const [holidayStartHour, holidayStartMinute] = holiday.start_time
                ?.split(":")
                .map(Number) || [0, 0];
              const [holidayEndHour, holidayEndMinute] = holiday.end_time
                ?.split(":")
                .map(Number) || [0, 0];

              const holidayStart = new Date(holidayDate);
              holidayStart.setHours(holidayStartHour, holidayStartMinute, 0, 0);

              const holidayEnd = new Date(holidayDate);
              holidayEnd.setHours(holidayEndHour, holidayEndMinute, 0, 0);

              if (
                (startDate >= holidayStart && startDate < holidayEnd) ||
                (endDate > holidayStart && endDate <= holidayEnd) ||
                (startDate <= holidayStart && endDate >= holidayEnd)
              ) {
                hasOverlappingHoliday = true;
              }
            }
          });
        }
      });

      if (hasOverlappingHoliday) {
        toast.error("Holiday already declared for this time slot");
        return;
      }
    }

    const holidayData = {
      date: format(startDate, "yyyy-MM-dd"),
      start_time: format(startDate, "HH:mm"),
      end_time: format(endDate, "HH:mm"),
      reason: holidayReason.trim() || "Holiday",
    };

    addHolidayMutation.mutate(holidayData);
  };

  // Handle slot selection for holiday creation
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const now = new Date();

    // Check if booking is in the past
    if (isBefore(start, now)) {
      toast.error("Cannot mark holiday in the past");
      return;
    }

    // Check if it's the same day
    if (!isSameDay(start, end)) {
      toast.error("Holiday must be on the same day");
      return;
    }

    // Check if the day is a working day
    const dayName = getDayName(start);
    const dayTiming = bayTimings.find(
      (timing: any) => timing.day_of_week === dayName
    );

    if (!dayTiming || !dayTiming.is_working_day) {
      toast.error("Cannot mark holiday on a non-working day");
      return;
    }

    // Parse bay timing hours
    const [bayStartHour, bayStartMinute] = dayTiming.start_time
      .split(":")
      .map(Number);
    const [bayEndHour, bayEndMinute] = dayTiming.end_time.split(":").map(Number);

    // Check if selected slot is within working hours
    const slotStartHour = start.getHours();
    const slotStartMinute = start.getMinutes();
    const slotEndHour = end.getHours();
    const slotEndMinute = end.getMinutes();

    const isBeforeStart =
      slotStartHour < bayStartHour ||
      (slotStartHour === bayStartHour && slotStartMinute < bayStartMinute);

    const isAfterEnd =
      slotEndHour > bayEndHour ||
      (slotEndHour === bayEndHour && slotEndMinute > bayEndMinute);

    if (isBeforeStart || isAfterEnd) {
      toast.error(
        `Cannot mark holiday outside working hours (${dayTiming.start_time} - ${dayTiming.end_time})`
      );
      return;
    }

    // Check if there's already a holiday in this time slot
    if (bayHolidays && Array.isArray(bayHolidays)) {
      let hasOverlappingHoliday = false;

      bayHolidays.forEach((bay: any) => {
        if (bay.holidays && Array.isArray(bay.holidays)) {
          bay.holidays.forEach((holiday: any) => {
            const holidayDate = new Date(holiday.date);
            
            // Check if it's the same day
            if (isSameDay(holidayDate, start)) {
              const [holidayStartHour, holidayStartMinute] = holiday.start_time
                ?.split(":")
                .map(Number) || [0, 0];
              const [holidayEndHour, holidayEndMinute] = holiday.end_time
                ?.split(":")
                .map(Number) || [0, 0];

              const holidayStart = new Date(holidayDate);
              holidayStart.setHours(holidayStartHour, holidayStartMinute, 0, 0);

              const holidayEnd = new Date(holidayDate);
              holidayEnd.setHours(holidayEndHour, holidayEndMinute, 0, 0);

              // Check for overlap
              if (
                (start >= holidayStart && start < holidayEnd) ||
                (end > holidayStart && end <= holidayEnd) ||
                (start <= holidayStart && end >= holidayEnd)
              ) {
                hasOverlappingHoliday = true;
              }
            }
          });
        }
      });

      if (hasOverlappingHoliday) {
        toast.error("Holiday already declared for this time slot");
        return;
      }
    }

    setHolidayStartTime(start.toISOString());
    setHolidayEndTime(end.toISOString());
    setShowHolidayDialog(true);
  };

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.type === "holiday") {
      setSelectedHoliday(event.resource);
      setShowHolidayDetailsDialog(true);
    } else {
      setSelectedBooking(event.resource);
    }
  };

  // Handle holiday deletion
  const handleDeleteHoliday = () => {
    if (selectedHoliday) {
      deleteHolidayMutation.mutate(selectedHoliday._id);
    }
  };

  // Accept booking mutation
  const acceptMutation = useMutation({
    mutationFn: (bookingId: string) =>
      bayQuoteServices.acceptBayQuote(bookingId),
    onSuccess: () => {
      toast.success("Booking accepted successfully");
      queryClient.invalidateQueries({ queryKey: ["bay-calendar"] });
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to accept booking");
    },
  });

  // Reject booking mutation
  const rejectMutation = useMutation({
    mutationFn: ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason: string;
    }) => bayQuoteServices.rejectBayQuote(bookingId, reason),
    onSuccess: () => {
      toast.success("Booking rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedBooking(null);
      queryClient.invalidateQueries({ queryKey: ["bay-calendar"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject booking");
    },
  });

  // Start work mutation
  const startWorkMutation = useMutation({
    mutationFn: (bookingId: string) => bayQuoteServices.startBayWork(bookingId),
    onSuccess: () => {
      toast.success("Work started successfully");
      queryClient.invalidateQueries({ queryKey: ["bay-calendar"] });
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start work");
    },
  });

  // Submit work mutation
  const submitWorkMutation = useMutation({
    mutationFn: async ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: any;
    }) => {
      const response = await bayQuoteServices.submitBayWork(bookingId, data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Work submitted for review");
      queryClient.invalidateQueries({ queryKey: ["bay-calendar"] });
      if (data.draft_status === false) {
        setCommentSheetOpen(false);
        setSelectedBooking(null);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit work");
    },
  });

  const handleAccept = (booking: any) => {
    acceptMutation.mutate(booking._id);
  };

  const handleRejectClick = (booking: any) => {
    setSelectedBooking(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({
      bookingId: selectedBooking._id,
      reason: rejectReason,
    });
  };

  const handleStartWork = (booking: any) => {
    startWorkMutation.mutate(booking._id);
  };

  const handleSubmitWork = (booking: any) => {
    setSelectedBooking(booking);
    setWorkMode("submit");
    setCommentSheetOpen(true);
  };

  const handleEditWork = (booking: any) => {
    setSelectedBooking(booking);
    setWorkMode("edit");
    setCommentSheetOpen(true);
  };

  const handleWorkSubmission = (data: any) => {
    if (selectedBooking) {
      submitWorkMutation.mutate({
        bookingId: selectedBooking._id,
        data,
      });
    }
  };

  const handleChat = (booking: any) => {
    setSelectedBooking(booking);
    setChatModalOpen(true);
  };

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
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
      holiday: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const navigateToPrevious = () => {
    switch (view) {
      case Views.DAY:
        setCurrentDate(addDays(currentDate, -1));
        break;
      case Views.WEEK:
        setCurrentDate(addWeeks(currentDate, -1));
        break;
      case Views.MONTH:
        setCurrentDate(addWeeks(currentDate, -4));
        break;
    }
  };

  const navigateToNext = () => {
    switch (view) {
      case Views.DAY:
        setCurrentDate(addDays(currentDate, 1));
        break;
      case Views.WEEK:
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case Views.MONTH:
        setCurrentDate(addWeeks(currentDate, 4));
        break;
    }
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  // Function to style time slots based on availability
  const slotPropGetter = (date: Date) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if the date is in the past (before today)
    const isPastDate = date < today;

    // Check bay timings for the specific day
    const dayName = getDayName(date);
    const dayTiming = bayTimings.find(
      (timing: any) => timing.day_of_week === dayName
    );

    // Condition 1: Past dates - Light brown color (same as non-working days)
    if (isPastDate) {
      return {
        className: "rbc-slot-past",
        style: {
          backgroundColor: "#c39522ff",
          cursor: "not-allowed",
          opacity: 0.6,
          border: "none",
        },
      };
    }

    // Condition 2: Not a working day - Light brown color
    if (!dayTiming || !dayTiming.is_working_day) {
      return {
        className: "rbc-slot-non-working",
        style: {
          backgroundColor: "#ecc38eff",
          cursor: "not-allowed",
          pointerEvents: "none",
          border: "none",
        },
      };
    }

    // Parse bay timing hours
    const [bayStartHour, bayStartMinute] = dayTiming.start_time
      .split(":")
      .map(Number);
    const [bayEndHour, bayEndMinute] = dayTiming.end_time
      .split(":")
      .map(Number);

    // Get current slot hour and minute
    const slotHour = date.getHours();
    const slotMinute = date.getMinutes();

    // Condition 3: Outside operating hours - Light brown color
    const isBeforeStart =
      slotHour < bayStartHour ||
      (slotHour === bayStartHour && slotMinute < bayStartMinute);

    const isAfterEnd =
      slotHour > bayEndHour ||
      (slotHour === bayEndHour && slotMinute >= bayEndMinute);

    if (isBeforeStart || isAfterEnd) {
      return {
        className: "rbc-slot-outside-hours",
        style: {
          backgroundColor: "#ecc38eff",
          cursor: "not-allowed",
          pointerEvents: "none",
          border: "none",
        },
      };
    }

    // Available slots - default styling with no borders
    return {
      style: {
        border: "none",
      },
    };
  };

  const CustomToolbar = ({ label }: any) => (
    <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={navigateToPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={navigateToToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={navigateToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        <span className="text-lg font-semibold ml-4">{label}</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant={view === Views.DAY ? "default" : "outline"}
          size="sm"
          onClick={() => setView(Views.DAY)}
        >
          Day
        </Button>
        <Button
          variant={view === Views.WEEK ? "default" : "outline"}
          size="sm"
          onClick={() => setView(Views.WEEK)}
        >
          Week
        </Button>
        <Button
          variant={view === Views.MONTH ? "default" : "outline"}
          size="sm"
          onClick={() => setView(Views.MONTH)}
        >
          Month
        </Button>

        {/* Holiday Button */}
        {isPrimaryAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHolidayDialog(true)}
          >
            <Ban className="h-4 w-4 mr-2" />
            Holiday
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLegendDialog(true)}
        >
          <Info className="h-4 w-4 mr-2" />
          Legend
        </Button>

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
    </div>
  );

  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="p-1 text-xs h-full">
      <div className="font-medium truncate">
        {event.type === "holiday" ? "Holiday" : event.fieldName}
      </div>
      {event.type === "booking" && (
        <div className="truncate">Stock: {event.stockId}</div>
      )}
      <div className="truncate">
        {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
      </div>
      <Badge variant="secondary" className="mt-1 text-xs capitalize">
        {event.type === "holiday" ? "Holiday" : event.status.replace(/_/g, " ")}
      </Badge>
    </div>
  );

  const getEventStyle = (event: CalendarEvent) => {
    if (event.type === "holiday") {
      return {
        style: {
          borderRadius: "4px",
          opacity: 0.9,
          color: "#991b1b",
          backgroundColor: "#fee2e2",
          borderLeft: `6px solid #ef4444`,
          border: `1px solid #ef4444`,
          fontWeight: "600",
          display: "block",
          height: "100%",
        },
      };
    }

    const statusColors: Record<
      string,
      { background: string; border: string; text: string }
    > = {
      booking_request: {
        background: "#fef3c7",
        border: "#f59e0b",
        text: "#92400e",
      },
      booking_accepted: {
        background: "#d1fae5",
        border: "#10b981",
        text: "#065f46",
      },
      booking_rejected: {
        background: "#fee2e2",
        border: "#ef4444",
        text: "#991b1b",
      },
      work_in_progress: {
        background: "#dbeafe",
        border: "#3b82f6",
        text: "#1e40af",
      },
      work_review: {
        background: "#e9d5ff",
        border: "#8b5cf6",
        text: "#5b21b6",
      },
      completed_jobs: {
        background: "#f3f4f6",
        border: "#6b7280",
        text: "#374151",
      },
      rework: { background: "#ffedd5", border: "#f97316", text: "#9a3412" },
    };

    const colorConfig =
      statusColors[event.status] || statusColors.booking_request;

    return {
      style: {
        borderRadius: "4px",
        opacity: 0.9,
        color: colorConfig.text,
        backgroundColor: colorConfig.background,
        borderLeft: `6px solid ${colorConfig.border}`,
        border: `1px solid ${colorConfig.border}`,
        fontWeight: "600",
        display: "block",
        height: "100%",
      },
    };
  };

  if (!baysData || baysData.length === 0) {
    return (
      <DashboardLayout title="Bay Calendar">
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Bays Assigned</h3>
              <p className="text-muted-foreground">
                You are not assigned to any service bays. Please contact your
                administrator.
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
        {/* Calendar */}
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="h-[700px]">
                <Calendar
                  ref={calendarRef}
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  date={currentDate}
                  onView={setView}
                  onNavigate={setCurrentDate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable={isSelectable}
                  step={30}
                  timeslots={2}
                  defaultView={Views.WEEK}
                  components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent,
                  }}
                  eventPropGetter={getEventStyle}
                  slotPropGetter={slotPropGetter}
                  dayLayoutAlgorithm="no-overlap"
                  min={new Date(0, 0, 0, 0, 0, 0)}
                  max={new Date(0, 0, 0, 23, 59, 0)}
                  formats={{
                    timeGutterFormat: "HH:mm",
                    eventTimeRangeFormat: ({ start, end }) =>
                      `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
                  }}
                  messages={{
                    next: "Next",
                    previous: "Previous",
                    today: "Today",
                    month: "Month",
                    week: "Week",
                    day: "Day",
                    agenda: "Agenda",
                    date: "Date",
                    time: "Time",
                    event: "Event",
                    noEventsInRange: "No bookings in this range",
                    showMore: (total) => `+${total} more`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Holiday Creation Dialog */}
      <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <DateTimePicker
                label="Start Date & Time"
                value={holidayStartTime}
                onChange={setHolidayStartTime}
                placeholder="Select start time"
                required
                minDate={new Date()}
              />

              <DateTimePicker
                label="End Date & Time"
                value={holidayEndTime}
                onChange={setHolidayEndTime}
                placeholder="Select end time"
                required
                minDate={new Date(holidayStartTime) || new Date()}
              />
            </div>

            <div>
              <Label htmlFor="holiday-reason">Reason for Holiday</Label>
              <Textarea
                id="holiday-reason"
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                placeholder="Enter reason for marking this day as holiday..."
                rows={3}
              />
            </div>

            {holidayStartTime && (
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <Label className="text-sm font-medium text-amber-800">
                  Holiday Information
                </Label>
                <div className="text-xs text-amber-600 mt-1">
                  {(() => {
                    const startDate = new Date(holidayStartTime);
                    const dayName = format(startDate, "eeee");
                    const dayTiming = bayTimings.find(
                      (timing: any) =>
                        timing.day_of_week === dayName.toLowerCase()
                    );

                    if (dayTiming && dayTiming.is_working_day) {
                      return `Bay normally operates from ${dayTiming.start_time} to ${dayTiming.end_time} on ${dayName}. This holiday will block bookings during the selected time.`;
                    } else {
                      return `Bay is normally closed on ${dayName}. Cannot mark holiday on non-working days.`;
                    }
                  })()}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHolidayDialog(false);
                  resetHolidayForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitHoliday}
                disabled={
                  addHolidayMutation.isPending ||
                  !holidayStartTime ||
                  !holidayEndTime
                }
                className="flex-1"
              >
                <Ban className="h-4 w-4 mr-2" />
                {addHolidayMutation.isPending
                  ? "Marking..."
                  : "Mark as Holiday"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Holiday Details Dialog */}
      <Dialog
        open={showHolidayDetailsDialog}
        onOpenChange={setShowHolidayDetailsDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Holiday Details</DialogTitle>
          </DialogHeader>

          {selectedHoliday && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedHoliday.date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Day</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedHoliday.date), "eeee")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Start Time</Label>
                  <p className="text-sm mt-1">{selectedHoliday.start_time}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">End Time</Label>
                  <p className="text-sm mt-1">{selectedHoliday.end_time}</p>
                </div>
              </div>

              {selectedHoliday.reason && (
                <div>
                  <Label className="text-sm font-medium">Reason</Label>
                  <p className="text-sm mt-1 bg-muted/50 p-3 rounded">
                    {selectedHoliday.reason}
                  </p>
                </div>
              )}

              {selectedHoliday.marked_by && (
                <div>
                  <Label className="text-sm font-medium">Marked By</Label>
                  <p className="text-sm mt-1">
                    {selectedHoliday.marked_by?.first_name}{" "}
                    {selectedHoliday.marked_by?.last_name}
                  </p>
                </div>
              )}

              {selectedHoliday.marked_at && (
                <div>
                  <Label className="text-sm font-medium">Marked At</Label>
                  <p className="text-sm mt-1">
                    {format(
                      new Date(selectedHoliday.marked_at),
                      "MMM dd, yyyy 'at' HH:mm"
                    )}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDeleteHoliday}
                  disabled={deleteHolidayMutation.isPending}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  {deleteHolidayMutation.isPending
                    ? "Removing..."
                    : "Remove Holiday"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowHolidayDetailsDialog(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Booking Details - {selectedBooking?.field_name}
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Bay Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarIcon className="h-4 w-4" />
                    Bay Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Bay Name</Label>
                      <p className="font-medium">
                        {selectedBooking.bay_id?.bay_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Booking Date
                      </Label>
                      <p className="font-medium">
                        {format(
                          parseISO(selectedBooking.booking_date),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Time Slot</Label>
                      <p className="font-medium">
                        {selectedBooking.booking_start_time} -{" "}
                        {selectedBooking.booking_end_time}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge
                          className={getStatusColor(selectedBooking.status)}
                        >
                          {selectedBooking.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quote Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quote Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">
                        Field Name
                      </Label>
                      <p className="font-medium">
                        {selectedBooking.field_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Field ID</Label>
                      <p className="font-medium">{selectedBooking.field_id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Vehicle Stock ID
                      </Label>
                      <p className="font-medium">
                        {selectedBooking.vehicle_stock_id}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Quote Amount
                      </Label>
                      <p className="font-medium">
                        ${selectedBooking.quote_amount}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Vehicle Type
                      </Label>
                      <p className="font-medium capitalize">
                        {selectedBooking.vehicle_type}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Created By
                      </Label>
                      <p className="font-medium">
                        {selectedBooking.created_by?.first_name}{" "}
                        {selectedBooking.created_by?.last_name}
                      </p>
                    </div>
                  </div>

                  {selectedBooking.booking_description && (
                    <div className="mt-4">
                      <Label className="text-muted-foreground">
                        Description
                      </Label>
                      <div className="bg-muted/50 p-3 rounded-lg mt-1">
                        <p className="text-sm">
                          {selectedBooking.booking_description}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedBooking.images &&
                    selectedBooking.images.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-muted-foreground">
                          Field Images
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                          {selectedBooking.images.map(
                            (image: string, index: number) => (
                              <div
                                key={index}
                                className="aspect-square rounded-lg overflow-hidden border"
                              >
                                <img
                                  src={image}
                                  alt={`Field image ${index + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(image, "_blank")}
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {selectedBooking.videos &&
                    selectedBooking.videos.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-muted-foreground">
                          Field Videos
                        </Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {selectedBooking.videos.map(
                            (video: string, index: number) => (
                              <video
                                key={index}
                                src={video}
                                controls
                                className="w-full rounded-lg border"
                              >
                                Your browser does not support the video tag.
                              </video>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Show rework feedback */}
              {selectedBooking.status === "rework" &&
                selectedBooking.comment_sheet?.company_feedback && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Rework Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                        <h4 className="font-medium mb-2 text-orange-800">
                          Company Feedback
                        </h4>
                        <p className="text-sm text-orange-700">
                          {selectedBooking.comment_sheet.company_feedback}
                        </p>
                      </div>

                      {/* Show previous submission details for rework */}
                      {selectedBooking.comment_sheet.final_price && (
                        <div className="mt-4">
                          <Label className="text-muted-foreground mb-2 block">
                            Previous Submission
                          </Label>
                          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Final Price:
                                </span>
                                <p className="font-medium">
                                  ${selectedBooking.comment_sheet.final_price}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  GST:
                                </span>
                                <p className="font-medium">
                                  ${selectedBooking.comment_sheet.gst_amount}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Total:
                                </span>
                                <p className="font-medium">
                                  ${selectedBooking.comment_sheet.total_amount}
                                </p>
                              </div>
                            </div>

                            {selectedBooking.comment_sheet
                              .supplier_comments && (
                              <div>
                                <span className="text-muted-foreground text-sm">
                                  Comments:
                                </span>
                                <p className="text-sm mt-1">
                                  {
                                    selectedBooking.comment_sheet
                                      .supplier_comments
                                  }
                                </p>
                              </div>
                            )}

                            {selectedBooking.comment_sheet.work_images &&
                              selectedBooking.comment_sheet.work_images.length >
                                0 && (
                                <div>
                                  <span className="text-muted-foreground text-sm">
                                    Work Images:
                                  </span>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                    {selectedBooking.comment_sheet.work_images.map(
                                      (image: any, index: number) => (
                                        <div
                                          key={index}
                                          className="aspect-square rounded overflow-hidden border"
                                        >
                                          <img
                                            src={image.url}
                                            alt={`Work image ${index + 1}`}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() =>
                                              window.open(image.url, "_blank")
                                            }
                                          />
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

              {/* Actions based on status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedBooking.status === "booking_request" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(selectedBooking)}
                          disabled={acceptMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {acceptMutation.isPending
                            ? "Accepting..."
                            : "Accept Booking"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClick(selectedBooking)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {selectedBooking.status === "booking_accepted" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStartWork(selectedBooking)}
                          disabled={startWorkMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {startWorkMutation.isPending
                            ? "Starting..."
                            : "Start Work"}
                        </Button>
                        {isPrimaryAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChat(selectedBooking)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat
                          </Button>
                        )}
                      </>
                    )}

                    {selectedBooking.status === "work_in_progress" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitWork(selectedBooking)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit Work
                        </Button>
                        {isPrimaryAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChat(selectedBooking)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat
                          </Button>
                        )}
                      </>
                    )}

                    {selectedBooking.status === "work_review" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditWork(selectedBooking)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Submission
                        </Button>
                        {isPrimaryAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChat(selectedBooking)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat
                          </Button>
                        )}
                      </>
                    )}

                    {selectedBooking.status === "rework" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleEditWork(selectedBooking)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Update & Resubmit Work
                        </Button>
                        {isPrimaryAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChat(selectedBooking)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat
                          </Button>
                        )}
                      </>
                    )}

                    {selectedBooking.status === "completed_jobs" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMode("company_view");
                            setCommentViewSheetOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Work Details
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this booking..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason("");
                  setSelectedBooking(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject Booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Legend Dialog */}
      <Dialog open={showLegendDialog} onOpenChange={setShowLegendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Status Legend</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-yellow-100 border-2 border-yellow-500"></div>
              <div>
                <p className="font-medium text-sm">Booking Request</p>
                <p className="text-xs text-muted-foreground">
                  Waiting for approval
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-green-100 border-2 border-green-500"></div>
              <div>
                <p className="font-medium text-sm">Booking Accepted</p>
                <p className="text-xs text-muted-foreground">
                  Approved and scheduled
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-blue-100 border-2 border-blue-500"></div>
              <div>
                <p className="font-medium text-sm">Work in Progress</p>
                <p className="text-xs text-muted-foreground">
                  Currently being worked on
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-purple-100 border-2 border-purple-500"></div>
              <div>
                <p className="font-medium text-sm">Work Review</p>
                <p className="text-xs text-muted-foreground">
                  Submitted for review
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-gray-100 border-2 border-gray-500"></div>
              <div>
                <p className="font-medium text-sm">Completed Jobs</p>
                <p className="text-xs text-muted-foreground">
                  Work finished and approved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-orange-100 border-2 border-orange-500"></div>
              <div>
                <p className="font-medium text-sm">Rework</p>
                <p className="text-xs text-muted-foreground">
                  Needs additional work
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-red-100 border-2 border-red-500"></div>
              <div>
                <p className="font-medium text-sm">Booking Rejected</p>
                <p className="text-xs text-muted-foreground">
                  Booking was declined
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-red-100 border-2 border-red-500"></div>
              <div>
                <p className="font-medium text-sm">Holiday</p>
                <p className="text-xs text-muted-foreground">
                  Bay is closed for holiday
                </p>
              </div>
            </div>

            {/* Added Holiday and Past Days legend */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-[#ecc38eff] border-2 border-[#c39522ff]"></div>
              <div>
                <p className="font-medium text-sm">Holiday / Closed</p>
                <p className="text-xs text-muted-foreground">
                  The Shop is Closed or declared Holiday
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded bg-[#c39522ff] border-2 border-[#c39522ff]"></div>
              <div>
                <p className="font-medium text-sm">Past Days</p>
                <p className="text-xs text-muted-foreground">
                  These are the past days
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => setShowLegendDialog(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Sheet Modal - Using unified CommentSheetModal for bay quotes */}
      {commentSheetOpen && selectedBooking && (
        <CommentSheetModal
          open={commentSheetOpen}
          onOpenChange={setCommentSheetOpen}
          quote={selectedBooking}
          mode={mode}
          workMode={workMode}
          onSubmit={handleWorkSubmission}
          loading={submitWorkMutation.isPending}
        />
      )}
      {commentViewSheetOpen && selectedBooking && (
        <CommentSheetModal
          open={commentViewSheetOpen}
          onOpenChange={setCommentViewSheetOpen}
          field={selectedBooking}
          mode={mode}
        />
      )}

      {/* Chat Modal - Using unified ChatModal for bay quotes */}
      {chatModalOpen && selectedBooking && (
        <ChatModal
          open={chatModalOpen}
          onOpenChange={setChatModalOpen}
          quote={selectedBooking}
        />
      )}
    </DashboardLayout>
  );
};

export default BayCalendar;