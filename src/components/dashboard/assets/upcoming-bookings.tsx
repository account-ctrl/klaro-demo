
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { AgendaCard } from "./agenda-card";
import { AssetBooking } from "@/lib/types";

interface UpcomingBookingsProps {
  bookings: AssetBooking[];
  selectedDate: Date;
  onEdit: (booking: AssetBooking) => void;
  onDelete: (bookingId: string) => void;
  onAdd: () => void;
}

export function UpcomingBookings({ 
    bookings, 
    selectedDate, 
    onEdit, 
    onDelete,
    onAdd
}: UpcomingBookingsProps) {
  
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.startDateTime);
    return (
      bookingDate.getDate() === selectedDate.getDate() &&
      bookingDate.getMonth() === selectedDate.getMonth() &&
      bookingDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  return (
    <Card className="h-full border-none shadow-none md:border md:shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">
            Agenda for {format(selectedDate, 'MMM d, yyyy')}
        </CardTitle>
        <Button size="sm" onClick={onAdd} className="h-8 gap-1">
            <Plus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Event
            </span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {filteredBookings.length > 0 ? (
          <div className="space-y-3">
             {filteredBookings.map((booking) => (
                <AgendaCard 
                    key={booking.bookingId} 
                    booking={booking} 
                    onClick={() => onEdit(booking)}
                />
             ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 rounded-lg border-2 border-dashed bg-slate-50">
             <div className="p-3 bg-white rounded-full shadow-sm">
                <Plus className="h-6 w-6 text-slate-400" />
             </div>
             <div className="space-y-1">
                <h3 className="font-medium text-slate-900">Clear schedule ahead!</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                    No activities scheduled for this date. Use this time to plan maintenance or book a facility.
                </p>
             </div>
             <Button variant="outline" onClick={onAdd}>
                Schedule Activity
             </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
