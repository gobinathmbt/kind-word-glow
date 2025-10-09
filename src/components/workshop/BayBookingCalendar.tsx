import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Save,
  HardHat,
  Info,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bayQuoteServices, serviceBayServices } from "@/api/services";
import { toast } from "sonner";
import DateTimePicker from "@/components/workshop/CommentSheetTabs/DateTimePicker";
import {
  format,
  parseISO,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isSameDay,
  isBefore,
  isAfter,
} from "date-fns";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Input } from "@/components/ui/input";

const localizer = momentLocalizer(moment);

interface BayBookingCalendarProps {
  bay: any;
  field: any;
  vehicleType: string;
  vehicleStockId: string;
  onBack: () => void;
  onSuccess: () => void;
  isManual?: boolean;
}

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

const CalendarView: React.FC<{
  events: CalendarEvent[];
  currentDate: Date;
  view: any;
  onViewChange: (view: any) => void;
  onDateChange: (date: Date) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  isLoading: boolean;
  existingBooking: any;
  onNewBooking: () => void;
  onShowLegend: () => void;
  bayTimings: any[];
  bay: any;
  onBack: () => void;
  onShowMenu: () => void;
  bayHolidays: any[];
}> = ({
  events,
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onSelectSlot,
  onSelectEvent,
  isLoading,
  existingBooking,
  onNewBooking,
  onShowLegend,
  bayTimings,
  bay,
  onBack,
  onShowMenu,
  bayHolidays,
}) => {
  const calendarRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (calendarRef.current) {
        window.dispatchEvent(new Event("resize"));
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const navigateToPrevious = () => {
    switch (view) {
      case Views.DAY:
        onDateChange(addDays(currentDate, -1));
        break;
      case Views.WEEK:
        onDateChange(addWeeks(currentDate, -1));
        break;
      case Views.MONTH:
        onDateChange(addWeeks(currentDate, -4));
        break;
    }
  };

  const navigateToNext = () => {
    switch (view) {
      case Views.DAY:
        onDateChange(addDays(currentDate, 1));
        break;
      case Views.WEEK:
        onDateChange(addWeeks(currentDate, 1));
        break;
      case Views.MONTH:
        onDateChange(addWeeks(currentDate, 4));
        break;
    }
  };

  const navigateToToday = () => {
    onDateChange(new Date());
  };

  const getDayName = (date: Date): string => {
    return format(date, "eeee").toLowerCase();
  };

  const isHolidaySlot = (date: Date): boolean => {
    if (!bayHolidays || bayHolidays.length === 0) return false;

    const slotDate = new Date(date);

    for (const bayHoliday of bayHolidays) {
      if (bayHoliday.holidays && Array.isArray(bayHoliday.holidays)) {
        for (const holiday of bayHoliday.holidays) {
          const holidayDate = new Date(holiday.date);

          if (isSameDay(holidayDate, slotDate)) {
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

            const slotTime = new Date(slotDate);

            if (slotTime >= holidayStart && slotTime < holidayEnd) {
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  const CustomToolbar = ({ label }: any) => (
    <div
  className={`flex items-center justify-between border-b bg-white sticky top-0 z-10 flex-wrap gap-1 transition-all duration-200 ${
    existingBooking ? "md:pb-20 h-16" : "p-3 md:pt-4 h-24"
  }`}
>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onShowMenu}
          className="md:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigateToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-2 flex items-center gap-2">
          <HardHat className="h-4 w-4 text-slate-600" />
          <span className="text-xs md:text-sm font-medium truncate">
            Bay: {bay.bay_name}
          </span>
          {existingBooking && (
            <Badge
              variant="secondary"
              className="text-xs hidden sm:inline-flex"
            >
              Existing Booking
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Button variant="outline" size="sm" onClick={onShowLegend}>
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="hidden md:flex gap-2 flex-wrap justify-end flex-1 min-w-0">
        <Button
          variant={view === Views.DAY ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange(Views.DAY)}
        >
          Day
        </Button>
        <Button
          variant={view === Views.WEEK ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange(Views.WEEK)}
        >
          Week
        </Button>
        <Button
          variant={view === Views.MONTH ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange(Views.MONTH)}
        >
          Month
        </Button>

        <Button variant="outline" size="sm" onClick={onShowLegend}>
          <Info className="h-4 w-4 mr-2" />
          Legend
        </Button>

        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {existingBooking ? null : (
          <Button onClick={onNewBooking} disabled={!!existingBooking}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        )}
      </div>
    </div>
  );

  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="p-1 text-xs h-full overflow-hidden">
      <div className="font-semibold truncate text-[10px] md:text-xs">
        {event.type === "holiday" ? "Holiday" : event.fieldName}
      </div>
      {event.type === "booking" && (
        <div className="truncate text-[9px] md:text-[10px] opacity-90">
          Stock: {event.stockId}
        </div>
      )}
      <div className="truncate text-[9px] md:text-[10px] opacity-90">
        {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
      </div>
      <Badge
        variant="secondary"
        className="mt-1 text-[8px] md:text-xs capitalize px-1 py-0"
      >
        {event.type === "holiday" ? "Holiday" : event.status.replace(/_/g, " ")}
      </Badge>
    </div>
  );

  const getEventStyle = (event: CalendarEvent) => {
    if (event.type === "holiday") {
      return {
        style: {
          borderRadius: "6px",
          opacity: 0.95,
          color: "#7f1d1d",
          backgroundColor: "#fecaca",
          borderLeft: `4px solid #dc2626`,
          border: `1px solid #dc2626`,
          fontWeight: "600",
          display: "block",
          height: "100%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
        text: "#78350f",
      },
      booking_accepted: {
        background: "#d1fae5",
        border: "#10b981",
        text: "#064e3b",
      },
      booking_rejected: {
        background: "#fee2e2",
        border: "#ef4444",
        text: "#7f1d1d",
      },
      work_in_progress: {
        background: "#dbeafe",
        border: "#3b82f6",
        text: "#1e3a8a",
      },
      work_review: {
        background: "#e9d5ff",
        border: "#a855f7",
        text: "#581c87",
      },
      completed_jobs: {
        background: "#f1f5f9",
        border: "#64748b",
        text: "#334155",
      },
      rework: { background: "#fed7aa", border: "#ea580c", text: "#7c2d12" },
    };

    const colorConfig =
      statusColors[event.status] || statusColors.booking_request;

    return {
      style: {
        borderRadius: "6px",
        opacity: 0.95,
        color: colorConfig.text,
        backgroundColor: colorConfig.background,
        borderLeft: `4px solid ${colorConfig.border}`,
        border: `1px solid ${colorConfig.border}`,
        fontWeight: "600",
        display: "block",
        height: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      },
    };
  };

  const slotPropGetter = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPastDate = date < today;
    const isHoliday = isHolidaySlot(date);
    const dayName = getDayName(date);
    const dayTiming = bayTimings.find(
      (timing: any) => timing.day_of_week === dayName
    );

    if (isPastDate) {
      return {
        className: "rbc-slot-past",
        style: {
          backgroundColor: "#d4a574",
          cursor: "not-allowed",
          opacity: 0.7,
          border: "none",
        },
      };
    }

    if (isHoliday) {
      return {
        className: "rbc-slot-holiday",
        style: {
          backgroundColor: "#fecaca",
          cursor: "not-allowed",
          pointerEvents: "none",
          border: "none",
        },
      };
    }

    if (!dayTiming || !dayTiming.is_working_day) {
      return {
        className: "rbc-slot-non-working",
        style: {
          backgroundColor: "#f5deb3",
          cursor: "not-allowed",
          pointerEvents: "none",
          border: "none",
        },
      };
    }

    const [bayStartHour, bayStartMinute] = dayTiming.start_time
      .split(":")
      .map(Number);
    const [bayEndHour, bayEndMinute] = dayTiming.end_time
      .split(":")
      .map(Number);
    const slotHour = date.getHours();
    const slotMinute = date.getMinutes();

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
          backgroundColor: "#f5deb3",
          cursor: "not-allowed",
          pointerEvents: "none",
          border: "none",
        },
      };
    }

    return {
      style: {
        backgroundColor: "#ffffff",
        border: "none",
      },
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ minHeight: "500px" }}>
      <Calendar
        ref={calendarRef}
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        date={currentDate}
        onView={onViewChange}
        onNavigate={onDateChange}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        selectable
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
  );
};

const BayBookingCalendar: React.FC<BayBookingCalendarProps> = ({
  bay,
  field,
  vehicleType,
  vehicleStockId,
  onBack,
  onSuccess,
  isManual = false,
}) => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookingStartTime, setBookingStartTime] = useState("");
  const [bookingEndTime, setBookingEndTime] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showLegendDialog, setShowLegendDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showHolidayDetailsDialog, setShowHolidayDetailsDialog] =
    useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [view, setView] = useState(Views.DAY);
  const [isRebookMode, setIsRebookMode] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setView(Views.DAY);
      } else {
        setView(Views.WEEK);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  const rebookBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await bayQuoteServices.rebookBayQuote(
        selectedBooking?._id,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Booking rebooked successfully");
      queryClient.invalidateQueries({ queryKey: ["field-bay-booking"] });
      queryClient.invalidateQueries({ queryKey: ["bay-booking-calendar"] });
      setShowBookingDialog(false);
      setSelectedBooking(null);
      setIsRebookMode(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to rebook booking");
    },
  });

  const { data: existingBooking } = useQuery({
    queryKey: [
      "field-bay-booking",
      vehicleType,
      vehicleStockId,
      field.field_id,
    ],
    queryFn: async () => {
      const response = await bayQuoteServices.getBayQuoteForField(
        vehicleType,
        vehicleStockId,
        field.field_id
      );
      return response.data.data;
    },
    enabled: !!field,
  });

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

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: [
      "bay-booking-calendar",
      bay._id,
      format(dateRange.start, "yyyy-MM-dd"),
      format(dateRange.end, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const response = await bayQuoteServices.getBayCalendar(
        format(dateRange.start, "yyyy-MM-dd"),
        format(dateRange.end, "yyyy-MM-dd"),
        bay._id
      );
      return response.data.data;
    },
  });

  const { data: bayHolidays } = useQuery({
    queryKey: [
      "bay-holidays",
      bay._id,
      format(dateRange.start, "yyyy-MM-dd"),
      format(dateRange.end, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const response = await serviceBayServices.getBayHolidays(
        format(dateRange.start, "yyyy-MM-dd"),
        format(dateRange.end, "yyyy-MM-dd"),
        bay._id
      );
      return response?.data?.data || [];
    },
    enabled: !!bay._id,
  });

  const events: CalendarEvent[] = React.useMemo(() => {
    const events: CalendarEvent[] = [];

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

    if (bayHolidays && Array.isArray(bayHolidays)) {
      bayHolidays.forEach((bayHoliday: any) => {
        if (bayHoliday.holidays && Array.isArray(bayHoliday.holidays)) {
          bayHoliday.holidays.forEach((holiday: any) => {
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

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await bayQuoteServices.createBayQuote(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Bay booking created successfully");
      queryClient.invalidateQueries({ queryKey: ["field-bay-booking"] });
      queryClient.invalidateQueries({ queryKey: ["bay-booking-calendar"] });
      setShowBookingDialog(false);
      resetForm();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create booking");
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await bayQuoteServices.updateBayQuote(id, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Booking updated successfully");
      queryClient.invalidateQueries({ queryKey: ["field-bay-booking"] });
      queryClient.invalidateQueries({ queryKey: ["bay-booking-calendar"] });
      setShowBookingDialog(false);
      setSelectedBooking(null);
      setIsEditMode(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update booking");
    },
  });

  const resetForm = () => {
    setBookingStartTime("");
    setBookingEndTime("");
    setBookingDescription("");
    setAllowOverlap(false);
  };

  const checkHolidayOverlap = (
    start: Date,
    end: Date
  ): { hasOverlap: boolean; holiday?: any } => {
    if (!bayHolidays || bayHolidays.length === 0) {
      return { hasOverlap: false };
    }

    for (const bayHoliday of bayHolidays) {
      if (bayHoliday.holidays && Array.isArray(bayHoliday.holidays)) {
        for (const holiday of bayHoliday.holidays) {
          const holidayDate = new Date(holiday.date);

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

            if (
              (start >= holidayStart && start < holidayEnd) ||
              (end > holidayStart && end <= holidayEnd) ||
              (start <= holidayStart && end >= holidayEnd)
            ) {
              return { hasOverlap: true, holiday };
            }
          }
        }
      }
    }

    return { hasOverlap: false };
  };

  const checkWorkingDayConflict = (
    start: Date,
    end: Date
  ): { hasConflict: boolean; message?: string } => {
    const dayName = format(start, "eeee").toLowerCase();
    const dayTiming = bay.bay_timings.find(
      (timing: any) => timing.day_of_week === dayName
    );

    if (!dayTiming) {
      return {
        hasConflict: true,
        message: "No timing configuration found for this day",
      };
    }

    if (!dayTiming.is_working_day) {
      return {
        hasConflict: true,
        message: `Bay is closed on ${format(
          start,
          "eeee"
        )}. Please select a working day.`,
      };
    }

    const [bayStartHour, bayStartMinute] = dayTiming.start_time
      .split(":")
      .map(Number);
    const [bayEndHour, bayEndMinute] = dayTiming.end_time
      .split(":")
      .map(Number);

    const bayStartTime = new Date(start);
    bayStartTime.setHours(bayStartHour, bayStartMinute, 0, 0);

    const bayEndTime = new Date(start);
    bayEndTime.setHours(bayEndHour, bayEndMinute, 0, 0);

    const isStartWithinHours =
      isAfter(start, bayStartTime) || isSameDay(start, bayStartTime);
    const isEndWithinHours =
      isBefore(end, bayEndTime) || isSameDay(end, bayEndTime);

    if (!isStartWithinHours || !isEndWithinHours) {
      return {
        hasConflict: true,
        message: `Booking must be within bay operating hours: ${dayTiming.start_time} - ${dayTiming.end_time}`,
      };
    }

    if (isBefore(start, bayStartTime)) {
      return {
        hasConflict: true,
        message: `Booking cannot start before bay opening time (${dayTiming.start_time})`,
      };
    }

    if (isAfter(end, bayEndTime)) {
      return {
        hasConflict: true,
        message: `Booking cannot end after bay closing time (${dayTiming.end_time})`,
      };
    }

    return { hasConflict: false };
  };

  const validateBookingTime = (
    start: Date,
    end: Date
  ): { isValid: boolean; message?: string } => {
    const now = new Date();

    if (isBefore(start, now)) {
      return { isValid: false, message: "Cannot book in the past" };
    }

    const holidayCheck = checkHolidayOverlap(start, end);
    if (holidayCheck.hasOverlap) {
      return {
        isValid: false,
        message: `Cannot book during holiday: ${
          holidayCheck.holiday?.reason || "Holiday declared for this time slot"
        }`,
      };
    }

    const workingDayCheck = checkWorkingDayConflict(start, end);
    if (workingDayCheck.hasConflict) {
      return {
        isValid: false,
        message: workingDayCheck.message,
      };
    }

    return { isValid: true };
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (existingBooking && !isEditMode) {
      toast.error(
        "This field already has a booking. Please edit the existing booking."
      );
      return;
    }

    const now = new Date();

    if (isBefore(start, now)) {
      toast.error("Cannot book in the past");
      return;
    }

    const validation = validateBookingTime(start, end);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    setBookingStartTime(start.toISOString());
    setBookingEndTime(end.toISOString());
    setShowBookingDialog(true);
    setIsEditMode(false);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.type === "holiday") {
      setSelectedHoliday(event.resource);
      setShowHolidayDetailsDialog(true);
    } else {
      setSelectedBooking(event.resource);

      if (event.fieldId === field.field_id) {
        setShowDetailsDialog(true);
      } else {
        setShowDetailsDialog(true);
      }
    }
  };

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

    const validation = validateBookingTime(startDate, endDate);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    if (isRebookMode && selectedBooking) {
      const rebookData = {
        booking_date: format(startDate, "yyyy-MM-dd"),
        booking_start_time: format(startDate, "HH:mm"),
        booking_end_time: format(endDate, "HH:mm"),
        booking_description: bookingDescription,
        quote_amount: parseFloat(quoteAmount) || 0,
        allow_overlap: allowOverlap,
      };

      rebookBookingMutation.mutate(rebookData);
    } else if (isEditMode && selectedBooking) {
      const updateData = {
        booking_date: format(startDate, "yyyy-MM-dd"),
        booking_start_time: format(startDate, "HH:mm"),
        booking_end_time: format(endDate, "HH:mm"),
        booking_description: bookingDescription,
        quote_amount: parseFloat(quoteAmount) || 0,
        allow_overlap: allowOverlap,
      };

      updateBookingMutation.mutate({
        id: selectedBooking._id,
        data: updateData,
      });
    } else {
      const bookingData = {
        vehicle_type: vehicleType,
        vehicle_stock_id: vehicleStockId,
        field_id: field.field_id,
        field_name: field.field_name,
        bay_id: bay._id,
        quote_amount: parseFloat(quoteAmount) || 0,
        booking_date: format(startDate, "yyyy-MM-dd"),
        booking_start_time: format(startDate, "HH:mm"),
        booking_end_time: format(endDate, "HH:mm"),
        booking_description: bookingDescription,
        images: field.images || [],
        videos: field.videos || [],
        allow_overlap: allowOverlap,
      };

      createBookingMutation.mutate(bookingData);
    }
  };

  const handleEditBooking = () => {
    if (!selectedBooking) return;

    const bookingDate = parseISO(selectedBooking.booking_date);
    const [startHours, startMinutes] = selectedBooking.booking_start_time
      .split(":")
      .map(Number);
    const [endHours, endMinutes] = selectedBooking.booking_end_time
      .split(":")
      .map(Number);

    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    setBookingStartTime(startDateTime.toISOString());
    setBookingEndTime(endDateTime.toISOString());
    setBookingDescription(selectedBooking.booking_description || "");
    setQuoteAmount(selectedBooking.quote_amount?.toString() || "");
    setAllowOverlap(selectedBooking.allow_overlap || false);

    setIsEditMode(true);
    setIsRebookMode(selectedBooking.status === "booking_rejected");
    setShowDetailsDialog(false);
    setShowBookingDialog(true);
  };

  const handleNewBooking = () => {
    if (existingBooking) {
      toast.error(
        "This field already has a booking. Please edit the existing booking."
      );
      return;
    }
    setShowBookingDialog(true);
    setIsEditMode(false);
    resetForm();
  };

  const isCurrentFieldBooking = selectedBooking?.field_id === field.field_id;

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        <Card className="h-full border-0 rounded-none">
          <CardContent
  className={`h-full transition-all duration-200 ${
    existingBooking
      ? "p-2 sm:p-3 md:p-4 lg:p-7" 
      : "p-2 sm:p-4 md:p-6 lg:p-12" 
  }`}
>
            <CalendarView
              bay={bay}
              events={events}
              currentDate={currentDate}
              view={view}
              onViewChange={setView}
              onDateChange={setCurrentDate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              isLoading={calendarLoading}
              existingBooking={existingBooking}
              onNewBooking={handleNewBooking}
              onShowLegend={() => setShowLegendDialog(true)}
              bayTimings={bay.bay_timings || []}
              onBack={onBack}
              onShowMenu={() => setShowMenuDialog(true)}
              bayHolidays={bayHolidays || []}
            />
          </CardContent>
        </Card>
      </div>

      <div
  className={`hidden md:block flex-shrink-0 border-t bg-white transition-all duration-200 ${
    existingBooking ? "pb-12" : "pb-1"
  }`}
>
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 lg:gap-4 text-xs lg:text-sm text-slate-600 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-100 border-2 border-yellow-500"></div>
              <span>Request</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-100 border-2 border-green-600"></div>
              <span>Accepted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100 border-2 border-blue-600"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-100 border-2 border-purple-600"></div>
              <span>Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-100 border-2 border-red-600"></div>
              <span>Rejected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-100 border-2 border-slate-600"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-100 border-2 border-orange-600"></div>
              <span>Rework</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-200 border-2 border-red-500"></div>
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#d4a574] border-2 border-[#b8935f]"></div>
              <span>Past</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Calendar Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={navigateToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={view === Views.DAY ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setView(Views.DAY);
                  setShowMenuDialog(false);
                }}
              >
                Day
              </Button>
              <Button
                variant={view === Views.WEEK ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setView(Views.WEEK);
                  setShowMenuDialog(false);
                }}
              >
                Week
              </Button>
              <Button
                variant={view === Views.MONTH ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setView(Views.MONTH);
                  setShowMenuDialog(false);
                }}
              >
                Month
              </Button>
            </div>

            <div className="space-y-2">
              {existingBooking ? null : (
                <Button
                  onClick={() => {
                    handleNewBooking();
                    setShowMenuDialog(false);
                  }}
                  className="w-full"
                  disabled={!!existingBooking}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  onBack();
                  setShowMenuDialog(false);
                }}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {isRebookMode
                ? "Rebook Booking"
                : isEditMode
                ? "Edit Booking"
                : "Create New Booking"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <DateTimePicker
                label="Start Date & Time"
                value={bookingStartTime}
                onChange={setBookingStartTime}
                placeholder="Select start time"
                required
                minDate={new Date()}
              />

              <DateTimePicker
                label="End Date & Time"
                value={bookingEndTime}
                onChange={setBookingEndTime}
                placeholder="Select end time"
                required
                minDate={new Date(bookingStartTime) || new Date()}
              />
            </div>

            <div>
              <Label htmlFor="quoteAmount" className="text-sm">
                Expected Estimation *
              </Label>
              <Input
                id="quoteAmount"
                type="number"
                step="0.01"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="Enter estimation amount"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm">
                Work Description
              </Label>
              <Textarea
                id="description"
                value={bookingDescription}
                onChange={(e) => setBookingDescription(e.target.value)}
                placeholder="Describe the work to be done..."
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_overlap"
                checked={allowOverlap}
                onCheckedChange={(checked) =>
                  setAllowOverlap(checked as boolean)
                }
              />
              <Label
                htmlFor="allow_overlap"
                className="text-xs sm:text-sm font-normal cursor-pointer"
              >
                Allow overlapping bookings (multiple works at same time)
              </Label>
            </div>

            {bookingStartTime && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold text-blue-900">
                  Bay Availability
                </Label>
                <div className="text-xs text-blue-700 mt-1.5">
                  {(() => {
                    const startDate = new Date(bookingStartTime);
                    const dayName = format(startDate, "eeee");
                    const dayTiming = bay.bay_timings.find(
                      (timing: any) =>
                        timing.day_of_week === dayName.toLowerCase()
                    );

                    if (dayTiming && dayTiming.is_working_day) {
                      return `Bay operates from ${dayTiming.start_time} to ${dayTiming.end_time} on ${dayName}`;
                    } else {
                      return `Bay is closed on ${dayName}`;
                    }
                  })()}
                </div>
              </div>
            )}

            {bookingStartTime &&
              (() => {
                const startDate = new Date(bookingStartTime);
                const endDate = new Date(bookingEndTime);
                const holidayCheck = checkHolidayOverlap(startDate, endDate);

                if (holidayCheck.hasOverlap) {
                  return (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-300">
                      <Label className="text-sm font-semibold text-red-900">
                        Holiday Conflict
                      </Label>
                      <div className="text-xs text-red-700 mt-1.5">
                        Selected time conflicts with holiday:{" "}
                        {holidayCheck.holiday?.reason ||
                          "Holiday declared for this time slot"}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            {bookingStartTime &&
              (() => {
                const startDate = new Date(bookingStartTime);
                const endDate = new Date(bookingEndTime);
                const workingDayCheck = checkWorkingDayConflict(
                  startDate,
                  endDate
                );

                if (workingDayCheck.hasConflict) {
                  return (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-300">
                      <Label className="text-sm font-semibold text-amber-900">
                        Bay Timing Conflict
                      </Label>
                      <div className="text-xs text-amber-700 mt-1.5">
                        {workingDayCheck.message}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBookingDialog(false);
                  setIsEditMode(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitBooking}
                disabled={
                  createBookingMutation.isPending ||
                  updateBookingMutation.isPending ||
                  rebookBookingMutation.isPending ||
                  !bookingStartTime ||
                  !bookingEndTime
                }
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {rebookBookingMutation.isPending
                  ? "Rebooking..."
                  : createBookingMutation.isPending ||
                    updateBookingMutation.isPending
                  ? "Saving..."
                  : isRebookMode
                  ? "Rebook"
                  : isEditMode
                  ? "Update"
                  : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Booking Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Field Name
                </Label>
                <p className="text-xs sm:text-sm mt-1">
                  {selectedBooking?.field_name}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Stock ID
                </Label>
                <p className="text-xs sm:text-sm mt-1">
                  {selectedBooking?.vehicle_stock_id}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Bay
                </Label>
                <p className="text-xs sm:text-sm mt-1">
                  {selectedBooking?.bay_id?.bay_name || bay.bay_name}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Booking Date
                </Label>
                <p className="text-xs sm:text-sm mt-1">
                  {selectedBooking &&
                    format(
                      parseISO(selectedBooking.booking_date),
                      "MMM dd, yyyy"
                    )}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Start Time
                </Label>
                <p className="text-xs sm:text-sm mt-1">
                  {selectedBooking?.booking_start_time}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  End Time
                </Label>
                <p className="text-xs sm:text-sm mt-1">
                  {selectedBooking?.booking_end_time}
                </p>
              </div>
              <div className="col-span-2">
                <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Status
                </Label>
                <div className="mt-1.5">
                  <Badge className={getStatusColor(selectedBooking?.status)}>
                    {selectedBooking?.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>

              {selectedBooking?.status === "booking_rejected" &&
                selectedBooking?.rejected_reason && (
                  <div className="col-span-2">
                    <Label className="text-xs sm:text-sm font-semibold text-red-700">
                      Rejection Reason
                    </Label>
                    <p className="text-xs sm:text-sm mt-1.5 text-red-700 bg-red-50 p-2 rounded">
                      {selectedBooking.rejected_reason}
                    </p>
                  </div>
                )}

              {selectedBooking?.booking_description && (
                <div className="col-span-2">
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Description
                  </Label>
                  <p className="text-xs sm:text-sm mt-1.5 bg-slate-50 p-2 rounded">
                    {selectedBooking.booking_description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
                className="flex-1"
              >
                Close
              </Button>

              {isCurrentFieldBooking &&
                selectedBooking?.status !== "completed_jobs" &&
                selectedBooking?.status !== "work_in_progress" && (
                  <Button onClick={handleEditBooking} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {selectedBooking?.status === "booking_rejected"
                      ? "Rebook"
                      : "Edit"}
                  </Button>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showHolidayDetailsDialog}
        onOpenChange={setShowHolidayDetailsDialog}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Holiday Details
            </DialogTitle>
          </DialogHeader>

          {selectedHoliday && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Date
                  </Label>
                  <p className="text-xs sm:text-sm mt-1">
                    {format(new Date(selectedHoliday.date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Day
                  </Label>
                  <p className="text-xs sm:text-sm mt-1">
                    {format(new Date(selectedHoliday.date), "eeee")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Start Time
                  </Label>
                  <p className="text-xs sm:text-sm mt-1">
                    {selectedHoliday.start_time}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    End Time
                  </Label>
                  <p className="text-xs sm:text-sm mt-1">
                    {selectedHoliday.end_time}
                  </p>
                </div>
              </div>

              {selectedHoliday.reason && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Reason
                  </Label>
                  <p className="text-xs sm:text-sm mt-1.5 bg-slate-50 p-3 rounded-lg">
                    {selectedHoliday.reason}
                  </p>
                </div>
              )}

              {selectedHoliday.marked_by && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Marked By
                  </Label>
                  <p className="text-xs sm:text-sm mt-1">
                    {selectedHoliday.marked_by?.first_name}{" "}
                    {selectedHoliday.marked_by?.last_name}
                  </p>
                </div>
              )}

              {selectedHoliday.marked_at && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-slate-700">
                    Marked At
                  </Label>
                  <p className="text-xs sm:text-sm mt-1">
                    {format(
                      new Date(selectedHoliday.marked_at),
                      "MMM dd, yyyy 'at' HH:mm"
                    )}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
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

      <Dialog open={showLegendDialog} onOpenChange={setShowLegendDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Booking Status Legend
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              {
                status: "booking_request",
                label: "Booking Request",
                description: "Booking requested, awaiting approval",
                color: "#fef3c7",
                border: "#f59e0b",
              },
              {
                status: "booking_accepted",
                label: "Booking Accepted",
                description: "Booking approved by bay owner",
                color: "#d1fae5",
                border: "#10b981",
              },
              {
                status: "booking_rejected",
                label: "Booking Rejected",
                description: "Booking declined by bay owner",
                color: "#fee2e2",
                border: "#ef4444",
              },
              {
                status: "work_in_progress",
                label: "Work In Progress",
                description: "Work has started on vehicle",
                color: "#dbeafe",
                border: "#3b82f6",
              },
              {
                status: "work_review",
                label: "Work Review",
                description: "Work completed, under review",
                color: "#e9d5ff",
                border: "#a855f7",
              },
              {
                status: "completed_jobs",
                label: "Completed Jobs",
                description: "Work completed successfully",
                color: "#f1f5f9",
                border: "#64748b",
              },
              {
                status: "rework",
                label: "Rework",
                description: "Vehicle needs rework",
                color: "#fed7aa",
                border: "#ea580c",
              },
              {
                status: "holiday",
                label: "Holiday",
                description: "Bay closed for holiday",
                color: "#fecaca",
                border: "#dc2626",
              },
            ].map((item) => (
              <div
                key={item.status}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div
                  className="w-5 h-5 rounded border-2 mt-0.5 flex-shrink-0 shadow-sm"
                  style={{
                    backgroundColor: item.color,
                    borderColor: item.border,
                  }}
                ></div>
                <div className="flex-1">
                  <p className="font-semibold text-sm capitalize text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const getStatusColor = (status: string, isBackground = false) => {
  const colors: Record<string, string> = {
    booking_request: isBackground ? "#fef3c7" : "#f59e0b",
    booking_accepted: isBackground ? "#d1fae5" : "#10b981",
    booking_rejected: isBackground ? "#fee2e2" : "#ef4444",
    work_in_progress: isBackground ? "#dbeafe" : "#3b82f6",
    work_review: isBackground ? "#e9d5ff" : "#a855f7",
    completed_jobs: isBackground ? "#f1f5f9" : "#64748b",
    rework: isBackground ? "#fed7aa" : "#ea580c",
    holiday: isBackground ? "#fecaca" : "#dc2626",
    Holiday: isBackground ? "#f5deb3" : "#d4a574",
    Past: isBackground ? "#d4a574" : "#b8935f",
  };

  return colors[status] || (isBackground ? "#f3f4f6" : "#6b7280");
};

export default BayBookingCalendar;
