
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface BookingScheduleProps {
  bookings: any[];
  onBook: () => void;
}

export function BookingSchedule({ bookings, onBook }: BookingScheduleProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onBook}>
          <Calendar className="mr-2 h-4 w-4" /> Book Asset
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings?.map((b) => (
              <TableRow key={b.bookingId}>
                <TableCell className="font-medium">{b.assetName}</TableCell>
                <TableCell>
                  {b.borrowerName}
                  <div className="text-xs text-muted-foreground">{b.purpose}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    {format(new Date(b.startDateTime), "MMM d, h:mm a")} - <br />
                    {format(new Date(b.endDateTime), "MMM d, h:mm a")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{b.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {bookings?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No active bookings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
