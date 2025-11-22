
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { CalendarView } from "./calendar";
import { ActivitiesList } from "./activities-list";
  
export default function SchedulerPage() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Unified Scheduler</h1>
          <p className="text-muted-foreground">
            Manage all barangay events, hearings, meetings, and facility bookings in one place.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
            <Card className="col-span-1 lg:col-span-1">
                <CardContent className="p-4 h-full">
                    <CalendarView />
                </CardContent>
            </Card>
            <Card className="col-span-1 lg:col-span-1">
                <CardHeader>
                    <CardTitle>Upcoming Activities</CardTitle>
                    <CardDescription>A sortable list of all scheduled events.</CardDescription>
                </CardHeader>
                <CardContent>
                   <ActivitiesList />
                </CardContent>
            </Card>
        </div>
      </div>
    );
}
