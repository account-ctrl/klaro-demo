
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
import type { Resident, Household } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResidentActivity } from './resident-activity';

export type ResidentFormValues = Omit<Resident, 'residentId'>;

// Extended type to include Firestore document ID
type ResidentWithId = Resident & { id?: string };

type ResidentFormProps = {
  record?: ResidentWithId;
  onSave: (data: ResidentFormValues | ResidentWithId) => void;
  onClose: () => void;
  households: Household[];
};

const defaultResidentData: ResidentFormValues = {
    firstName: "Juana",
    lastName: "Dela Cruz",
    dateOfBirth: "1990-05-15",
    gender: "Female",
    address: "123 Rizal St, Purok 2, Quezon City",
    status: "Active",
    middleName: "Santos",
    civilStatus: "Married",
    nationality: "Filipino",
    isVoter: true,
    is4ps: false,
    isPwd: false,
    occupation: "Home Maker",
    contactNumber: "09171234567",
    email: "resident@demo.com",
    householdId: "HH-1719602400000"
};

function ResidentForm({ record, onSave, onClose, households }: ResidentFormProps) {
  const [formData, setFormData] = useState<ResidentFormValues>(
    record ?? defaultResidentData
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (id: 'isVoter' | 'is4ps' | 'isPwd', checked: boolean) => {
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };
  
  const handleSelectChange = (id: 'status' | 'gender' | 'civilStatus' | 'householdId', value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
        ...formData,
        householdId: formData.householdId === 'NO_HOUSEHOLD' ? undefined : formData.householdId,
    };
    if (record) {
      onSave({ ...record, ...dataToSave });
    } else {
      onSave(dataToSave);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ScrollArea className="h-[60vh] p-4">
        <div className="space-y-6">
          {/* Personal Identity */}
          <div className="space-y-4">
              <h4 className="font-semibold text-primary">Personal Identity</h4>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input id="middleName" value={formData.middleName} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="suffix">Suffix</Label>
                      <Input id="suffix" value={formData.suffix} onChange={handleChange} placeholder="e.g., Jr., III" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select onValueChange={(value) => handleSelectChange('gender', value)} value={formData.gender}>
                          <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="civilStatus">Civil Status</Label>
                      <Select onValueChange={(value) => handleSelectChange('civilStatus', value as any)} value={formData.civilStatus}>
                          <SelectTrigger id="civilStatus"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                              <SelectItem value="Separated">Separated</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input id="nationality" value={formData.nationality} onChange={handleChange} />
                  </div>
              </div>
               <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" value={formData.occupation} onChange={handleChange} />
              </div>
          </div>
          
          {/* Residency & Location */}
          <div className="space-y-4">
              <h4 className="font-semibold text-primary">Residency & Location</h4>
              <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Textarea id="address" value={formData.address} onChange={handleChange} placeholder="House No., Street, Purok, City, Province..."/>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="householdId">Household</Label>
                   <Select onValueChange={(value) => handleSelectChange('householdId', value)} value={formData.householdId}>
                        <SelectTrigger id="householdId">
                            <SelectValue placeholder="Assign to a household" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NO_HOUSEHOLD">None</SelectItem>
                            {households.map(hh => (
                                <SelectItem key={hh.householdId} value={hh.householdId}>
                                    {hh.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
              </div>
          </div>

          {/* Social Status */}
          <div className="space-y-4">
              <h4 className="font-semibold text-primary">Government & Social Status</h4>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label>Registered Voter?</Label>
                  <p className="text-xs text-muted-foreground">Is the resident a registered voter in this barangay?</p>
                </div>
                <Switch id="isVoter" checked={formData.isVoter} onCheckedChange={(checked) => handleSwitchChange('isVoter', checked)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label>4Ps Beneficiary?</Label>
                   <p className="text-xs text-muted-foreground">Is the resident a beneficiary of the 4Ps program?</p>
                </div>
                <Switch id="is4ps" checked={formData.is4ps} onCheckedChange={(checked) => handleSwitchChange('is4ps', checked)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label>PWD?</Label>
                   <p className="text-xs text-muted-foreground">Is the resident a Person with Disability?</p>
                </div>
                <Switch id="isPwd" checked={formData.isPwd} onCheckedChange={(checked) => handleSwitchChange('isPwd', checked)} />
              </div>
          </div>

           {/* Contact & Status */}
          <div className="space-y-4">
              <h4 className="font-semibold text-primary">Contact & System Status</h4>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" value={formData.contactNumber} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" value={formData.email} onChange={handleChange} />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="status">Resident Status</Label>
                  <Select onValueChange={(value) => handleSelectChange('status', value)} value={formData.status}>
                      <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Moved Out">Moved Out</SelectItem>
                          <SelectItem value="Deceased">Deceased</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>
        </div>
      </ScrollArea>
      <DialogFooter>
        <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Resident</Button>
      </DialogFooter>
    </form>
  );
}


export function AddResident({ onAdd, households }: { onAdd: (data: ResidentFormValues) => void, households: Household[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: ResidentFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#409656] text-white hover:bg-[#409656]/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Resident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Resident</DialogTitle>
          <DialogDescription>
            Fill in the details of the new resident. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <ResidentForm onSave={handleSave} onClose={() => setOpen(false)} households={households} />
      </DialogContent>
    </Dialog>
  );
}

export function EditResident({
  record,
  onEdit,
  households,
  children,
}: {
  record: ResidentWithId;
  onEdit: (data: ResidentWithId) => void;
  households: Household[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: ResidentWithId) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Resident Details</DialogTitle>
          <DialogDescription>
            Update the details for {record.firstName} {record.lastName}.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <ResidentForm
              record={record}
              onSave={handleSave}
              onClose={() => setOpen(false)}
              households={households}
            />
          </TabsContent>
          <TabsContent value="activity">
            <ResidentActivity residentId={record.residentId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteResident({
  recordId,
  onDelete,
  children,
}: {
  recordId: string;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const handleDelete = () => {
    onDelete(recordId);
    toast({
      variant: 'destructive',
      title: 'Resident Deleted',
      description: "The resident's record has been permanently deleted.",
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            resident record from Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
