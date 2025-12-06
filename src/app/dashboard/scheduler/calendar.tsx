
'use client';
import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ScheduleEvent } from '@/lib/types';
import { EditEvent } from './event-actions';
import { useToast } from '@/hooks/use-toast';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';

const BARANGAY_ID = 'barangay_san_isidro';

const categoryColors = {
    'Blotter': '#ef4444', // red-500
    'Hearing': '#ef4444',
    'Health': '#22c55e', // green-500
    'Session': '#3b82f6', // blue-500 (Updated to match AgendaCard)
    'Rental': '#a855f7', // purple-500
    'Facility': '#a855f7',
    'Public': '#22c55e', // green-500
    'Event': '#22c55e'
};

interface CalendarViewProps {
    events: ScheduleEvent[];
    onDateSelect: (date: Date) => void;
}

export function CalendarView({ events, onDateSelect }: CalendarViewProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

    const calendarEvents = useMemo(() => {
        return events.map(event => ({
            id: event.eventId,
            title: event.title,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            backgroundColor: categoryColors[event.category as keyof typeof categoryColors] || '#71717a', 
            borderColor: categoryColors[event.category as keyof typeof categoryColors] || '#71717a',
            extendedProps: event,
        }));
    }, [events]);

    const handleDateSelect = (selectInfo: DateSelectArg) => {
        // Update parent state to show agenda for this date
        onDateSelect(selectInfo.start);
    };

    const handleDateClick = (arg: { date: Date, dateStr: string }) => {
         onDateSelect(arg.date);
    }

    const handleEventClick = (clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as ScheduleEvent;
        setSelectedEvent(eventData);
        setEditModalOpen(true);
        // Also update the right panel context
        if (clickInfo.event.start) {
            onDateSelect(clickInfo.event.start);
        }
    };

    const handleEditEvent = (data: ScheduleEvent) => {
        if (!firestore || !data.eventId) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/schedule_events/${data.eventId}`);
        const { eventId, ...dataToUpdate } = data;
        updateDocumentNonBlocking(docRef, dataToUpdate);
        toast({ title: "Event Updated", description: `"${data.title}" has been updated.`});
        setEditModalOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/schedule_events/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: 'destructive', title: "Event Deleted" });
        setEditModalOpen(false);
    };

    return (
        <div className="h-full w-full">
            <style jsx global>{`
                .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 600; }
                .fc-button-primary { 
                    background-color: hsl(var(--primary)) !important; 
                    border-color: hsl(var(--primary)) !important; 
                    color: hsl(var(--primary-foreground)) !important;
                }
                .fc-button-primary:hover {
                    background-color: hsl(var(--primary) / 0.9) !important;
                    border-color: hsl(var(--primary) / 0.9) !important;
                }
                .fc-button-primary:disabled {
                    opacity: 0.5;
                }
                .fc-daygrid-event { border-radius: 4px; padding: 1px 4px; font-size: 0.85em; border: none !important;}
            `}</style>
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                }}
                initialView="dayGridMonth"
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                events={calendarEvents}
                select={handleDateSelect}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                height="100%"
            />

            {isEditModalOpen && selectedEvent && (
                <EditEvent
                    isOpen={isEditModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    record={selectedEvent}
                />
            )}
        </div>
    );
}
