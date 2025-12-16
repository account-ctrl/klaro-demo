
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, FilePen, Trash2, Printer } from 'lucide-react';
import type { Pet, Resident, Household } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { createRoot } from 'react-dom/client';
import { PetIDCard } from '@/components/id-cards/PetIDCard';

export type PetFormValues = Omit<Pet, 'petId' | 'createdAt'>;

type PetFormProps = {
  record?: Pet;
  onSave: (data: PetFormValues | Pet) => void;
  onClose: () => void;
  residents: Resident[];
  households: Household[];
};

function PetForm({ record, onSave, onClose, residents, households }: PetFormProps) {
  const [formData, setFormData] = useState<PetFormValues>({
    ownerResidentId: record?.ownerResidentId ?? '',
    householdId: record?.householdId ?? '',
    name: record?.name ?? '',
    species: record?.species ?? 'Dog',
    breed: record?.breed ?? '',
    colorMarkings: record?.colorMarkings ?? '',
    gender: record?.gender ?? 'Male',
    dateOfBirth: record?.dateOfBirth ?? '',
    photoUrl: record?.photoUrl ?? '',
    tagNumber: record?.tagNumber ?? '',
    microchipNumber: record?.microchipNumber ?? '',
    isNeutered: record?.isNeutered ?? false,
    behaviorStatus: record?.behaviorStatus ?? 'Friendly / Docile',
    status: record?.status ?? 'Active',
  });

  useEffect(() => {
    if (formData.ownerResidentId) {
        const owner = residents.find(r => r.residentId === formData.ownerResidentId);
        if(owner) {
            // Priority 1: Check if resident record has linked household
            if (owner.householdId) {
                 setFormData(prev => ({...prev, householdId: owner.householdId || ''}));
            } 
            // Priority 2: Check if resident is HEAD of any household (fallback for legacy data)
            else {
                const householdAsHead = households.find(h => h.household_head_id === formData.ownerResidentId);
                if (householdAsHead) {
                     setFormData(prev => ({...prev, householdId: householdAsHead.householdId}));
                } else {
                    setFormData(prev => ({...prev, householdId: ''}));
                }
            }
        }
    }
  }, [formData.ownerResidentId, residents, households]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: 'gender' | 'behaviorStatus' | 'status' | 'ownerResidentId', value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  const handleRadioChange = (id: 'species', value: 'Dog' | 'Cat' | 'Other') => {
      setFormData(prev => ({...prev, [id]: value }));
  }

  const handleSwitchChange = (id: 'isNeutered', checked: boolean) => {
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };
  
  const handlePrint = () => {
    if (!record) return;
    const owner = residents.find(r => r.residentId === record.ownerResidentId);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    // Write the basic HTML structure
    printWindow.document.write('<html><head><title>Pet ID Card</title></head><body><div id="print-root"></div></body></html>');
    printWindow.document.close();

    // Render the React component into the new window
    const printRoot = printWindow.document.getElementById('print-root');
    if (printRoot) {
        const root = createRoot(printRoot);
        root.render(
            <PetIDCard 
                pet={{
                    name: record.name,
                    species: record.species,
                    breed: record.breed,
                    photoUrl: record.photoUrl,
                    tagNumber: record.tagNumber,
                    colorMarkings: record.colorMarkings
                }}
                owner={owner ? {
                    firstName: owner.firstName,
                    lastName: owner.lastName,
                    address: owner.address,
                    contactNumber: owner.contactNumber
                } : undefined}
            />
        );
        
        // Wait for images to load (heuristic) or just wait a bit before print
        setTimeout(() => {
            printWindow.print();
            // Optional: printWindow.close();
        }, 500);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (record) {
      onSave({ ...record, ...formData });
    } else {
      onSave(formData);
    }
  };
  
  const residentOptions = residents.map(r => ({ label: `${r.firstName} ${r.lastName}`, value: r.residentId }));
  const householdName = households.find(h => h.householdId === formData.householdId)?.name;

  return (
    <form id="pet-form" onSubmit={handleSubmit} className="flex flex-col h-full">
        
            
            {/* Owner Info */}
            <ScrollArea className="flex-1 p-1">
            <div className="space-y-6 p-4">
            <div className="space-y-4 p-4 border rounded-md">
                <h4 className="font-semibold text-primary">Owner Information</h4>
                <div className="space-y-2">
                    <Label htmlFor="ownerResidentId">Owner Name</Label>
                    <Combobox options={residentOptions} value={formData.ownerResidentId} onChange={(val) => handleSelectChange('ownerResidentId', val)} placeholder="Search for a resident..."/>
                </div>
                 <div className="space-y-2">
                    <Label>Household (Auto-filled)</Label>
                    <Input value={householdName || (formData.ownerResidentId ? 'Household not found' : 'Select an owner')} disabled />
                </div>
            </div>

            {/* Pet Identity */}
            <div className="space-y-4 p-4 border rounded-md">
                <h4 className="font-semibold text-primary">Animal Identification</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Pet Name</Label>
                        <Input id="name" value={formData.name} onChange={handleChange} required />
                    </div>
                     <div className="space-y-2">
                        <Label>Species</Label>
                         <RadioGroup onValueChange={(val: 'Dog' | 'Cat' | 'Other') => handleRadioChange('species', val)} value={formData.species} className="flex gap-4 pt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Dog" id="dog" /><Label htmlFor="dog">Dog</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Cat" id="cat" /><Label htmlFor="cat">Cat</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Other" id="other" /><Label htmlFor="other">Other</Label></div>
                        </RadioGroup>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="breed">Breed</Label>
                        <Input id="breed" value={formData.breed || ''} onChange={handleChange} placeholder="e.g., Aspin, Persian" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="colorMarkings">Color / Markings</Label>
                        <Input id="colorMarkings" value={formData.colorMarkings || ''} onChange={handleChange} placeholder="e.g., Brown with white spots" />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select onValueChange={(val) => handleSelectChange('gender', val)} value={formData.gender}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Birthdate (Approx.)</Label>
                        <Input id="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={handleChange} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="photoUrl">Pet Photo URL</Label>
                    <Input id="photoUrl" value={formData.photoUrl || ''} onChange={handleChange} placeholder="https://..." />
                </div>
            </div>

            {/* Health & Safety */}
             <div className="space-y-4 p-4 border rounded-md">
                <h4 className="font-semibold text-primary">Health & Safety</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tagNumber">Registration / Tag Number</Label>
                        <Input id="tagNumber" value={formData.tagNumber || ''} onChange={handleChange} placeholder="Auto-generated upon save" readOnly={!record} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="behaviorStatus">Behavioral Note</Label>
                        <Select onValueChange={(val) => handleSelectChange('behaviorStatus', val)} value={formData.behaviorStatus}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Friendly / Docile">Friendly / Docile</SelectItem>
                                <SelectItem value="Territorial / Guard Dog">Territorial / Guard Dog</SelectItem>
                                <SelectItem value="History of Biting (Aggressive)">History of Biting (Aggressive)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                    <Label>Spayed / Neutered?</Label>
                    <p className="text-xs text-muted-foreground">Is the pet unable to reproduce?</p>
                    </div>
                    <Switch id="isNeutered" checked={formData.isNeutered} onCheckedChange={(checked) => handleSwitchChange('isNeutered', checked)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="status">Pet Status</Label>
                     <Select onValueChange={(val) => handleSelectChange('status', val)} value={formData.status}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Active">Active</SelectItem>
                           <SelectItem value="Deceased">Deceased</SelectItem>
                           <SelectItem value="Lost">Lost</SelectItem>
                           <SelectItem value="Transferred">Transferred</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
             </div>
             </div>
             </ScrollArea>
      <div className="border-t pt-4 mt-auto p-4">
        <div className="flex justify-end gap-2 items-center">
        {record && (
            <Button type="button" variant="secondary" onClick={handlePrint} className="mr-auto">
                <Printer className="mr-2 h-4 w-4" />
                Print ID Card
            </Button>
        )}
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit" form="pet-form">Save Pet</Button>
        </div>
      </div>
    </form>
  );
}


export function AddPet({ onAdd, residents, households }: { onAdd: (data: PetFormValues) => void; residents: Resident[], households: Household[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: PetFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Register Pet
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Register New Pet</SheetTitle>
          <SheetDescription>
            Fill in the details for the new pet. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] mt-0">
            <PetForm onSave={handleSave} onClose={() => setOpen(false)} residents={residents} households={households}/>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function EditPet({
  record,
  onEdit,
  residents,
  households
}: {
  record: Pet;
  onEdit: (record: Pet) => void;
  residents: Resident[];
  households: Household[];
}) {
  const [open, setOpen] = useState(false);

  const handleSave = (updatedRecord: Pet) => {
    onEdit(updatedRecord);
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
      <SheetContent className="sm:max-w-md w-full p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Edit Pet Profile</SheetTitle>
          <SheetDescription>
            Update the details for {record.name}.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] mt-0">
            <PetForm
            record={record}
            onSave={handleSave}
            onClose={() => setOpen(false)}
            residents={residents}
            households={households}
            />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DeletePet({
  recordId,
  onDelete,
}: {
  recordId: string;
  onDelete: (id: string) => void;
}) {
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
            This action cannot be undone. This will permanently delete this pet record from Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(recordId)}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
