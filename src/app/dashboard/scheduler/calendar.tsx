
'use client';
import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { ScheduleEvent } from '@/lib/types';
import { AddEvent, EditEvent, EventFormValues } from './event-actions';
import { useToast } from '@/hooks/use-toast';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';

const BARANGAY_ID = 'barangay_san_isidro';

const categoryColors = {
    'Blotter': '#ef4444', // red-500
    'Health': '#22c55e', // green-500
    'Session': '#8b5cf6', // violet-500
    'Rental': '#f97316', // orange-500
    'Public': '#3b82f6', // blue-500
};

export function CalendarView() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedDateInfo, setSelectedDateInfo] = useState<DateSelectArg | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
    
    const eventsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/schedule_events`);
    }, [firestore]);

    const { data: scheduleEvents, isLoading } = useCollection<ScheduleEvent>(eventsCollectionRef);

    const calendarEvents = useMemo(() => {
        if (!scheduleEvents) return [];
        return scheduleEvents.map(event => ({
            id: event.eventId,
            title: event.title,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            backgroundColor: categoryColors[event.category as keyof typeof categoryColors] || '#71717a', // default gray
            borderColor: categoryColors[event.category as keyof typeof categoryColors] || '#71717a',
            extendedProps: event,
        }));
    }, [scheduleEvents]);

    const handleDateSelect = (selectInfo: DateSelectArg) => {
        setSelectedDateInfo(selectInfo);
        setAddModalOpen(true);
    };

    const handleEventClick = (clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as ScheduleEvent;
        setSelectedEvent(eventData);
        setEditModalOpen(true);
    };

    const handleAddEvent = (data: EventFormValues) => {
        if (!eventsCollectionRef) return;
        
        const newEvent: Partial<ScheduleEvent> = {
            ...data,
            createdByUserId: 'system', // Replace with actual user ID
            status: 'Scheduled',
        };
        
        addDocumentNonBlocking(eventsCollectionRef, newEvent)
            .then(docRef => {
                if (docRef) updateDocumentNonBlocking(docRef, { eventId: docRef.id });
            });

        toast({ title: "Event Created", description: `"${data.title}" has been added to the calendar.`});
        setAddModalOpen(false);
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
        <div className="h-full w-full relative">
            {isLoading && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"><p>Loading events...</p></div>}
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                initialView="dayGridMonth"
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                events={calendarEvents}
                select={handleDateSelect}
                eventClick={handleEventClick}
                height="100%"
            />

            {isAddModalOpen && selectedDateInfo && (
                 <AddEvent 
                    isOpen={isAddModalOpen} 
                    onClose={() => setAddModalOpen(false)} 
                    onAdd={handleAddEvent}
                    dateInfo={selectedDateInfo}
                />
            )}

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
