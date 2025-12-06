
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
        {/* Removed redundant top button as it's now in the agenda card header */}
        
        {/* Changed layout to grid-cols-[auto_1fr] to shrink the calendar column */}
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start h-[600px]">
            <div className="flex justify-center md:justify-start h-full">
               <BookingCalendar bookings={bookings} onDateSelect={setSelectedDate} />
            </div>
            <div className="h-full">
                <UpcomingBookings 
                    bookings={bookings} 
                    selectedDate={selectedDate} 
                    onEdit={handleEditBooking}
                    onDelete={onDelete}
                    onAdd={() => onBook()} // Pass the open booking modal function
                />
            </div>
        </div>
    </div>
  );
}
