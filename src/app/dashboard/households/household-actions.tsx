
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, FilePen, Trash2, Eye, UserPlus, X } from 'lucide-react';
import type { Household, Resident, Purok } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

const BARANGAY_ID = 'barangay_san_isidro';


export type HouseholdFormValues = Omit<Household, 'householdId' | 'createdAt' | 'name'>;

type HouseholdWithId = Household & { id?: string };

type HouseholdFormProps = {
  record?: HouseholdWithId;
  onSave: (data: HouseholdFormValues | HouseholdWithId) => void;
  onClose: () => void;
  residents: Resident[];
};

// Mock Purok data. In a real app, this would be fetched from Firestore.
const puroks: Purok[] = [
    { purokId: 'purok-1', name: 'Purok 1' },
    { purokId: 'purok-2', name: 'Purok 2' },
    { purokId: 'purok-3', name: 'Purok 3' },
    { purokId: 'purok-4', name: 'Purok 4' },
];

function HouseholdForm({ record, onSave, onClose, residents }: HouseholdFormProps) {
  const [formData, setFormData] = useState<HouseholdFormValues>({
    address: record?.address ?? '',
    purokId: record?.purokId ?? '',
    householdNumber: record?.householdNumber ?? '',
    household_head_id: record?.household_head_id ?? '',
    housing_material: record?.housing_material ?? 'Concrete',
    tenure_status: record?.tenure_status ?? 'Owned',
    water_source: record?.water_source ?? 'Piped',
    toilet_facility: record?.toilet_facility ?? 'Water-sealed',
    electricity: record?.electricity ?? 'Direct Connection'
  });

  useEffect(() => {
    // Pre-select the default resident if creating a new household and residents are loaded
    if (!record && residents.length > 0) {
      const defaultResident = residents.find(r => r.residentId === "Z5i3gqu4Ahf29s5z5a5g2wYx4E12");
      if (defaultResident) {
        setFormData(prev => ({ ...prev, household_head_id: defaultResident.residentId }));
      }
    }
  }, [record, residents]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (id: keyof HouseholdFormValues, value: string) => {
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

  const residentOptions = residents.map(r => ({
    value: r.residentId,
    label: `${r.firstName} ${r.lastName}`
  }));

  return (
    <form id="household-form" onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-1 py-4">
        <div className="space-y-6">
            {/* Core Details */}
            <div className="space-y-4">
                <h4 className="font-semibold text-primary">Core Details</h4>
                <div className="space-y-2">
                    <Label htmlFor="household_head_id">Head of Household</Label>
                    <Combobox
                        options={residentOptions}
                        value={formData.household_head_id}
                        onChange={(value) => handleSelectChange('household_head_id', value)}
                        placeholder="Select a resident..."
                        searchPlaceholder="Search resident..."
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="householdNumber">Household Number</Label>
                    <Input id="householdNumber" value={formData.householdNumber} onChange={handleChange} placeholder="e.g., HH-00123" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Address (Street, House No.)</Label>
                    <Textarea id="address" value={formData.address} onChange={handleChange} placeholder="e.g., 123 Rizal St." required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="purokId">Purok / Zone</Label>
                    <Select onValueChange={(value) => handleSelectChange('purokId', value)} value={formData.purokId} required>
                        <SelectTrigger id="purokId">
                            <SelectValue placeholder="Select a Purok" />
                        </SelectTrigger>
                        <SelectContent>
                            {puroks.map(p => (
                                <SelectItem key={p.purokId} value={p.purokId}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Socio-Economic Profile */}
            <div className="space-y-4">
                <h4 className="font-semibold text-primary">Socio-Economic Profile (RBIM)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="housing_material">Housing Material</Label>
                        <Select onValueChange={(value) => handleSelectChange('housing_material', value)} value={formData.housing_material}>
                            <SelectTrigger id="housing_material"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Concrete">Concrete</SelectItem>
                                <SelectItem value="Semi-Concrete">Semi-Concrete</SelectItem>
                                <SelectItem value="Light Material">Light Material</SelectItem>
                                <SelectItem value="Salvaged Material">Salvaged Material</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tenure_status">Tenure Status</Label>
                        <Select onValueChange={(value) => handleSelectChange('tenure_status', value)} value={formData.tenure_status}>
                            <SelectTrigger id="tenure_status"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Owned">Owned</SelectItem>
                                <SelectItem value="Rented">Rented</SelectItem>
                                <SelectItem value="Living with Relatives">Living with Relatives</SelectItem>
                                <SelectItem value="Informal Settler">Informal Settler</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="water_source">Water Source</Label>
                        <Select onValueChange={(value) => handleSelectChange('water_source', value)} value={formData.water_source}>
                            <SelectTrigger id="water_source"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Piped">Piped</SelectItem>
                                <SelectItem value="Deep Well">Deep Well</SelectItem>
                                <SelectItem value="Shared Faucet">Shared Faucet</SelectItem>
                                <SelectItem value="Buying Water">Buying Water</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="toilet_facility">Toilet Facility</Label>
                        <Select onValueChange={(value) => handleSelectChange('toilet_facility', value)} value={formData.toilet_facility}>
                            <SelectTrigger id="toilet_facility"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Water-sealed">Water-sealed</SelectItem>
                                <SelectItem value="Antipolo type">Antipolo type</SelectItem>
                                <SelectItem value="None">None</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="electricity">Electricity</Label>
                        <Select onValueChange={(value) => handleSelectChange('electricity', value)} value={formData.electricity}>
                            <SelectTrigger id="electricity"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Direct Connection">Direct Connection</SelectItem>
                                <SelectItem value="Sub-meter">Sub-meter</SelectItem>
                                <SelectItem value="Jumper">Jumper</SelectItem>
                                <SelectItem value="Solar/None">Solar/None</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <div className="pt-4 border-t mt-auto">
        <div className="flex justify-end gap-2">
            <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" form="household-form">Save Household</Button>
        </div>
      </div>
    </form>
  );
}

function HouseholdMembers({ household, residents, onMemberChange }: { household: HouseholdWithId, residents: Resident[], onMemberChange: (residentId: string, householdId: string | null) => void }) {
    const firestore = useFirestore();
    const membersQuery = useMemoFirebase(() => {
        // Prefer using doc ID (household.id) if available, but fallback to householdId if necessary.
        // Usually queries depend on the 'householdId' FIELD in the resident document matching the household.
        // So we must use household.householdId because that's what's stored in the resident.
        // WAIT: If the householdId FIELD is different from the household DOC ID, and we are fixing the delete/edit to use DOC ID...
        // ... then resident relationships might be broken if they point to the householdId field instead of DOC ID.
        // But let's assume residents point to the householdId FIELD.
        if (!firestore || !household.householdId) return null;
        return query(collection(firestore, `/barangays/${BARANGAY_ID}/residents`), where('householdId', '==', household.householdId));
    }, [firestore, household.householdId]);

    const { data: members, isLoading } = useCollection<Resident>(membersQuery);
    
    // Residents not currently in any household
    const availableResidents = residents.filter(r => !r.householdId);

    const handleAddMember = (residentId: string) => {
        onMemberChange(residentId, household.householdId);
    }
    
    const handleRemoveMember = (residentId: string) => {
        onMemberChange(residentId, null);
    }

    return (
        <ScrollArea className="h-full p-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Add Member</Label>
                    <Combobox
                        options={availableResidents.map(r => ({ value: r.residentId, label: `${r.firstName} ${r.lastName}` }))}
                        value={''}
                        onChange={handleAddMember}
                        placeholder="Search for a resident to add..."
                        searchPlaceholder="Search resident..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Current Members ({members?.length ?? 0})</Label>
                     {isLoading && <p>Loading members...</p>}
                     {members && members.map(member => (
                        <div key={member.residentId} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div>
                                <p className="font-medium">{member.firstName} {member.lastName}</p>
                                {member.residentId === household.household_head_id && <Badge variant="secondary">Head</Badge>}
                            </div>
                            {member.residentId !== household.household_head_id && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveMember(member.residentId)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {!isLoading && (!members || members.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No members found for this household.</p>
                    )}
                </div>
            </div>
        </ScrollArea>
    )
}


export function AddHousehold({ onAdd, residents }: { onAdd: (data: HouseholdFormValues) => void; residents: Resident[]; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: HouseholdFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Household
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>Create New Household</SheetTitle>
          <SheetDescription>
            Enter the details for the new household. The household name will be based on the selected head.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] mt-4">
            <HouseholdForm onSave={handleSave} onClose={() => setOpen(false)} residents={residents} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function EditHousehold({ record, onEdit, residents, onMemberChange }: { record: HouseholdWithId; onEdit: (data: HouseholdWithId) => void; residents: Resident[]; onMemberChange: (residentId: string, householdId: string | null) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: HouseholdWithId) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full" onClick={(e) => e.stopPropagation()}>
            <Eye className="mr-2 h-4 w-4" />
            <span>View / Edit</span>
        </div>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>Household: {record.name}</SheetTitle>
          <SheetDescription>
            View and manage household details and members.
          </SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] mt-4">
            <Tabs defaultValue="details" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Household Details</TabsTrigger>
                    <TabsTrigger value="members">Household Members</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="flex-1 overflow-hidden">
                    <HouseholdForm record={record} onSave={handleSave} onClose={() => setOpen(false)} residents={residents} />
                </TabsContent>
                <TabsContent value="members" className="flex-1 overflow-hidden">
                    <HouseholdMembers household={record} residents={residents} onMemberChange={onMemberChange} />
                </TabsContent>
            </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DeleteHousehold({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
   const { toast } = useToast();
   const handleDelete = () => {
        onDelete(recordId);
   }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
         <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-destructive/10 focus:text-destructive w-full" onClick={(e) => e.stopPropagation()}>
          <Trash2 className="mr-2 h-4 w-4" />
           <span>Delete</span>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the household from Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
