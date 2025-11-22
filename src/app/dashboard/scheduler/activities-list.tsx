
'use client';
import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { ScheduleEvent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { List, Calendar, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditEvent } from './event-actions';
import { useToast } from '@/hooks/use-toast';


const BARANGAY_ID = 'barangay_san_isidro';

const categoryColors: { [key in ScheduleEvent['category']]: string } = {
    'Blotter': 'bg-red-100 text-red-800 border-red-200',
    'Health': 'bg-green-100 text-green-800 border-green-200',
    'Session': 'bg-violet-100 text-violet-800 border-violet-200',
    'Rental': 'bg-orange-100 text-orange-800 border-orange-200',
    'Public': 'bg-blue-100 text-blue-800 border-blue-200',
};

export function ActivitiesList() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [sortBy, setSortBy] = useState<'date' | 'category'>('date');
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

    const eventsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        const baseRef = collection(firestore, `/barangays/${BARANGAY_ID}/schedule_events`);
        if (sortBy === 'date') {
            return query(baseRef, orderBy('start', 'asc'));
        }
        return query(baseRef, orderBy('category', 'asc'), orderBy('start', 'asc'));
    }, [firestore, sortBy]);

    const { data: scheduleEvents, isLoading } = useCollection<ScheduleEvent>(eventsCollectionRef);

    const handleEditClick = (event: ScheduleEvent) => {
        setSelectedEvent(event);
        setEditModalOpen(true);
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

    const groupedEvents = useMemo(() => {
        if (!scheduleEvents) return {};
        if (sortBy === 'date') {
             return scheduleEvents.reduce((acc, event) => {
                const dateKey = format(new Date(event.start), 'MMMM d, yyyy');
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(event);
                return acc;
            }, {} as Record<string, ScheduleEvent[]>);
        } else { // Sort by category
            return scheduleEvents.reduce((acc, event) => {
                const categoryKey = event.category;
                if (!acc[categoryKey]) {
                    acc[categoryKey] = [];
                }
                acc[categoryKey].push(event);
                return acc;
            }, {} as Record<string, ScheduleEvent[]>);
        }
    }, [scheduleEvents, sortBy]);

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <Button variant={sortBy === 'date' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('date')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Sort by Date
                </Button>
                <Button variant={sortBy === 'category' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('category')}>
                    <List className="mr-2 h-4 w-4" />
                    Sort by Category
                </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
                <div className="space-y-6">
                    {isLoading && [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    {!isLoading && Object.keys(groupedEvents).length === 0 && (
                        <div className="text-center text-muted-foreground pt-16">
                            <p>No upcoming activities scheduled.</p>
                        </div>
                    )}
                    {!isLoading && Object.entries(groupedEvents).map(([groupTitle, events]) => (
                        <div key={groupTitle}>
                            <h4 className="font-semibold text-sm text-muted-foreground mb-2">{groupTitle}</h4>
                            <div className="space-y-2">
                                {events.map(event => (
                                    <div key={event.eventId} className="p-3 border rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{event.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${categoryColors[event.category]} font-medium`}>{event.category}</Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => handleEditClick(event)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edit</span>
                                                    </DropdownMenuItem>
                                                     <DropdownMenuItem onSelect={() => handleDeleteEvent(event.eventId)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {isEditModalOpen && selectedEvent && (
                <EditEvent
                    isOpen={isEditModalOpen}
                    onClose={() => { setEditModalOpen(false); setSelectedEvent(null); }}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    record={selectedEvent}
                />
            )}
        </div>
    );
}
