
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { BookingCalendar } from "./booking-calendar";
import { UpcomingBookings } from "./upcoming-bookings";

interface CalendarViewProps {
  bookings: any[];
  onBook: (booking?: any) => void;
  onDelete: (bookingId: string) => void;
}

export function CalendarView({ bookings, onBook, onDelete }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleEditBooking = (booking: any) => {
    onBook(booking); // Open the booking sheet in edit mode
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => onBook()}>
              <Calendar className="mr-2 h-4 w-4" /> Book Asset
            </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
            <BookingCalendar bookings={bookings} onDateSelect={setSelectedDate} />
            <UpcomingBookings 
                bookings={bookings} 
                selectedDate={selectedDate} 
                onEdit={handleEditBooking}
                onDelete={onDelete}
            />
        </div>
    </div>
  );
}
