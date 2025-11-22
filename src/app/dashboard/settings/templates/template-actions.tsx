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
import { PlusCircle, FilePen, Trash2, Eye } from 'lucide-react';
import type { DocumentTemplate } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import CodeMirror from '@uiw/react-codemirror';
import { ScrollArea } from '@/components/ui/scroll-area';

const defaultTemplateContent = `<!DOCTYPE html>
<html>
<head>
    <title>{{ document.name }}</title>
    <style>
        body { font-family: sans-serif; margin: 2rem; }
        .header { text-align: center; }
        .content { margin-top: 2rem; }
        .footer { text-align: center; margin-top: 4rem; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ barangay.name }}</h1>
        <p>{{ barangay.address }}</p>
    </div>
    <div class="content">
        <h2>{{ document.name }}</h2>
        <p>This is to certify that {{ resident.firstName }} {{ resident.lastName }} is a resident of this barangay.</p>
        <p>Purpose: {{ request.purpose }}</p>
    </div>
    <div class="footer">
      <p>Issued on: {{ 'now' | date: 'long' }}</p>
    </div>
</body>
</html>`;


export type TemplateFormValues = Omit<DocumentTemplate, 'templateId' | 'createdAt' | 'updatedAt'>;

type TemplateFormProps = {
  record?: DocumentTemplate;
  onSave: (data: TemplateFormValues | DocumentTemplate) => void;
  onClose: () => void;
};

function TemplateForm({ record, onSave, onClose }: TemplateFormProps) {
  const [formData, setFormData] = useState<TemplateFormValues>({
    name: record?.name ?? '',
    description: record?.description ?? '',
    content: record?.content ?? defaultTemplateContent,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCodeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, content: value }));
  };

  const handlePreview = () => {
    const previewContent = formData.content
      .replace(/{{ document.name }}/g, 'Barangay Clearance')
      .replace(/{{ barangay.name }}/g, 'Barangay San Isidro')
      .replace(/{{ barangay.address }}/g, 'Quezon City, Metro Manila')
      .replace(/{{ resident.firstName }}/g, 'Juan')
      .replace(/{{ resident.lastName }}/g, 'Dela Cruz')
      .replace(/{{ request.purpose }}/g, 'For Local Employment')
      .replace(/{{ 'now' | date: 'long' }}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      
    const previewWindow = window.open('', '_blank');
    previewWindow?.document.write(previewContent);
    previewWindow?.document.close();
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
    <>
      <ScrollArea className="h-[65vh] p-1">
        <form id="template-form" onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input id="name" value={formData.name} onChange={handleChange} placeholder="e.g., Standard Barangay Clearance" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={handleChange} placeholder="A short description of what this template is for." />
            </div>
              <div className="space-y-2">
                <Label htmlFor="content">HTML Content</Label>
                <CodeMirror
                    value={formData.content}
                    height="400px"
                    onChange={handleCodeChange}
                    theme="light"
                    basicSetup={{
                        foldGutter: true,
                        dropCursor: true,
                        allowMultipleSelections: true,
                        indentOnInput: true,
                    }}
                />
            </div>
        </form>
      </ScrollArea>
      <DialogFooter className="pt-4 border-t">
        <Button type="button" variant="outline" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
        </Button>
        <div className="flex-grow" />
        <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" form="template-form">Save Template</Button>
      </DialogFooter>
    </>
  );
}


export function AddTemplate({ onAdd }: { onAdd: (data: TemplateFormValues) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: TemplateFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Add New Document Template</DialogTitle>
          <DialogDescription>
            Create a new HTML template for generating documents.
          </DialogDescription>
        </DialogHeader>
        <TemplateForm onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditTemplate({ record, onEdit }: { record: DocumentTemplate; onEdit: (data: DocumentTemplate) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: DocumentTemplate) => {
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
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the HTML content for "{record.name}".
          </DialogDescription>
        </DialogHeader>
        <TemplateForm record={record} onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTemplate({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
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
            This action cannot be undone. This will permanently delete the document template. Make sure no Document Types are using this template before deleting.
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
