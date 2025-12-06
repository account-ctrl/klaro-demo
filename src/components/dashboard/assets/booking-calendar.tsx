
"use client";

import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { isSameDay } from "date-fns";

export function BookingCalendar({ bookings, onDateSelect }: { bookings: any[], onDateSelect: (date: Date) => void }) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
        setDate(selectedDate);
        onDateSelect(selectedDate);
    }
  }

  // Identify days that have bookings
  const daysWithBookings = bookings.map(b => new Date(b.startDateTime));

  return (
    <div className="p-4 border rounded-md shadow-sm bg-white h-full">
        <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            className="w-full"
            classNames={{
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
            }}
            modifiers={{
                booked: daysWithBookings
            }}
            modifiersStyles={{
                booked: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                    textDecorationColor: "red", // Simple indicator for now
                    textUnderlineOffset: "4px"
                }
            }}
        />
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" /> Selected
            </div>
            <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Has Event
            </div>
        </div>
    </div>
  );
}
