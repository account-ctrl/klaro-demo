'use client';

import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { ScheduleEvent } from '@/lib/types';
import { EventClickArg } from '@fullcalendar/core';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, AlignLeft } from "lucide-react";
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

const BARANGAY_ID = 'barangay_san_isidro';

const categoryColors = {
    'Blotter': '#ef4444', // red-500
    'Health': '#22c55e', // green-500
    'Session': '#8b5cf6', // violet-500
    'Rental': '#f97316', // orange-500
    'Public': '#3b82f6', // blue-500
};

export function CommunityCalendar() {
    const firestore = useFirestore();
    const [isEventModalOpen, setEventModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

    // Fetch Public Events (or events meant for residents)
    // You might want to filter this further based on 'privacy' or 'visibility' fields if you add them later.
    // For now, let's assume 'Public' category is for everyone, and maybe sessions/health are too.
    const eventsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/schedule_events`),
            // In a real app, you'd likely have a 'visibility' field like 'public' | 'internal'
             where('category', 'in', ['Public', 'Health', 'Session']) 
        );
    }, [firestore]);

    const { data: scheduleEvents, isLoading } = useCollection<ScheduleEvent>(eventsQuery);

    const calendarEvents = useMemo(() => {
        if (!scheduleEvents) return [];
        return scheduleEvents.map(event => ({
            id: event.eventId,
            title: event.title,
            start: event.start, // Ensure these are ISO strings or Date objects
            end: event.end,
            allDay: event.allDay,
            backgroundColor: categoryColors[event.category as keyof typeof categoryColors] || '#71717a',
            borderColor: categoryColors[event.category as keyof typeof categoryColors] || '#71717a',
            extendedProps: event,
        }));
    }, [scheduleEvents]);

    const handleEventClick = (clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as ScheduleEvent;
        setSelectedEvent(eventData);
        setEventModalOpen(true);
    };

    return (
        <Card className="h-full">
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" /> Community Calendar
                </CardTitle>
                <CardDescription>Upcoming public events and barangay activities.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
                 <div className="h-[500px] w-full relative calendar-wrapper">
                    {isLoading && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><p>Loading calendar...</p></div>}
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: 'prev,next',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek' // Simplified for mobile/resident view
                        }}
                        initialView="dayGridMonth"
                        editable={false} // Residents can't edit
                        selectable={false} // Residents can't create
                        selectMirror={true}
                        dayMaxEvents={true}
                        weekends={true}
                        events={calendarEvents}
                        eventClick={handleEventClick}
                        height="100%"
                        contentHeight="auto"
                        aspectRatio={1.5}
                    />
                </div>
            </CardContent>

            <Dialog open={isEventModalOpen} onOpenChange={setEventModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                             {selectedEvent?.title}
                             <Badge variant="outline" style={{ backgroundColor: categoryColors[selectedEvent?.category as keyof typeof categoryColors] + '20', color: categoryColors[selectedEvent?.category as keyof typeof categoryColors], borderColor: categoryColors[selectedEvent?.category as keyof typeof categoryColors] }}>
                                {selectedEvent?.category}
                             </Badge>
                        </DialogTitle>
                        <DialogDescription>Event Details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                         <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-medium">Date & Time</p>
                                <p className="text-sm text-muted-foreground">
                                    {selectedEvent?.start ? format(new Date(selectedEvent.start), 'PPP p') : 'TBD'} 
                                    {selectedEvent?.end ? ` - ${format(new Date(selectedEvent.end), 'p')}` : ''}
                                </p>
                            </div>
                        </div>
                        {selectedEvent?.location && (
                             <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">Location</p>
                                    <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                                </div>
                            </div>
                        )}
                         {selectedEvent?.description && (
                             <div className="flex items-start gap-3">
                                <AlignLeft className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">Description</p>
                                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
