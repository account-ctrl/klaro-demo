
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
import type { User as Official } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ROLES, SystemRole } from '@/lib/config/roles'; // Import ROLES for label lookup

export type OfficialFormValues = Omit<Official, 'userId'>

type OfficialFormProps = {
  record?: Official;
  onSave: (data: OfficialFormValues | Official) => void;
  onClose: () => void;
  positions: string[];
  committees: string[];
  systemRoles: string[];
};

function OfficialForm({ record, onSave, onClose, positions, committees, systemRoles }: OfficialFormProps) {
  const [formData, setFormData] = useState<OfficialFormValues>({
    fullName: record?.fullName ?? '',
    email: record?.email ?? '',
    password_hash: '', // Always clear password on open
    position: record?.position ?? '',
    committee: record?.committee ?? '',
    systemRole: record?.systemRole ?? 'staff', // Default to staff if undefined
    termStart: record?.termStart ?? '',
    termEnd: record?.termEnd ?? '',
    digitalSignatureUrl: record?.digitalSignatureUrl ?? '',
    residentId: record?.residentId ?? '',
    status: record?.status ?? 'Active',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: 'position' | 'committee' | 'systemRole' | 'status', value: string) => {
    const isKagawad = id === 'position' && value === 'Sangguniang Barangay Member (Barangay Kagawad)';
    setFormData((prev) => ({ 
        ...prev, 
        [id]: value,
        // Reset committee if position is not Kagawad
        committee: isKagawad ? prev.committee : ''
    }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password_hash && !record) {
        alert('Password is required for new officials.');
        return;
    }
    if (record) {
      onSave({ ...record, ...formData });
    } else {
      onSave(formData);
    }
  };
  
  const showCommitteeField = formData.position === 'Sangguniang Barangay Member (Barangay Kagawad)';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <ScrollArea className="h-[60vh] p-4">
            <div className="space-y-6">
                {/* Account Details */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-primary">Account Details</h4>
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" value={formData.fullName} onChange={handleChange} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="password_hash">Password</Label>
                        <Input id="password_hash" type="password" value={formData.password_hash} onChange={handleChange} placeholder={record ? "Leave blank to keep unchanged" : "Set initial password"} />
                    </div>
                </div>

                 {/* Role & Position */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-primary">Role & Position</h4>
                    <div className="space-y-2">
                        <Label htmlFor="position">Official Position</Label>
                        <Select onValueChange={(value) => handleSelectChange('position', value)} value={formData.position} required>
                            <SelectTrigger id="position"><SelectValue placeholder="Select official title" /></SelectTrigger>
                            <SelectContent>
                                {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {showCommitteeField && (
                        <div className="space-y-2">
                            <Label htmlFor="committee">Committee Chairmanship</Label>
                            <Select onValueChange={(value) => handleSelectChange('committee', value)} value={formData.committee}>
                                <SelectTrigger id="committee"><SelectValue placeholder="Select committee" /></SelectTrigger>
                                <SelectContent>
                                     <SelectItem value="">None</SelectItem>
                                    {committees.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="systemRole">System Role (Permissions)</Label>
                            <Select onValueChange={(value) => handleSelectChange('systemRole', value as Official['systemRole'])} value={formData.systemRole} required>
                                <SelectTrigger id="systemRole"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {systemRoles.map(r => {
                                        // Look up the readable label from ROLES config
                                        // If 'r' is not a valid key (legacy data), show it as-is
                                        const roleConfig = ROLES[r as SystemRole];
                                        const label = roleConfig ? roleConfig.label : r;
                                        return (
                                            <SelectItem key={r} value={r}>{label}</SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="status">Account Status</Label>
                            <Select onValueChange={(value) => handleSelectChange('status', value as Official['status'])} value={formData.status}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Term & Other Details */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-primary">Term &amp; Other Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="termStart">Term Start Date</Label>
                            <Input id="termStart" type="date" value={formData.termStart} onChange={handleChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="termEnd">Term End Date</Label>
                            <Input id="termEnd" type="date" value={formData.termEnd} onChange={handleChange} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="digitalSignatureUrl">Digital Signature URL (Optional)</Label>
                        <Input id="digitalSignatureUrl" value={formData.digitalSignatureUrl} onChange={handleChange} placeholder="https://..." />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="residentId">Link to Resident Profile (Optional)</Label>
                        <Input id="residentId" value={formData.residentId} onChange={handleChange} placeholder="Enter Resident ID" />
                    </div>
                </div>
            </div>
        </ScrollArea>
      
      <DialogFooter className="border-t pt-4">
        <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Official</Button>
      </DialogFooter>
    </form>
  );
}


export function AddOfficial({ onAdd, positions, committees, systemRoles }: { onAdd: (data: OfficialFormValues) => void; positions: string[]; committees: string[]; systemRoles: string[]; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: OfficialFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Official/Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Official / Staff</DialogTitle>
          <DialogDescription>
            Create a new user account with a specific role and permission level.
          </DialogDescription>
        </DialogHeader>
        <OfficialForm onSave={handleSave} onClose={() => setOpen(false)} positions={positions} committees={committees} systemRoles={systemRoles}/>
      </DialogContent>
    </Dialog>
  );
}

export function EditOfficial({
  record,
  onEdit,
  positions,
  committees,
  systemRoles
}: {
  record: Official;
  onEdit: (record: Official) => void;
  positions: string[];
  committees: string[];
  systemRoles: string[];
}) {
  const [open, setOpen] = useState(false);

  const handleSave = (updatedRecord: Official) => {
    onEdit(updatedRecord);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePen className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Official Details</DialogTitle>
          <DialogDescription>
            Update the details for {record.fullName}. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <OfficialForm record={record} onSave={handleSave} onClose={() => setOpen(false)} positions={positions} committees={committees} systemRoles={systemRoles}/>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteOfficial({
  recordId,
  recordName,
  onDelete,
}: {
  recordId: string;
  recordName: string;
  onDelete: (id: string, name: string) => void;
}) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently remove the user account for <span className="font-semibold">{recordName}</span> from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(recordId, recordName)} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
