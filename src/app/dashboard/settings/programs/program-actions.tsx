
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Program } from '@/lib/types';

export type ProgramFormValues = Omit<Program, 'programId'>;

type ProgramFormProps = {
  record?: Program;
  onSave: (data: ProgramFormValues | Program) => void;
  onClose: () => void;
};

const categories = ["General Administration", "Social Services", "Economic Services", "Other Services"];

function ProgramForm({ record, onSave, onClose }: ProgramFormProps) {
  const [formData, setFormData] = useState<ProgramFormValues>({
    name: record?.name ?? '',
    description: record?.description ?? '',
    category: record?.category ?? 'General Administration',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value as Program['category'] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (record) {
      onSave({ ...record, ...formData });
    } else {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Program/Project/Activity Name</Label>
        <Input id="name" value={formData.name} onChange={handleChange} placeholder="e.g., Office Supplies Procurement" required />
      </div>
       <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={handleSelectChange} value={formData.category}>
            <SelectTrigger id="category"><SelectValue /></SelectTrigger>
            <SelectContent>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description ?? ''} onChange={handleChange} placeholder="A short description of the PPA." />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save PPA</Button>
      </DialogFooter>
    </form>
  );
}

export function AddProgram({ onAdd }: { onAdd: (data: ProgramFormValues) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: ProgramFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Program/PPA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Program/PPA</DialogTitle>
          <DialogDescription>
            Define a new budget item for obligations.
          </DialogDescription>
        </DialogHeader>
        <ProgramForm onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditProgram({ record, onEdit }: { record: Program; onEdit: (data: Program) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: Program) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <FilePen className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Program/PPA</DialogTitle>
          <DialogDescription>
            Update the details for "{record.name}".
          </DialogDescription>
        </DialogHeader>
        <ProgramForm record={record} onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteProgram({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the PPA.
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
