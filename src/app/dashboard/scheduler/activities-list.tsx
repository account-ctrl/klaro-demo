
"use client";

import { MapPin, Users, Clock, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isSameDay, addDays } from "date-fns";

// Assuming event type based on provided context, refining it for this view
interface SchedulerEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category: 'Hearing' | 'Session' | 'Event' | 'Facility' | 'Health' | 'Blotter' | 'Public';
  location?: string;
  attendees?: number;
}

interface ActivitiesListProps {
  date: Date | undefined;
  events: SchedulerEvent[];
  onAddEvent: () => void;
}

function AgendaCard({ event }: { event: SchedulerEvent }) {
  const categoryColors: Record<string, string> = {
    Hearing: "bg-red-100 text-red-700 border-red-200",
    Blotter: "bg-red-100 text-red-700 border-red-200",
    Session: "bg-blue-100 text-blue-700 border-blue-200",
    Event: "bg-green-100 text-green-700 border-green-200",
    Public: "bg-green-100 text-green-700 border-green-200",
    Facility: "bg-purple-100 text-purple-700 border-purple-200",
    Health: "bg-teal-100 text-teal-700 border-teal-200",
  };

  const colorClass = categoryColors[event.category] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <Card className={`flex flex-col gap-3 p-4 border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${colorClass.replace('bg-', 'border-l-')}`}>
      {/* Header: Time & Status */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
          <Clock className="w-4 h-4" />
          <span>
            {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
          </span>
        </div>
        <Badge variant="outline" className={`${colorClass} border`}>
          {event.category.toUpperCase()}
        </Badge>
      </div>

      {/* Title */}
      <div>
        <h4 className="font-bold text-slate-900 text-lg leading-tight">
          {event.title}
        </h4>
        {event.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
            {event.description}
          </p>
        )}
      </div>

      {/* Footer: Location & Attendees */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {event.location || "Barangay Hall"}
        </div>
        {event.attendees && (
            <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {event.attendees} Attendees
            </div>
        )}
      </div>
    </Card>
  );
}

export function ActivitiesList({ date, events, onAddEvent }: ActivitiesListProps) {
  const selectedDate = date || new Date();
  
  // Filter logic:
  // If a specific date is selected (clicked), show events for that date.
  // If no specific selection interaction (default), ideally show "Next 7 Days" but based on prop usually just current day or selected day.
  // We'll stick to strict day filtering for the "Agenda" feel.
  
  const filteredEvents = events.filter(event => 
    isSameDay(event.start, selectedDate)
  );

  return (
    <Card className="h-full border-none shadow-none md:border md:shadow-sm flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
            <CardTitle className="text-xl font-bold">
                Agenda
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
        </div>
        <Button size="sm" onClick={onAddEvent} className="h-9 gap-1 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Schedule Activity
            </span>
        </Button>
      </CardHeader>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredEvents.length > 0 ? (
          <div className="space-y-3">
            {filteredEvents.map(event => (
              <AgendaCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4 rounded-lg border-2 border-dashed bg-slate-50/50">
             <div className="p-4 bg-white rounded-full shadow-sm ring-1 ring-slate-100">
                <CalendarIcon className="h-8 w-8 text-slate-400" />
             </div>
             <div className="space-y-1 max-w-[250px]">
                <h3 className="font-semibold text-slate-900">Clear schedule ahead!</h3>
                <p className="text-sm text-slate-500">
                    Use this time to plan the next Session or book a facility for the community.
                </p>
             </div>
             <Button variant="outline" onClick={onAddEvent} className="mt-2">
                Plan an Event
             </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
