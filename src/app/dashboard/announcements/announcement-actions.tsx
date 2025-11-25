
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
import { PlusCircle, FilePen, Trash2, Wand2 } from 'lucide-react';
import { Announcement } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

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
  });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={formData.title} onChange={handleChange} required />
      </div>
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
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" value={formData.content} onChange={handleChange} rows={5} placeholder="Write the announcement details here..." />
      </div>
       <div className="space-y-2">
        <Label htmlFor="imageUrl">Image URL (Optional)</Label>
        <Input id="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://example.com/image.png" />
      </div>
      
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Announcement</Button>
      </DialogFooter>
    </form>
  );
}


export function AddAnnouncement({ onAdd }: { onAdd: (data: AnnouncementFormValues) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: AnnouncementFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Announcement</DialogTitle>
          <DialogDescription>
            Compose a new announcement to be published.
          </DialogDescription>
        </DialogHeader>
        <AnnouncementForm onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditAnnouncement({ record, onEdit }: { record: Announcement; onEdit: (data: Announcement) => void; }) {
  const [open, setOpen] = useState(false);
  
  const handleSave = (data: Announcement) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
            <FilePen className="mr-2 h-4 w-4" />
            <span>Edit</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>
            Update the details for "{record.title}".
          </DialogDescription>
        </DialogHeader>
        <AnnouncementForm record={record} onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
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
