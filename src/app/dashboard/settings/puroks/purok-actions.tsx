
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
import { PlusCircle, FilePen, Trash2 } from 'lucide-react';
import type { Purok, User as Official } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';

export type PurokFormValues = Omit<Purok, 'purokId' | 'createdAt'>;

type PurokFormProps = {
  record?: Purok;
  onSave: (data: PurokFormValues | Purok) => void;
  onClose: () => void;
  officials: Official[];
};

function PurokForm({ record, onSave, onClose, officials }: PurokFormProps) {
  const [formData, setFormData] = useState<PurokFormValues>({
    name: record?.name ?? '',
    district: record?.district ?? '',
    description: record?.description ?? '',
    purokLeaderId: record?.purokLeaderId ?? '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: 'purokLeaderId', value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (record) {
      onSave({ ...record, ...formData });
    } else {
      onSave(formData);
    }
  };

  const officialOptions = officials.map(o => ({
    value: o.userId,
    label: o.fullName
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="name">Purok / Sitio / Street Name</Label>
                <Input id="name" value={formData.name} onChange={handleChange} placeholder="e.g., Purok 1" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="district">District (Optional)</Label>
                <Input id="district" value={formData.district} onChange={handleChange} placeholder="e.g., District 1" />
            </div>
        </div>
         <div className="space-y-2">
            <Label htmlFor="purokLeaderId">Assigned Leader (Kagawad)</Label>
            <Combobox
                options={officialOptions}
                value={formData.purokLeaderId || ''}
                onChange={(value) => handleSelectChange('purokLeaderId', value)}
                placeholder="Select an official..."
                searchPlaceholder="Search official..."
              />
        </div>
         <div className="space-y-2">
            <Label htmlFor="description">Description / Boundaries</Label>
            <Textarea id="description" value={formData.description} onChange={handleChange} placeholder="e.g., Bounded by Rizal St. to the North..." />
        </div>
      
      <DialogFooter>
        <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Purok</Button>
      </DialogFooter>
    </form>
  );
}


export function AddPurok({ onAdd, officials }: { onAdd: (data: PurokFormValues) => void; officials: Official[]; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: PurokFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Purok
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Purok</DialogTitle>
          <DialogDescription>
            Define a new geographic zone for your barangay. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <PurokForm onSave={handleSave} onClose={() => setOpen(false)} officials={officials} />
      </DialogContent>
    </Dialog>
  );
}

export function EditPurok({ record, onEdit, officials }: { record: Purok; onEdit: (data: Purok) => void; officials: Official[]; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: Purok) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button variant="outline" size="sm" className="w-full justify-start">
            <FilePen className="mr-2 h-4 w-4" />
            Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Purok Details</DialogTitle>
          <DialogDescription>
            Update the details for {record.name}.
          </DialogDescription>
        </DialogHeader>
        <PurokForm record={record} onSave={handleSave} onClose={() => setOpen(false)} officials={officials} />
      </DialogContent>
    </Dialog>
  );
}

export function DeletePurok({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
   const { toast } = useToast();
   const handleDelete = () => {
        onDelete(recordId);
   }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full justify-start">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the purok record. Make sure no households are assigned to this purok before deleting.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
