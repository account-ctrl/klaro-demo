
"use client";

import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export function BookingCalendar({ bookings, onDateSelect }: { bookings: any[], onDateSelect: (date: Date) => void }) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
        setDate(selectedDate);
        onDateSelect(selectedDate);
    }
  }

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={handleSelect}
      className="rounded-md border"
      // You can add logic here to highlight days with bookings
    />
  );
}
