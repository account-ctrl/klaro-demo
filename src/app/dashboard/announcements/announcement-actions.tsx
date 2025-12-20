
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
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
import { PlusCircle, FilePen, Trash2, Wand2, Eye, Calendar, MapPin, User, Phone, Link as LinkIcon } from 'lucide-react';
import { Announcement } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export type AnnouncementFormValues = Omit<Announcement, 'announcementId' | 'datePosted' | 'postedByUserId'>;

type AnnouncementFormProps = {
  record?: Announcement;
  onSave: (data: AnnouncementFormValues | Announcement) => void;
  onClose: () => void;
};

const categories: Announcement['category'][] = ['General Info', 'Event', 'Health', 'Ordinance', 'Emergency'];

export const ANNOUNCEMENT_TEMPLATES = [
    { label: 'Medical Mission', title: 'Free Medical Mission', category: 'Health', content: 'We will be conducting a free medical, dental, and optical mission at the Barangay Hall on [Date] from 8:00 AM to 5:00 PM. Services include free check-ups and medicine distribution.' },
    { label: 'Clean-up Drive', title: 'Barangay Clean-up Drive', category: 'Event', content: 'Join us for a community clean-up drive this Saturday, [Date], starting at 6:00 AM. Assembly area at the Covered Court. Please bring your own broom and dustpan. Together, let\'s keep our barangay clean!' },
    { label: 'Typhoon Advisory', title: 'Typhoon Warning Advisory', category: 'Emergency', content: 'PAGASA has raised a warning signal in our area. Please secure your homes, prepare emergency kits, and stay tuned for further updates. Evacuation centers are open at the Elementary School and Covered Court.' },
    { label: 'General Assembly', title: 'Barangay General Assembly', category: 'General Info', content: 'Notice is hereby given for the Barangay General Assembly to be held on [Date] at [Time]. Agenda includes: State of Barangay Address, Financial Report, and Open Forum. Your attendance is highly encouraged.' },
    { label: 'Curfew Reminder', title: 'Reminder: Curfew Hours', category: 'Ordinance', content: 'This is a reminder that the curfew for minors (17 years old and below) is strictly enforced from 10:00 PM to 4:00 AM daily. Parents are advised to ensure their children are home by 10:00 PM.' },
] as const;

