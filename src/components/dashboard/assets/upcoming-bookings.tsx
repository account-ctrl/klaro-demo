
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

export function UpcomingBookings({ 
    bookings, 
    selectedDate, 
    onEdit, 
    onDelete 
}: { 
    bookings: any[], 
    selectedDate: Date, 
    onEdit: (booking: any) => void, 
    onDelete: (bookingId: string) => void 
}) {
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.startDateTime);
    return (
      bookingDate.getDate() === selectedDate.getDate() &&
      bookingDate.getMonth() === selectedDate.getMonth() &&
      bookingDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings for {format(selectedDate, 'MMM d, yyyy')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <div key={booking.bookingId} className="flex items-center">
                <Avatar className="h-9 w-9 mr-4">
                    <AvatarImage src="/avatars/01.png" alt="Avatar" />
                    <AvatarFallback>{booking.borrowerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="text-sm font-medium leading-none">
                    {booking.assetName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                    {booking.borrowerName} - {booking.purpose}
                    </p>
                </div>
                <div className="text-right mr-2">
                    <p className="text-xs">
                    {format(new Date(booking.startDateTime), 'h:mm a')} - {format(new Date(booking.endDateTime), 'h:mm a')}
                    </p>
                    <Badge variant="outline">{booking.status}</Badge>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(booking)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(booking.bookingId)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No bookings for this date.</p>
        )}
      </CardContent>
    </Card>
  );
}
