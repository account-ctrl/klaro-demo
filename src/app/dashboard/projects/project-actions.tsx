
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
import { PlusCircle, FilePen, Trash2 } from 'lucide-react';
import type { Project, Purok } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mock data, in a real app this would come from props or a hook
const puroks: Pick<Purok, 'purokId' | 'name'>[] = [
    { purokId: 'purok-1', name: 'Purok 1' },
    { purokId: 'purok-2', name: 'Purok 2' },
    { purokId: 'purok-3', name: 'Purok 3' },
    { purokId: 'purok-4', name: 'Purok 4' },
];

const appropriationYears = [new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1];

export type ProjectFormValues = Omit<Project, 'projectId'>;

type ProjectFormProps = {
  record?: Project;
  onSave: (data: ProjectFormValues | Project) => void;
  onClose: () => void;
};

function ProjectForm({ record, onSave, onClose }: ProjectFormProps) {
  const [formData, setFormData] = useState<Omit<Project, 'projectId'>>({
    projectName: record?.projectName ?? '',
    description: record?.description ?? '',
    category: record?.category ?? 'Infrastructure',
    purokId: record?.purokId ?? '',
    specific_location: record?.specific_location ?? '',
    budget_amount: record?.budget_amount ?? 0,
    contract_amount: record?.contract_amount ?? 0,
    source_of_fund: record?.source_of_fund ?? '20% Barangay Development Fund (BDF)',
    appropriation_year: record?.appropriation_year ?? new Date().getFullYear(),
    sb_resolution_no: record?.sb_resolution_no ?? '',
    implementation_mode: record?.implementation_mode ?? 'By Administration',
    contractor_name: record?.contractor_name ?? '',
    procurement_status: record?.procurement_status ?? 'Pre-Procurement',
    target_start_date: record?.target_start_date ?? '',
    target_end_date: record?.target_end_date ?? '',
    actual_start_date: record?.actual_start_date ?? '',
    actual_end_date: record?.actual_end_date ?? '',
    status: record?.status ?? 'Planned',
    percentComplete: record?.percentComplete ?? 0,
    manager_user_id: record?.manager_user_id ?? '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ 
        ...prev, 
        [id]: type === 'number' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSelectChange = (id: keyof Omit<Project, 'projectId'>, value: string | number) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  const handleSliderChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, percentComplete: value[0] }));
  }

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
        <ScrollArea className="h-[70vh] p-4 border rounded-md">
            <div className="space-y-8">
                {/* Section 1: Project Identity & Location */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-primary">1. Project Identity & Location</h4>
                    <div className="space-y-2">
                        <Label htmlFor="projectName">Project Title</Label>
                        <Input id="projectName" value={formData.projectName} onChange={handleChange} placeholder='e.g., "Concreting of Pathway at Purok 3"' required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="category">Project Category / Sector</Label>
                        <Select onValueChange={(v) => handleSelectChange('category', v)} value={formData.category}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Infrastructure">Infrastructure (Roads, Buildings, Drainage)</SelectItem>
                                <SelectItem value="Social Services">Social Services (Health, Education, Housing)</SelectItem>
                                <SelectItem value="Economic Services">Economic Services (Livelihood, Agriculture)</SelectItem>
                                <SelectItem value="Environmental Management">Environmental Management (MRF, Cleaning)</SelectItem>
                                <SelectItem value="Disaster Risk Reduction">Disaster Risk Reduction (Flood Control, Equipment)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="purokId">Target Location</Label>
                            <Select onValueChange={(v) => handleSelectChange('purokId', v)} value={formData.purokId}>
                                <SelectTrigger><SelectValue placeholder="Select Purok" /></SelectTrigger>
                                <SelectContent>
                                    {puroks.map(p => <SelectItem key={p.purokId} value={p.purokId}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="specific_location">Specific Site</Label>
                            <Input id="specific_location" value={formData.specific_location} onChange={handleChange} placeholder='e.g., "Near the residence of Mr. Cruz"' />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Description / Objective</Label>
                        <Textarea id="description" value={formData.description} onChange={handleChange} placeholder="Describe the project's purpose and beneficiaries." />
                    </div>
                </div>

                {/* Section 2: Financials */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-primary">2. Financials & Funding</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="budget_amount">Approved Budget (ABC)</Label>
                            <Input id="budget_amount" type="number" value={formData.budget_amount} onChange={handleChange} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="source_of_fund">Source of Fund</Label>
                            <Select onValueChange={(v) => handleSelectChange('source_of_fund', v)} value={formData.source_of_fund}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="20% Barangay Development Fund (BDF)">20% Barangay Development Fund (BDF)</SelectItem>
                                    <SelectItem value="10% SK Fund">10% SK Fund</SelectItem>
                                    <SelectItem value="5% BDRRM Fund">5% BDRRM Fund</SelectItem>
                                    <SelectItem value="General Fund / MOOE">General Fund / MOOE</SelectItem>
                                    <SelectItem value="External Source">External Source (City, etc.)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="appropriation_year">Appropriation Year</Label>
                             <Select onValueChange={(v) => handleSelectChange('appropriation_year', parseInt(v))} value={String(formData.appropriation_year)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {appropriationYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sb_resolution_no">SB Resolution No.</Label>
                            <Input id="sb_resolution_no" value={formData.sb_resolution_no} onChange={handleChange} placeholder="Resolution authorizing the project" />
                        </div>
                    </div>
                </div>

                 {/* Section 3: Implementation */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-primary">3. Implementation & Procurement</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="implementation_mode">Mode of Implementation</Label>
                            <Select onValueChange={(v) => handleSelectChange('implementation_mode', v)} value={formData.implementation_mode}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="By Administration">By Administration</SelectItem>
                                    <SelectItem value="By Contract">By Contract (Bidding)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         {formData.implementation_mode === 'By Contract' && (
                             <div className="space-y-2">
                                <Label htmlFor="contractor_name">Contractor Name</Label>
                                <Input id="contractor_name" value={formData.contractor_name} onChange={handleChange} required={formData.implementation_mode === 'By Contract'} />
                            </div>
                         )}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="procurement_status">Procurement Status</Label>
                        <Select onValueChange={(v) => handleSelectChange('procurement_status', v)} value={formData.procurement_status}>
                            <SelectTrigger><SelectValue placeholder="Select procurement phase" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pre-Procurement">Pre-Procurement</SelectItem>
                                <SelectItem value="Posting/Advertising">Posting/Advertising</SelectItem>
                                <SelectItem value="Bid Evaluation">Bid Evaluation</SelectItem>
                                <SelectItem value="Awarded">Awarded</SelectItem>
                                <SelectItem value="Notice to Proceed Issued">Notice to Proceed Issued</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {/* Section 4: Timeline & Progress */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-primary">4. Timeline & Progress</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="target_start_date">Target Start Date</Label>
                            <Input id="target_start_date" type="date" value={formData.target_start_date} onChange={handleChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="target_end_date">Target Completion Date</Label>
                            <Input id="target_end_date" type="date" value={formData.target_end_date} onChange={handleChange} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Current Status</Label>
                             <Select onValueChange={(v) => handleSelectChange('status', v)} value={formData.status}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Planned">Planned / AIP Listed</SelectItem>
                                    <SelectItem value="Procurement">Procurement Phase</SelectItem>
                                    <SelectItem value="Ongoing">Ongoing Construction</SelectItem>
                                    <SelectItem value="Suspended">Suspended / On Hold</SelectItem>
                                    <SelectItem value="Completed">Completed (Physical)</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="percentComplete">Physical Completion ({formData.percentComplete}%)</Label>
                            <Slider id="percentComplete" min={0} max={100} step={5} value={[formData.percentComplete ?? 0]} onValueChange={handleSliderChange} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="actual_start_date">Actual Start Date</Label>
                            <Input id="actual_start_date" type="date" value={formData.actual_start_date} onChange={handleChange} disabled={formData.status !== 'Ongoing'} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="actual_end_date">Actual Completion Date</Label>
                            <Input id="actual_end_date" type="date" value={formData.actual_end_date} onChange={handleChange} />
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
      
      <DialogFooter className="border-t pt-4 mt-4">
        <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Project</Button>
      </DialogFooter>
    </form>
  );
}


export function AddProject({ onAdd }: { onAdd: (data: ProjectFormValues) => void }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: ProjectFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the details for the new barangay project. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditProject({ record, onEdit, useIcon = true }: { record: Project; onEdit: (data: Project) => void; useIcon?: boolean; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: Project) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {useIcon ? (
            <Button variant="outline" size="sm">
                <FilePen className="mr-2 h-4 w-4" />
                Edit
            </Button>
        ) : (
             <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                <FilePen className="mr-2 h-4 w-4" />
                <span>Edit</span>
            </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the details for project "{record.projectName}".
          </DialogDescription>
        </DialogHeader>
        <ProjectForm record={record} onSave={handleSave} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteProject({ recordId, onDelete, useIcon = true }: { recordId: string; onDelete: (id: string) => void; useIcon?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
         {useIcon ? (
            <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
         ) : (
            <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-destructive/10 focus:text-destructive w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
            </div>
         )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the project record from Firestore.
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
