
'use client';

import { useState, useEffect } from 'react';
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

export type PetFormValues = Omit<Pet, 'petId' | 'createdAt'>;

type PetFormProps = {
  record?: Pet;
  onSave: (data: PetFormValues | Pet) => void;
  onClose: () => void;
  residents: Resident[];
  households: Household[];
};

const generatePetIdHtml = (pet: Pet, owner?: Resident) => {
    // Basic styling for the ID card
    const css = `
        @media print {
            @page {
                size: 3.370in 2.125in; /* Standard CR80 ID card size */
                margin: 0;
            }
            body {
                -webkit-print-color-adjust: exact;
            }
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        .card-container {
            width: 3.370in;
            height: 2.125in;
            display: flex;
            flex-direction: column;
        }
        .card-face {
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            border: 1px solid #ccc;
            display: flex;
            flex-direction: column;
            background-color: white;
        }
        .header {
            background-color: #007bff;
            color: white;
            padding: 8px;
            text-align: center;
        }
        .header h3 { margin: 0; font-size: 14px; }
        .header p { margin: 0; font-size: 8px; }
        .content { display: flex; padding: 8px; gap: 8px; flex-grow: 1; }
        .photo { width: 1in; height: 1.2in; object-fit: cover; border: 1px solid #eee; }
        .info { font-size: 9px; flex-grow: 1; }
        .info p { margin: 2px 0; }
        .info .label { font-weight: bold; color: #555; }
        .back .title { font-size: 11px; font-weight: bold; margin: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;}
        .back .section { font-size: 8px; padding: 0 8px; margin-bottom: 8px; }
        .back .section p { margin: 2px 0; }
        .qr-code { width: 0.8in; height: 0.8in; background-color: #eee; margin: 0 auto; display: block; }
    `;

    // A simple placeholder for QR code
    const qrCodeSvg = `<svg viewBox="0 0 100 100" class="qr-code"><path fill="#333" d="M10,10 h20 v20 h-20z M40,10 h10 v10 h-10z M60,10 h30 v30 h-30z M10,40 h10 v10 h-10z M40,40 h30 v10 h-30z M10,60 h30 v30 h-30z M60,60 h10 v10 h-10z M80,80 h10 v10 h-10z"/></svg>`;
    
    // HTML for the card
    return `
        <html>
        <head><title>Pet ID - ${pet.name}</title><style>${css}</style></head>
        <body>
            <div class="card-container">
                <!-- Front Side -->
                <div class="card-face">
                    <div class="header">
                        <h3>BARANGAY PET REGISTRY</h3>
                        <p>Republic of the Philippines, Barangay San Isidro</p>
                    </div>
                    <div class="content">
                        <img src="${pet.photoUrl || 'https://picsum.photos/seed/pet/100/120'}" alt="Pet Photo" class="photo" />
                        <div class="info">
                            <p style="text-align: center; font-size: 16px; font-weight: bold; color: #0056b3; margin-bottom: 8px;">${pet.name}</p>
                            <p><span class="label">Owner:</span> ${owner?.firstName} ${owner?.lastName}</p>
                            <p><span class="label">Address:</span> ${owner?.address}</p>
                            <p><span class="label">Species:</span> ${pet.species}</p>
                            <p><span class="label">Breed:</span> ${pet.breed}</p>
                            <p><span class="label">Tag No:</span> ${pet.tagNumber || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <!-- Back Side -->
                <div class="card-face" style="page-break-before: always;">
                    <div class="back">
                        <div class="title">EMERGENCY INFORMATION</div>
                        <div class="section">
                            <p>If found, please contact the owner:</p>
                            <p style="font-weight: bold; font-size: 10px;">${owner?.contactNumber || 'N/A'}</p>
                            <p>Or call the Barangay Hall:</p>
                            <p style="font-weight: bold; font-size: 10px;">(02) 8123-4567</p>
                        </div>
                        <div class="title">VACCINATION RECORD</div>
                        <div class="section">
                            <p><span class="label">Anti-Rabies:</span> Next due on __________</p>
                            <p><span class="label">Deworming:</span> Next due on __________</p>
                        </div>
                         <div class="title">IMPORTANT</div>
                         <div class="section">
                            <p>This animal is registered under Barangay Ordinance No. 123, Series of 2024 (The Responsible Pet Ownership Ordinance). Abandonment or neglect is punishable by law.</p>
                        </div>
                        ${qrCodeSvg}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
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
        if(owner && owner.householdId) {
            setFormData(prev => ({...prev, householdId: owner.householdId}));
        }
    }
  }, [formData.ownerResidentId, residents]);

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
    const htmlContent = generatePetIdHtml(record, owner);
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(htmlContent);
    printWindow?.document.close();
    printWindow?.print();
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
    <>
    <ScrollArea className="h-[70vh] p-1">
    <form id="pet-form" onSubmit={handleSubmit} className="space-y-6 p-4">
        
            
            {/* Owner Info */}
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
      </form>
      </ScrollArea>
      <DialogFooter className="border-t pt-4">
        {record && (
            <Button type="button" variant="secondary" onClick={handlePrint} className="mr-auto">
                <Printer className="mr-2 h-4 w-4" />
                Print ID Card
            </Button>
        )}
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" form="pet-form">Save Pet</Button>
      </DialogFooter>
    </>
  );
}


export function AddPet({ onAdd, residents, households }: { onAdd: (data: PetFormValues) => void; residents: Resident[], households: Household[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: PetFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Register Pet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Register New Pet</DialogTitle>
          <DialogDescription>
            Fill in the details for the new pet. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <PetForm onSave={handleSave} onClose={() => setOpen(false)} residents={residents} households={households}/>
      </DialogContent>
    </Dialog>
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
            <FilePen className="mr-2 h-4 w-4" />
            <span>Edit</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Pet Profile</DialogTitle>
          <DialogDescription>
            Update the details for {record.name}.
          </DialogDescription>
        </DialogHeader>
        <PetForm
          record={record}
          onSave={handleSave}
          onClose={() => setOpen(false)}
          residents={residents}
          households={households}
        />
      </DialogContent>
    </Dialog>
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
