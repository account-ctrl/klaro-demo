
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ScheduleEvent } from '@/lib/types';
import { CalendarView } from "./calendar";
import { ActivitiesList } from "./activities-list";
import { AddEvent, EventFormValues } from './event-actions';
import { useToast } from '@/hooks/use-toast';
import { DateSelectArg } from '@fullcalendar/core';

const BARANGAY_ID = 'barangay_san_isidro';

export default function SchedulerPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    
    // Fetch events here to share between components
    const eventsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/schedule_events`);
    }, [firestore]);

    const { data: scheduleEvents, isLoading } = useCollection<ScheduleEvent>(eventsCollectionRef);

    const safeEvents = scheduleEvents || [];

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
    };

    const handleAddEventTrigger = () => {
        setAddModalOpen(true);
    };

    const handleSaveEvent = (data: EventFormValues) => {
        if (!eventsCollectionRef) return;
        
        const newEvent: Partial<ScheduleEvent> = {
            ...data,
            createdByUserId: 'system',
            status: 'Scheduled',
            // Ensure start date matches the selected date context if not explicitly set? 
            // The form handles this via default values.
        };
        
        addDocumentNonBlocking(eventsCollectionRef, newEvent);
        toast({ title: "Event Created", description: `"${data.title}" has been scheduled.`});
        setAddModalOpen(false);
    };

    // Construct a DateSelectArg-like object for the AddEvent modal default values
    const dateInfoForModal: Partial<DateSelectArg> = {
        start: selectedDate,
        end: selectedDate, // Default to 1 hour or same day? Modal handles it.
        allDay: false
    };

    return (
      <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Unified Scheduler</h1>
          <p className="text-muted-foreground">
            Manage all barangay events, hearings, meetings, and facility bookings in one place.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            {/* Calendar Section - Takes up 2/3 space */}
            <div className="lg:col-span-2 h-full bg-white rounded-lg border shadow-sm overflow-hidden p-4">
                <CalendarView 
                    events={safeEvents} 
                    onDateSelect={handleDateSelect} 
                />
            </div>
            
            {/* Activities Panel - Takes up 1/3 space */}
            <div className="lg:col-span-1 h-full min-h-0">
                <ActivitiesList 
                    date={selectedDate} 
                    events={safeEvents} 
                    onAddEvent={handleAddEventTrigger} 
                />
            </div>
        </div>

        {/* Smart Creation Modal */}
        {isAddModalOpen && (
             <AddEvent 
                isOpen={isAddModalOpen} 
                onClose={() => setAddModalOpen(false)} 
                onAdd={handleSaveEvent}
                dateInfo={dateInfoForModal as DateSelectArg} 
            />
        )}
      </div>
    );
}
