
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
import { PlusCircle, FilePen, Trash2, X } from 'lucide-react';
import type { CertificateType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

export type DocumentTypeFormValues = Omit<CertificateType, 'certTypeId'>;

type DocumentTypeFormProps = {
  record?: CertificateType;
  onSave: (data: DocumentTypeFormValues | CertificateType) => void;
  onClose: () => void;
};

function DocumentTypeForm({ record, onSave, onClose }: DocumentTypeFormProps) {
  const [formData, setFormData] = useState<DocumentTypeFormValues>({
    name: record?.name ?? '',
    code: record?.code ?? '',
    fee: record?.fee ?? 0,
    validityInMonths: record?.validityInMonths ?? 12,
    requirements: record?.requirements ?? ['Valid ID'],
    exemptions: record?.exemptions ?? ['Indigent'],
    signatory: record?.signatory ?? 'Punong Barangay',
    templateId: record?.templateId ?? 'default_clearance',
  });
  const [newRequirement, setNewRequirement] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [id]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleAddRequirement = () => {
    if (newRequirement && !formData.requirements?.includes(newRequirement)) {
      setFormData(prev => ({
        ...prev,
        requirements: [...(prev.requirements || []), newRequirement]
      }));
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (req: string) => {
     setFormData(prev => ({
        ...prev,
        requirements: prev.requirements?.filter(r => r !== req)
      }));
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
    <form onSubmit={handleSubmit} className="space-y-6">
        <ScrollArea className="h-[60vh] p-4">
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Document Title</Label>
                    <Input id="name" value={formData.name} onChange={handleChange} placeholder="e.g., Barangay Clearance" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="code">Document Code</Label>
                    <Input id="code" value={formData.code} onChange={handleChange} placeholder="e.g., BC-2024" />
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fee">Base Fee (₱)</Label>
                    <Input id="fee" type="number" step="0.01" value={formData.fee} onChange={handleChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="validityInMonths">Validity (in Months)</Label>
                    <Input id="validityInMonths" type="number" value={formData.validityInMonths} onChange={handleChange} />
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="signatory">Signatory</Label>
                    <Input id="signatory" value={formData.signatory} onChange={handleChange} placeholder="e.g., Punong Barangay" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="templateId">Template ID</Label>
                    <Input id="templateId" value={formData.templateId} onChange={handleChange} placeholder="e.g., default_clearance_v2" />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label>Requirements</Label>
                <div className="space-y-2">
                    {formData.requirements?.map(req => (
                        <div key={req} className="flex items-center justify-between bg-muted p-2 rounded-md">
                            <span className="text-sm">{req}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveRequirement(req)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Input 
                        value={newRequirement}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        placeholder="Add a new requirement"
                    />
                    <Button type="button" onClick={handleAddRequirement}>Add</Button>
                </div>
            </div>
        </div>
        </ScrollArea>
      <DialogFooter>
        <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Document Type</Button>
      </DialogFooter>
    </form>
  );
}


export function AddDocumentType({ onAdd }: { onAdd: (data: DocumentTypeFormValues) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: DocumentTypeFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Document Type
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Document Type</DialogTitle>
          <DialogDescription>
            Define a new certificate or document that residents can request.
          </DialogDescription>
        </DialogHeader>
        <DocumentTypeForm onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditDocumentType({ record, onEdit }: { record: CertificateType; onEdit: (data: CertificateType) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: CertificateType) => {
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Document Type</DialogTitle>
          <DialogDescription>
            Update the details for "{record.name}".
          </DialogDescription>
        </DialogHeader>
        <DocumentTypeForm record={record} onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDocumentType({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
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
            This action cannot be undone. This will permanently delete the document type.
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
