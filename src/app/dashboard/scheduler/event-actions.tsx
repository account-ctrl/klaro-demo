
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { ScheduleEvent } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { DateSelectArg } from '@fullcalendar/core';
import { format, toDate } from 'date-fns';


export type EventFormValues = Omit<ScheduleEvent, 'eventId' | 'createdByUserId' | 'referenceId' | 'resourceId' | 'status'>;

type EventFormProps = {
  record?: ScheduleEvent;
  dateInfo?: DateSelectArg | null;
  onSave: (data: EventFormValues | ScheduleEvent) => void;
  onClose: () => void;
};

const categories: ScheduleEvent['category'][] = ['Blotter', 'Health', 'Session', 'Rental', 'Public'];

function EventForm({ record, dateInfo, onSave, onClose }: EventFormProps) {
  
  const getInitialDate = (dateStr: string | undefined, allDay: boolean) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const formatString = allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm";
    return format(date, formatString);
  };
  
  const [formData, setFormData] = useState({
    title: record?.title ?? '',
    category: record?.category ?? 'Public',
    description: record?.description ?? '',
    start: record?.start ?? dateInfo?.startStr ?? '',
    end: record?.end ?? dateInfo?.endStr ?? '',
    allDay: record?.allDay ?? dateInfo?.allDay ?? false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: 'category', value: ScheduleEvent['category']) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
   const handleSwitchChange = (id: 'allDay', checked: boolean) => {
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };
  
  const handleDateChange = (id: 'start' | 'end', value: string) => {
    const date = new Date(value);
    setFormData((prev) => ({ ...prev, [id]: date.toISOString() }));
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.start || !formData.end) {
        alert("Start and End dates are required.");
        return;
    }
    
    // Ensure dates are in ISO format before saving
    const finalData = { 
        ...formData,
        start: new Date(formData.start).toISOString(),
        end: new Date(formData.end).toISOString()
    };

    if (record) {
      onSave({ ...record, ...finalData });
    } else {
      onSave(finalData as EventFormValues);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ScrollArea className="max-h-[60vh] p-4">
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input id="title" value={formData.title} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(value) => handleSelectChange('category', value as any)} value={formData.category}>
                <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                    {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={handleChange} />
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="allDay" checked={formData.allDay} onCheckedChange={(checked) => handleSwitchChange('allDay', checked)} />
                <Label htmlFor="allDay">All-day event</Label>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="start">Start Time</Label>
                    <Input 
                      id="start" 
                      type={formData.allDay ? 'date' : 'datetime-local'} 
                      value={getInitialDate(formData.start, formData.allDay)}
                      onChange={(e) => handleDateChange('start', e.target.value)} 
                      required 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="end">End Time</Label>
                    <Input 
                      id="end" 
                      type={formData.allDay ? 'date' : 'datetime-local'} 
                      value={getInitialDate(formData.end, formData.allDay)}
                      onChange={(e) => handleDateChange('end', e.target.value)} 
                      required 
                    />
                </div>
            </div>
        </div>
      </ScrollArea>
      <DialogFooter className="border-t pt-4">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Event</Button>
      </DialogFooter>
    </form>
  );
}


export function AddEvent({ isOpen, onClose, onAdd, dateInfo }: { isOpen: boolean; onClose: () => void; onAdd: (data: EventFormValues) => void; dateInfo: DateSelectArg | null }) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
          <DialogDescription>
            Schedule a new event on the barangay calendar.
          </DialogDescription>
        </DialogHeader>
        <EventForm onSave={onAdd} onClose={onClose} dateInfo={dateInfo} />
      </DialogContent>
    </Dialog>
  );
}

export function EditEvent({ isOpen, onClose, onEdit, onDelete, record }: { isOpen: boolean; onClose: () => void; onEdit: (data: ScheduleEvent) => void; onDelete: (id: string) => void; record: ScheduleEvent; }) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the details for "{record.title}".
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
            <EventForm record={record} onSave={onEdit} onClose={onClose} />
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className="absolute bottom-5 left-5">
                        <Trash2 className="h-4 w-4"/>
                        <span className="sr-only">Delete</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this event from the calendar.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(record.eventId)} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