function AnnouncementForm({ record, onSave, onClose }: AnnouncementFormProps) {
  const [formData, setFormData] = useState<AnnouncementFormValues>({
    title: record?.title ?? '',
    content: record?.content ?? '',
    imageUrl: record?.imageUrl ?? '',
    category: record?.category ?? 'General Info',
    eventDate: record?.eventDate ?? '',
    eventTime: record?.eventTime ?? '',
    eventLocation: record?.eventLocation ?? '',
    contactPerson: record?.contactPerson ?? '',
    contactNumber: record?.contactNumber ?? '',
    registrationLink: record?.registrationLink ?? '',
  });
  
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (value: Announcement['category']) => {
    setFormData((prev) => ({ ...prev, category: value }));
  }

  const handleTemplateSelect = (value: string) => {
      const template = ANNOUNCEMENT_TEMPLATES.find(t => t.label === value);
      if (template) {
          setFormData(prev => ({
              ...prev,
              title: template.title,
              category: template.category as Announcement['category'],
              content: template.content
          }));
      }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
        alert("Title is required.");
        return;
    }
     if (!formData.content && !formData.imageUrl) {
        alert("Please provide either content or an image URL.");
        return;
    }

    if (record) {
      onSave({ ...record, ...formData });
    } else {
      onSave(formData);
    }
  };

  if (showPreview) {
      return (
          <div className="flex flex-col h-full bg-muted/20">
              <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
                  <div className="w-full max-w-sm">
                      <Label className="text-muted-foreground mb-2 block text-center">Mobile Preview</Label>
                      <Card className="w-full shadow-lg border-2 border-primary/20 overflow-hidden">
                          {formData.imageUrl && (
                              <div className="w-full h-48 bg-muted relative">
                                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                          )}
                          <CardHeader className="pb-2">
                              <div className="flex justify-between items-start mb-2">
                                  <Badge variant={formData.category === 'Emergency' ? 'destructive' : 'secondary'}>{formData.category}</Badge>
                                  <span className="text-xs text-muted-foreground">Just now</span>
                              </div>
                              <CardTitle className="text-lg leading-tight">{formData.title || 'Untitled Announcement'}</CardTitle>
                          </CardHeader>
                          <Separator />
                          <CardContent className="pt-4 text-sm text-foreground/80 whitespace-pre-wrap">
                              {formData.content || 'No content provided.'}
                              
                              {/* Event Details Section in Preview */}
                              {(formData.eventDate || formData.eventTime || formData.eventLocation) && (
                                  <div className="mt-4 p-3 bg-muted/50 rounded-md space-y-2">
                                      <h4 className="font-semibold text-xs uppercase text-muted-foreground">Event Details</h4>
                                      {formData.eventDate && (
                                          <div className="flex items-center gap-2 text-xs">
                                              <Calendar className="h-3 w-3" />
                                              <span>{formData.eventDate} {formData.eventTime && `at ${formData.eventTime}`}</span>
                                          </div>
                                      )}
                                      {formData.eventLocation && (
                                          <div className="flex items-center gap-2 text-xs">
                                              <MapPin className="h-3 w-3" />
                                              <span>{formData.eventLocation}</span>
                                          </div>
                                      )}
                                  </div>
                              )}

                              {/* Contact & Links Section in Preview */}
                              {(formData.contactPerson || formData.contactNumber || formData.registrationLink) && (
                                  <div className="mt-3 space-y-2">
                                       {(formData.contactPerson || formData.contactNumber) && (
                                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                               <User className="h-3 w-3" />
                                               <span>Contact: {formData.contactPerson} {formData.contactNumber && `(${formData.contactNumber})`}</span>
                                           </div>
                                       )}
                                       {formData.registrationLink && (
                                           <div className="pt-2">
                                               <Button size="sm" className="w-full h-8 text-xs" variant="outline">
                                                   Register Now
                                               </Button>
                                           </div>
                                       )}
                                  </div>
                              )}
                          </CardContent>
                          <CardFooter className="bg-muted/50 py-2">
                              <p className="text-xs text-center w-full text-muted-foreground">Barangay Official • Official Announcement</p>
                          </CardFooter>
                      </Card>
                  </div>
              </div>
              <div className="border-t p-4 bg-background">
                  <Button variant="outline" className="w-full" onClick={() => setShowPreview(false)}>Back to Editing</Button>
              </div>
          </div>
      )
  }

  return (
    <form id="announcement-form" onSubmit={handleSubmit} className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-1">
        <div className="space-y-6 p-4">
            {!record && (
                <div className="space-y-2 bg-muted/50 p-3 rounded-md border border-dashed">
                    <Label className="flex items-center gap-2 text-primary"><Wand2 className="h-4 w-4"/> Use a Template</Label>
                    <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a template to auto-fill..." />
                    </SelectTrigger>
                    <SelectContent>
                        {ANNOUNCEMENT_TEMPLATES.map(t => (
                        <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" value={formData.title} onChange={handleChange} required placeholder="Enter announcement headline"/>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select onValueChange={handleSelectChange} value={formData.category}>
                    <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date (Optional)</Label>
                    <Input id="eventDate" type="date" value={formData.eventDate} onChange={handleChange} />
                </div>
            </div>

            {/* Event Specific Fields */}
            {(formData.category === 'Event' || formData.category === 'Health' || formData.eventDate) && (
                <div className="p-4 bg-blue-50/50 rounded-md space-y-4 border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2"><Calendar className="h-4 w-4"/> Event Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="eventTime" className="text-xs">Time</Label>
                            <Input id="eventTime" type="time" value={formData.eventTime} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="eventLocation" className="text-xs">Location</Label>
                            <Input id="eventLocation" value={formData.eventLocation} onChange={handleChange} placeholder="e.g. Barangay Hall" />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" value={formData.content} onChange={handleChange} rows={8} placeholder="Write the announcement details here..." className="resize-none" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <div className="relative">
                    <Input id="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://example.com/image.png" className={formData.imageUrl ? 'pr-8' : ''} />
                    {formData.imageUrl && (
                        <div className="absolute right-3 top-3">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                    )}
                </div>
            </div>

            {/* Contact & Registration (Optional) */}
            <div className="space-y-4 pt-2 border-t">
                <Label className="text-muted-foreground">Additional Information (Optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="contactPerson" className="text-xs">Contact Person</Label>
                        <Input id="contactPerson" value={formData.contactPerson} onChange={handleChange} placeholder="Name" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactNumber" className="text-xs">Contact Number</Label>
                        <Input id="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="09..." />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="registrationLink" className="text-xs">Registration Link</Label>
                    <div className="relative">
                        <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="registrationLink" className="pl-9" value={formData.registrationLink} onChange={handleChange} placeholder="https://forms.google.com/..." />
                    </div>
                </div>
            </div>
        </div>
      </ScrollArea>
      
       <div className="border-t pt-4 p-4 mt-auto">
        <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowPreview(true)}>
                <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <div className="flex gap-2">
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit" form="announcement-form">Save Announcement</Button>
            </div>
        </div>
      </div>
    </form>
  );
}

function CheckCircle(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  }


export function AddAnnouncement({ onAdd }: { onAdd: (data: AnnouncementFormValues) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: AnnouncementFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg w-full p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Create New Announcement</SheetTitle>
          <SheetDescription>
            Compose a new announcement to be published.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] mt-0">
            <AnnouncementForm onSave={handleSave} onClose={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function EditAnnouncement({ record, onEdit }: { record: Announcement; onEdit: (data: Announcement) => void; }) {
  const [open, setOpen] = useState(false);
  
  const handleSave = (data: Announcement) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
         <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
            <FilePen className="mr-2 h-4 w-4" />
            <span>Edit</span>
        </div>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg w-full p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Edit Announcement</SheetTitle>
          <SheetDescription>
            Update the details for "{record.title}".
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] mt-0">
            <AnnouncementForm record={record} onSave={handleSave} onClose={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DeleteAnnouncement({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
         <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-destructive/10 focus:text-destructive w-full">
          <Trash2 className="mr-2 h-4 w-4" />
           <span>Delete</span>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the announcement from public view.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(recordId)} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
