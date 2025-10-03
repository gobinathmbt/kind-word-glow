import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Pick a date & time",
  required = false,
  disabled = false,
}) => {
  const selectedDate = value ? new Date(value) : undefined;
  
  const [hour, setHour] = useState(() => {
    if (selectedDate) {
      let h = selectedDate.getHours();
      if (h === 0) return "12";
      if (h > 12) return (h - 12).toString();
      return h.toString();
    }
    return "12";
  });

  const [minute, setMinute] = useState(() => {
    if (selectedDate) {
      return selectedDate.getMinutes().toString().padStart(2, '0');
    }
    return "00";
  });

  const [ampm, setAmPm] = useState(() => {
    if (selectedDate) {
      return selectedDate.getHours() >= 12 ? "PM" : "AM";
    }
    return "AM";
  });

  const handleDateTimeChange = (date?: Date, h = hour, m = minute, a = ampm) => {
    if (!date) return;
    
    const updated = new Date(date);
    let hh = parseInt(h);
    if (a === "PM" && hh < 12) hh += 12;
    if (a === "AM" && hh === 12) hh = 0;
    
    updated.setHours(hh);
    updated.setMinutes(parseInt(m));
    updated.setSeconds(0);
    updated.setMilliseconds(0);
    
    onChange(updated.toISOString());
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !selectedDate && "text-muted-foreground",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate
              ? format(selectedDate, "PPP p") // e.g. Sep 24, 2025, 2:30 PM
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 space-y-3" align="start">
          {/* Date Picker */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              handleDateTimeChange(date);
            }}
            initialFocus
            className="rounded-md border"
          />

          {/* Time Picker (12-hour format with AM/PM) */}
          <div className="flex items-center space-x-2 p-3 border-t">
            <Clock className="h-4 w-4 text-muted-foreground" />

            {/* Hours */}
            <Select
              value={hour}
              onValueChange={(val) => {
                setHour(val);
                handleDateTimeChange(selectedDate, val, minute, ampm);
              }}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const h = (i + 1).toString();
                  return (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground">:</span>

            {/* Minutes */}
            <Select
              value={minute}
              onValueChange={(val) => {
                setMinute(val);
                handleDateTimeChange(selectedDate, hour, val, ampm);
              }}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["00", "15", "30", "45"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* AM/PM */}
            <Select
              value={ampm}
              onValueChange={(val) => {
                setAmPm(val);
                handleDateTimeChange(selectedDate, hour, minute, val);
              }}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateTimePicker;